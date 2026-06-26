// server/stripeWebhook.js
const Stripe = require("stripe");
const { supabaseAdmin } = require("./supabase");
const { getPlanKeyByStripePriceId } = require("./plansCatalog");
const { sendEmail, emailLayout } = require("./email");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim();

// Délai entre l'achat et la livraison du thème (effet "rédigé par une numérologue").
const DELIVERY_DELAY_MS = 7 * 60 * 60 * 1000; // 7 heures

function getSubPriceId(subscription) {
  const item = subscription?.items?.data?.[0];
  return item?.price?.id || null;
}

function toIsoFromUnixSeconds(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

async function updateProfileByCustomerId(customerId, patch) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update(patch)
    .eq("stripe_customer_id", customerId);

  if (error) throw error;
}

async function updateProfileByUserId(userId, patch) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (error) throw error;
}

/* ============================================================
   ONE-SHOT (mode: payment) — 1 paiement = 1 thème
   ============================================================ */

// Trouve un user auth par email (ou le crée, sans mot de passe).
async function findOrCreateUserByEmail(email, meta) {
  // 1) Tentative de création (cas le plus fréquent : nouveau client)
  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // email validé, pas de mot de passe défini
      user_metadata: meta || {},
    });

  if (!createErr && created?.user) {
    return { user: created.user, isNew: true };
  }

  // 2) L'utilisateur existe déjà -> on le retrouve (pagination bornée)
  const emailLc = (email || "").toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data: list, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) throw listErr;

    const found = (list?.users || []).find(
      (u) => (u.email || "").toLowerCase() === emailLc
    );
    if (found) return { user: found, isNew: false };

    if (!list?.users || list.users.length < 200) break; // dernière page
  }

  throw new Error(`USER_LOOKUP_FAILED for ${email}`);
}

// Email de confirmation d'achat (immédiat).
async function sendPurchaseConfirmation(email) {
  const html = emailLayout(
    "Merci pour votre commande",
    `<p style="line-height:1.6;">Votre <strong>thème numérologique personnalisé</strong> est en cours de préparation. Vous le recevrez par email et dans votre espace personnel <strong>d'ici quelques heures</strong>.</p>
     <p style="line-height:1.6;">Pensez à créer le mot de passe de votre compte (sur la page de confirmation après paiement) pour accéder à votre espace. Si besoin, vous pourrez aussi le faire via « Mot de passe oublié » sur la page de connexion.</p>
     <p style="line-height:1.6;"><a href="${FRONTEND_URL}/signin" style="color:#6f8f72;">Accéder à mon espace</a></p>`
  );
  await sendEmail({ to: email, subject: "Votre commande est confirmée — Clés Des Nombres", html });
}

