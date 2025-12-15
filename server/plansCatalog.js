// server/plansCatalog.js

// ⚠️ Source de vérité côté serveur : c’est ICI que tu définis tes plans.
// Le front ne doit pas hardcoder les prix, et le webhook ne doit pas dépendre de la table "plans".

const PLANS = [
  {
    plan_key: "free",
    display_name: "Découverte",
    price_cents: 0,
    currency: "eur",
    monthly_limit: 1, // 1 génération / mois (chez toi = résumé numérologique)
    stripe_price_id: null,
  },
  {
    plan_key: "essentiel",
    display_name: "Essentiel",
    price_cents: 1999, // 19,99€/mois
    currency: "eur",
    monthly_limit: 1, // 1 thème complet / mois
    stripe_price_id: process.env.STRIPE_PRICE_ESSENTIEL || null,
  },
  {
    plan_key: "praticien",
    display_name: "Praticien",
    price_cents: 4999, // 49,99€/mois
    currency: "eur",
    monthly_limit: 5, // 5 thèmes complets / mois
    stripe_price_id: process.env.STRIPE_PRICE_PRATICIEN || null,
  },
  {
    plan_key: "pro_illimite",
    display_name: "Pro Illimité",
    price_cents: 14999, // 149,99€/mois
    currency: "eur",
    monthly_limit: 999999, // "illimité" (simple pour V1)
    stripe_price_id: process.env.STRIPE_PRICE_PRO_ILLIMITE || null,
  },
];

function getPlanByKey(plan_key) {
  return PLANS.find((p) => p.plan_key === plan_key) || null;
}

function getPlanKeyByStripePriceId(priceId) {
  const plan = PLANS.find((p) => p.stripe_price_id && p.stripe_price_id === priceId);
  return plan ? plan.plan_key : null;
}

function getPlansPublic() {
  // Ce que tu peux renvoyer au front sans exposer les price_id Stripe
  return PLANS.map(({ stripe_price_id, ...rest }) => rest);
}

function assertPlansConfigured() {
  const paidPlans = PLANS.filter(p => p.plan_key !== "free");
  const missing = paidPlans.filter(p => !p.stripe_price_id).map(p => p.plan_key);
  if (missing.length) {
    throw new Error(`Missing Stripe price IDs for plans: ${missing.join(", ")}`);
  }
}

module.exports = {
  PLANS,
  getPlanByKey,
  getPlanKeyByStripePriceId,
  getPlansPublic,
  assertPlansConfigured,
};