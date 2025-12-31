import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        Politique de confidentialité
      </h1>

      <p className="text-lg text-gray-600 mb-10">
        La présente politique explique comment nous collectons, utilisons et
        protégeons vos données personnelles lorsque vous utilisez notre site et
        nos services.
      </p>

      {/* Identité */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          1. Éditeur et responsable du traitement
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Le site est édité par&nbsp;
          <strong>LVL AGENCY LLC</strong>, société de droit américain (LLC),
          dont le siège social est situé&nbsp;:
          <br />
          8206 Louisiana Blvd NE, Ste A<br />
          Albuquerque NM 87113<br />
          États-Unis
          <br />
          <br />
          Responsable légal&nbsp;: <strong>Louis Dupla</strong>
          <br />
          Email de contact&nbsp;:{" "}
          <a
            href="mailto:contact@clesdesnombres.com"
            className="underline"
          >
            contact@clesdesnombres.com
          </a>
        </p>
      </section>

      {/* Champ d'application */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          2. Champ d’application
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Cette politique s’applique aux utilisateurs résidant en France et, de
          manière générale, dans l’Union européenne. Elle est conforme au
          Règlement Général sur la Protection des Données (RGPD).
        </p>
      </section>

      {/* Données collectées */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          3. Données personnelles collectées
        </h2>

        <p className="text-gray-700 leading-relaxed mb-3">
          Nous collectons uniquement les données nécessaires à la fourniture de
          nos services&nbsp;:
        </p>

        <ul className="list-disc ml-6 text-gray-700 leading-relaxed">
          <li>Nom et prénom</li>
          <li>Adresse email</li>
          <li>
            Informations de compte (gérées et sécurisées par Supabase — mot de
            passe hashé)
          </li>
          <li>Adresse IP (à des fins de sécurité et prévention fraude)</li>
          <li>Identifiants techniques Stripe&nbsp;:</li>
          <ul className="list-disc ml-8">
            <li>Customer ID</li>
            <li>Subscription ID</li>
          </ul>
          <li>
            Historique des thèmes générés afin de vous permettre d’y accéder
          </li>
        </ul>

        <p className="text-gray-700 leading-relaxed mt-3">
          Nous ne stockons jamais vos données bancaires. Les paiements sont
          traités exclusivement par{" "}
          <strong>Stripe</strong>
          .
        </p>
      </section>

      {/* Finalités */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          4. Finalités du traitement
        </h2>

        <ul className="list-disc ml-6 text-gray-700 leading-relaxed">
          <li>Création et gestion de votre compte utilisateur</li>
          <li>Accès à vos thèmes numérologiques</li>
          <li>Facturation et gestion d’abonnement</li>
          <li>Envoi d’emails transactionnels et d’information</li>
          <li>Envoi de newsletters (si vous y consentez)</li>
          <li>Sécurisation du service</li>
          <li>Amélioration de l’expérience utilisateur</li>
        </ul>
      </section>

      {/* Base légale */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          5. Base légale du traitement
        </h2>

        <ul className="list-disc ml-6 text-gray-700 leading-relaxed">
          <li>Exécution du contrat (création de compte et accès service)</li>
          <li>Respect d’obligations légales (facturation)</li>
          <li>Intérêt légitime (sécurisation)</li>
          <li>Consentement (newsletter)</li>
        </ul>
      </section>

      {/* Prestataires */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">6. Sous-traitants</h2>

        <p className="text-gray-700 leading-relaxed">
          Nous travaillons uniquement avec des prestataires reconnus&nbsp;:
        </p>

        <ul className="list-disc ml-6 text-gray-700 leading-relaxed">
          <li>Supabase — hébergement des données (UE)</li>
          <li>Stripe — paiement sécurisé</li>
          <li>Render — hébergement back-end</li>
          <li>Netlify — hébergement front-end</li>
        </ul>
      </section>

      {/* Durée conservation */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          7. Durée de conservation
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Les données de compte et d’historique sont conservées tant que votre
          compte reste actif. Vous pouvez demander leur suppression à tout
          moment.
        </p>
      </section>

      {/* Droits */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          8. Vos droits
        </h2>

        <p className="text-gray-700 leading-relaxed">
          Conformément au RGPD, vous disposez des droits suivants&nbsp;:
        </p>

        <ul className="list-disc ml-6 text-gray-700 leading-relaxed">
          <li>Droit d’accès</li>
          <li>Droit de rectification</li>
          <li>Droit à l’effacement</li>
          <li>Droit d’opposition</li>
          <li>Droit à la portabilité</li>
        </ul>

        <p className="text-gray-700 leading-relaxed mt-3">
          Pour exercer vos droits&nbsp;:
          <br />
          <a
            href="mailto:contact@clesdesnombres.com"
            className="underline"
          >
            contact@clesdesnombres.com
          </a>
        </p>
      </section>

      {/* Sécurité */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          9. Sécurité et protection
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Nous mettons en œuvre des mesures techniques et
          organisationnelles adaptées pour protéger vos données. Les mots de
          passe sont gérés et hashés par Supabase.
        </p>
      </section>

      {/* Nature bien-être */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          10. Nature des contenus
        </h2>
        <p className="text-gray-700 leading-relaxed">
          La numérologie proposée relève du bien-être. Il ne s’agit en aucun
          cas de conseils médicaux, psychologiques, juridiques ou financiers.
          Aucun résultat n’est garanti.
        </p>
      </section>

      {/* Transfert */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          11. Transferts hors UE
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Certains prestataires peuvent être situés hors UE. Ils appliquent des
          garanties conformes au RGPD (clauses contractuelles types).
        </p>
      </section>

      {/* Modifications */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          12. Modifications de la politique
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Cette politique pourra être mise à jour. La version en ligne fait
          foi.
        </p>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">13. Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          Pour toute question&nbsp;:
          <br />
          <a
            href="mailto:contact@clesdesnombres.com"
            className="underline"
          >
            contact@clesdesnombres.com
          </a>
        </p>
      </section>
    </div>
  );
}