async function handleOneShotPayment(session) {
  const meta = session?.metadata || {};
  const email =
    meta.email ||
    session?.customer_details?.email ||
    session?.customer_email ||
    null;

  if (!email) {
    console.error("ONESHOT_NO_EMAIL", { sessionId: session?.id });
    return;
  }

  const payload = {
    prenom: meta.prenom || "",
    secondPrenom: meta.secondPrenom || "",
    nomFamille: meta.nomFamille || "",
    nomMarital: meta.nomMarital || "",
    dateNaissance: meta.dateNaissance || "",
    lieuNaissance: meta.lieuNaissance || "",
    stripe_session_id: session.id,
  };

  const targetName = `${payload.prenom} ${payload.nomFamille}`.trim();

  // Le prospect est devenu client : on bascule le lead à "Yes" (best-effort).
  try {
    await supabaseAdmin
      .from("leads")
      .update({ client: "Yes" })
      .eq("stripe_session_id", session.id);
  } catch (leadErr) {
    console.error("LEAD_UPDATE_FAILED", leadErr);
  }

  // 1) Compte (créé sans mot de passe si nouveau)
  const { user, isNew } = await findOrCreateUserByEmail(email, {
    firstName: payload.prenom,
    lastName: payload.nomFamille,
  });
  const userId = user.id;

  // Profil garanti + plan oneshot + customer Stripe
  await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: userId,
        plan: "oneshot",
        first_name: payload.prenom || null,
        last_name: payload.nomFamille || null,
        stripe_customer_id: session.customer || null,
      },
      { onConflict: "id" }
    );

  // 2) Idempotence : si déjà traité pour cette session, on s'arrête
  const { data: existing } = await supabaseAdmin
    .from("generations")
    .select("id")
    .eq("user_id", userId)
    .filter("payload->>stripe_session_id", "eq", session.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log("ONESHOT_ALREADY_PROCESSED", { sessionId: session.id });
    return;
  }

  // 3) Ligne de génération programmée pour livraison dans ~7h.
  //    Le texte et le PDF seront générés au moment de la livraison (cron).
  const deliverAt = new Date(Date.now() + DELIVERY_DELAY_MS).toISOString();

  const { error: insErr } = await supabaseAdmin
    .from("generations")
    .insert({
      user_id: userId,
      type: "theme",
      label: targetName ? `Thème numérologique ${targetName}` : "Thème numérologique",
      payload,
      result_text: null,
      deliver_at: deliverAt,
      delivered: false,
    });

  if (insErr) {
    console.error("ONESHOT_GEN_INSERT_FAILED", insErr);
    return;
  }

  // 4) Email de confirmation immédiat (Resend). isNew non utilisé : la création
  //    du mot de passe se fait sur la page de confirmation ou via reset.
  void isNew;
  await sendPurchaseConfirmation(email);
}

/* ============================================================
   ABONNEMENT (legacy, conservé — mode: subscription)
   ============================================================ */
async function handleCheckoutSessionCompleted(session) {
  const userId = session?.metadata?.supabase_user_id || null;
  const customerId = session?.customer || null;
  const subscriptionId = session?.subscription || null;

  console.log("CHECKOUT COMPLETED (subscription):", { userId, customerId, subscriptionId });

  if (!userId || !customerId || !subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const priceId = getSubPriceId(subscription);
  const planKey = priceId ? getPlanKeyByStripePriceId(priceId) : null;

  if (!planKey) {
    throw new Error(`UNKNOWN_PRICE_ID: ${priceId}`);
  }

  const patch = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    subscription_status: subscription.status,

    quota_period_start: toIsoFromUnixSeconds(subscription.current_period_start),
    quota_period_end: toIsoFromUnixSeconds(subscription.current_period_end),
    current_period_end: toIsoFromUnixSeconds(subscription.current_period_end),

    plan: planKey,
  };

  await updateProfileByUserId(userId, patch);
}

async function handleSubscriptionUpdatedOrCreated(subscription) {
  const customerId = subscription?.customer || null;
  if (!customerId) return;

  const priceId = getSubPriceId(subscription);
  const planKey = priceId ? getPlanKeyByStripePriceId(priceId) : null;

  if (!planKey) {
    throw new Error(`UNKNOWN_PRICE_ID: ${priceId}`);
  }

  const patch = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    subscription_status: subscription.status,

    current_period_end: toIsoFromUnixSeconds(subscription.current_period_end),

    quota_period_start: toIsoFromUnixSeconds(subscription.current_period_start),
    quota_period_end: toIsoFromUnixSeconds(subscription.current_period_end),

    plan: planKey,
  };

  await updateProfileByCustomerId(customerId, patch);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription?.customer || null;
  if (!customerId) return;

  const patch = {
    stripe_subscription_id: null,
    stripe_price_id: null,
    subscription_status: "canceled",
    current_period_end: null,

    quota_period_start: null,
    quota_period_end: null,

    plan: "free",
  };

  await updateProfileByCustomerId(customerId, patch);
}

async function stripeWebhookHandler(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log("STRIPE EVENT:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "payment") {
          await handleOneShotPayment(session); // one-shot
        } else {
          await handleCheckoutSessionCompleted(session); // abonnement (legacy)
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpdatedOrCreated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("WEBHOOK_FAILED", err);
    return res.status(500).json({ error: "WEBHOOK_FAILED" });
  }
}

module.exports = { stripeWebhookHandler };
