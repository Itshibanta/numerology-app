import React from "react";

export default function LegalNoticePage() {
  return (
    <div className="container mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        Mentions légales
      </h1>

      <p className="text-lg text-gray-600 mb-10">
        Conformément à la législation française, vous trouverez ci-dessous
        les informations relatives à l’éditeur et à l’exploitation du site.
      </p>

      {/* Éditeur */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          1. Éditeur du site
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Le présent site internet est édité par&nbsp;
          <strong>LVL AGENCY LLC</strong>, société de droit américain (LLC),
          dont le siège social est situé&nbsp;:
          <br />
          8206 Louisiana Blvd NE, Ste A<br />
          Albuquerque NM 87113<br />
          États-Unis
          <br />
          <br />
          Représentant légal&nbsp;: <strong>Louis Dupla</strong>
          <br />
          Email&nbsp;:{" "}
          <a
            href="mailto:contact@clesdesnombres.com"
            className="underline"
          >
            contact@clesdesnombres.com
          </a>
        </p>
      </section>

      {/* Hébergeurs */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          2. Hébergement
        </h2>

        <p className="text-gray-700 leading-relaxed mb-3">
          Le site et les services associés sont hébergés par&nbsp;:
        </p>

        <ul className="list-disc ml-6 text-gray-700 leading-relaxed">
          <li>
            <strong>Netlify</strong> — hébergement du site web
          </li>
          <li>
            <strong>Render</strong> — hébergement du serveur applicatif
          </li>
          <li>
            <strong>Supabase</strong> — hébergement des données (région UE)
          </li>
          <li>
            <strong>Stripe</strong> — traitement sécurisé des paiements
          </li>
        </ul>
      </section>

      {/* Contact */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          3. Contact
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Pour toute question concernant le site ou son contenu, vous pouvez
          nous contacter à l’adresse suivante&nbsp;:
          <br />
          <a
            href="mailto:contact@clesdesnombres.com"
            className="underline"
          >
            contact@clesdesnombres.com
          </a>
        </p>
      </section>

      {/* Propriété intellectuelle */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          4. Propriété intellectuelle
        </h2>
        <p className="text-gray-700 leading-relaxed">
          L’ensemble des éléments du site (textes, visuels, marques, identité
          graphique, interface) est protégé par le droit de la propriété
          intellectuelle. Toute reproduction ou diffusion non autorisée est
          interdite.
        </p>
      </section>

      {/* Responsabilité contenu */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          5. Nature des informations fournies
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Les contenus proposés relèvent du domaine du bien-être et du
          développement personnel. Ils ne constituent&nbsp;:
        </p>

        <ul className="list-disc ml-6 text-gray-700 leading-relaxed">
          <li>ni un conseil médical</li>
          <li>ni un conseil psychologique</li>
          <li>ni un conseil juridique</li>
          <li>ni un conseil financier</li>
        </ul>

        <p className="text-gray-700 leading-relaxed mt-3">
          Aucun résultat n’est garanti.
          L’utilisateur demeure seul responsable de ses décisions.
        </p>
      </section>

      {/* Liens */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          6. Liens externes
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Le site peut contenir des liens vers des sites tiers.
          Nous ne sommes pas responsables de leur contenu.
        </p>
      </section>

      {/* Protection des données */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          7. Données personnelles
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Le traitement des données personnelles est décrit dans notre&nbsp;
          <a href="/privacy" className="underline">
            Politique de confidentialité
          </a>.
        </p>
      </section>

      {/* Droit applicable */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          8. Droit applicable
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Les présentes mentions légales sont soumises au droit applicable
          dans le pays d’établissement de la société éditrice, sous réserve
          des dispositions d’ordre public applicables aux utilisateurs
          résidant dans l’Union européenne.
        </p>
      </section>

      {/* Clause de non-garantie */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">
          9. Limitation de responsabilité
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Malgré le soin apporté au contenu, nous ne pouvons garantir l’absence
          totale d’erreurs ou d’interruptions. L’accès au service est proposé
          “en l’état”, sans garantie de performance ou de résultat.
        </p>
      </section>
    </div>
  );
}
