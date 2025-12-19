// server/stripeCheckout.js
const Stripe = require("stripe");
const { supabaseAdmin } = require("./supabase"); // adapte au nom exporté
const { getPlanByKey } = require("./plansCatalog");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,email,plan_key,stripe_customer_id")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

async function setStripeCustomerId(userId, customerId) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);

  if (error) throw error;
}

async function createCheckoutSession(req, res) {
  const { plan_key } = req.body || {};
  const plan = getPlanByKey(plan_key);

  if (!plan || plan.plan_key === "free") {
    return res.status(400).json({ error: "INVALID_PLAN" });
  }
  if (!plan.stripe_price_id) {
    return res.status(500).json({ error: "PLAN_NOT_CONFIGURED" });
  }

  // tu dois réutiliser TON auth middleware existant :
  // je suppose que tu as req.user.id (sinon adapte au champ déjà utilisé dans /generate-theme)
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });

  const profile = await getProfile(userId);

  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await setStripeCustomerId(userId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/profile?checkout=success`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    allow_promotion_codes: true,
    metadata: {
      supabase_user_id: userId,
      plan_key: plan.plan_key,
    },
  });

  return res.json({ url: session.url });
}

module.exports = { createCheckoutSession };
