// server/plansCatalog.js

// ⚠️ Source de vérité côté serveur : c'est ICI que tu définis ton offre.
// Le front ne doit pas hardcoder les prix, et le webhook ne doit pas dépendre
// d'une table "plans".
//
// MODÈLE COMMERCIAL : paiement unique (one-shot) 59,90 € = 1 thème numérologique.
// Les anciens abonnements (essentiel / praticien / pro_illimité) sont supprimés.
// Le résumé gratuit est mis de côté : "free" reste l'état par défaut d'un compte
// (aucune génération offerte).
//
// PRICE STRIPE : produit prod_TbWNCMyVsFmq0e / price_1TlmAwRYKflLSIEHbuydWnnD.
// On lit la valeur depuis l'env. On accepte STRIPE_PRICE_ONESHOT en priorité,
// et on retombe sur STRIPE_PRICE_PRO_ILLIMITE (variable déjà présente sur Render)
// pour ne pas avoir à renommer la variable côté hébergeur.

const ONESHOT_PRICE_ID =
  process.env.STRIPE_PRICE_ONESHOT ||
  process.env.STRIPE_PRICE_PRO_ILLIMITE ||
  null;

const PLANS = [
  {
    plan_key: "free",
    display_name: "Découverte",
    price_cents: 0,
    currency: "eur",
    monthly_limit: 0, // aucune génération offerte (résumé gratuit mis de côté)
    stripe_price_id: null,
    mode: null,
  },
  {
    plan_key: "oneshot",
    display_name: "Thème numérologique",
    price_cents: 5990, // 59,90 € TTC, paiement unique
    currency: "eur",
    monthly_limit: 999999, // pas de quota mensuel : 1 paiement = 1 thème
    stripe_price_id: ONESHOT_PRICE_ID,
    mode: "payment", // Stripe Checkout en mode paiement unique
    one_shot: true,
  },
];

function getPlanByKey(plan_key) {
  return PLANS.find((p) => p.plan_key === plan_key) || null;
}

// Le plan payant unique (utilisé par le checkout one-shot)
function getOneShotPlan() {
  return PLANS.find((p) => p.one_shot) || null;
}

function getPlanKeyByStripePriceId(priceId) {
  const plan = PLANS.find((p) => p.stripe_price_id && p.stripe_price_id === priceId);
  return plan ? plan.plan_key : null;
}

function getPlansPublic() {
  // Ce que l'on peut renvoyer au front sans exposer les price_id Stripe
  return PLANS.map(({ stripe_price_id, ...rest }) => rest);
}

function assertPlansConfigured() {
  const paidPlans = PLANS.filter((p) => p.plan_key !== "free");
  const missing = paidPlans.filter((p) => !p.stripe_price_id).map((p) => p.plan_key);
  if (missing.length) {
    throw new Error(`Missing Stripe price IDs for plans: ${missing.join(", ")}`);
  }
}

module.exports = {
  PLANS,
  getPlanByKey,
  getOneShotPlan,
  getPlanKeyByStripePriceId,
  getPlansPublic,
  assertPlansConfigured,
};
