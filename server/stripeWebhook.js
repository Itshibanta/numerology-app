// server/stripeWebhook.js
const Stripe = require("stripe");
const { supabaseAdmin } = require("./supabase");
const { getPlanKeyByStripePriceId } = require("./plansCatalog");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

async function handleCheckoutSessionCompleted(session) {
  const userId = session?.metadata?.supabase_user_id || null;
  const customerId = session?.customer || null;
  const subscriptionId = session?.subscription || null;

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

    current_period_end: toIsoFromUnixSeconds(subscription.current_period_end),

    quota_period_start: toIsoFromUnixSeconds(subscription.current_period_start),
    quota_period_end: toIsoFromUnixSeconds(subscription.current_period_end),

    // ✅ COHÉRENT avec ton /generate-theme qui lit profiles.plan
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
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    subscription_status: subscription.status,

    current_period_end: toIsoFromUnixSeconds(subscription.current_period_end),

    quota_period_start: toIsoFromUnixSeconds(subscription.current_period_start),
    quota_period_end: toIsoFromUnixSeconds(subscription.current_period_end),

    // ✅ COHÉRENT avec profiles.plan
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

    // ✅ retour free sur la colonne existante
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
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

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
    return res.status(500).json({ error: "WEBHOOK_FAILED" });
  }
}

module.exports = { stripeWebhookHandler };
