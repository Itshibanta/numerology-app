// Génère, après le build, les coquilles HTML des routes React :
// - pages publiques : head propre et contenu lisible sans JavaScript ;
// - routes privées : noindex.
// Le contenu placé dans #root est remplacé par React au chargement ; les mêmes
// fragments sont rendus par les pages React, le texte reste donc identique.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dist = join(repo, "dist");
const shell = readFileSync(join(dist, "app", "index.html"), "utf8");
const content = (name) => readFileSync(join(repo, "web", "src", "content", name), "utf8");
const SITE = "https://clesdesnombres.com";
const escape = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const breadcrumb = (name, url) => ({
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name, item: url },
  ],
});

const PAGES = [
  {
    path: "theme-numerologique",
    title: "Thème Numérologique Complet à 59,90 € | Clés Des Nombres",
    description:
      "Commandez votre thème numérologique complet : plus de 20 composantes, mission de vie, cycles et nombres karmiques. Paiement unique, livraison sous 24 h.",
    h1: "Découvrez votre thème numérologique",
    intro: "Remplissez votre état civil pour recevoir votre thème personnalisé sous 24 h.",
    fragment: "theme-vente.html",
    schema: (url) => [
      {
        "@type": "Product",
        name: "Thème Numérologique Personnalisé",
        description:
          "Analyse numérologique complète et personnalisée à partir de l'état civil : portrait psychologique, mission de vie, cycles, défis et nombres karmiques.",
        image: `${SITE}/og-image.jpg`,
        brand: { "@type": "Brand", name: "Clés Des Nombres" },
        offers: {
          "@type": "Offer",
          price: "59.90",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url,
        },
      },
      breadcrumb("Mon thème numérologique", url),
    ],
  },
  {
    path: "theme-numerologique-gratuit",
    title: "Thème Numérologique Gratuit et Personnalisé | Clés Des Nombres",
    description:
      "Recevez gratuitement un résumé numérologique personnalisé : énergie dominante, forces, axe relationnel et principaux enjeux. Téléchargeable en PDF.",
    h1: "Découvrez votre thème gratuit",
    intro: "Renseignez votre état civil pour recevoir votre résumé numérologique personnalisé.",
    fragment: "theme-gratuit.html",
    schema: (url) => [breadcrumb("Thème numérologique gratuit", url)],
  },
];

function head(html, { title, description, url, schema, robots }) {
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(description)}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escape(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escape(description)}" />`)
    .replace(/\s*<!-- Données structurées[\s\S]*?<\/script>/, "");
  if (robots) {
    return out
      .replace(/\s*<meta property="og:[^>]*>/g, "")
      .replace("</head>", `  <meta name="robots" content="${robots}" />\n  </head>`);
  }
  const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@graph": schema }).replace(/</g, "\\u003c");
  return out
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
    .replace(
      "</head>",
      `  <link rel="canonical" href="${url}" />\n    <script type="application/ld+json">${jsonLd}</script>\n  </head>`
    );
}

for (const page of PAGES) {
  const url = `${SITE}/${page.path}/`;
  const fallback = `<main class="prerender-main"><div class="container"><h1>${page.h1}</h1><p>${page.intro}</p></div>${content(page.fragment)}</main>`;
  const html = head(shell, { ...page, url, schema: page.schema(url) }).replace(
    '<div id="root"></div>',
    `<div id="root">${fallback}</div>`
  );
  mkdirSync(join(dist, page.path), { recursive: true });
  writeFileSync(join(dist, page.path, "index.html"), html);
}

const privateShell = head(shell, {
  title: "Mon compte | Clés Des Nombres",
  description: "Espace client Clés Des Nombres.",
  robots: "noindex, nofollow",
});
writeFileSync(join(dist, "app", "private.html"), privateShell);
writeFileSync(join(dist, "app", "index.html"), privateShell);
