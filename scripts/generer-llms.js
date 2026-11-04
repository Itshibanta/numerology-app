// Génère site/llms.txt et site/llms-full.txt depuis le sitemap et les pages du site.
// Lancé à chaque build Netlify : un nouvel article y entre tout seul.
// Usage : node scripts/generer-llms.js
const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "..", "site");
const BASE = "https://clesdesnombres.com";

// À retirer dès que ces pages sont corrigées : elles calculent le Moi Intime sur les
// voyelles, alors que le guide et le thème le calculent sur les consonnes.
const EXCLUES = new Set([
  "/blog-numerologique/nombre-moi-intime-et-amour/",
  "/blog-numerologique/nombre-moi-intime-et-solitude/",
]);
// Lignes non reprises : allégations commerciales non vérifiées, et même erreur dans le dictionnaire.
const NON_REPRIS = /certifié|numératrice|500 analyses|(moi intime|nombre intime)[^.]{0,120}voyelles/i;

const PRESENTATION = `# Clés Des Nombres

> Clés Des Nombres est un site français de numérologie : plus de 200 guides gratuits sur les nombres (chemin de vie, expression, année personnelle, nombres maîtres et karmiques) et un thème numérologique personnalisé à 59,90 €, en paiement unique. Approche humaniste et karmique, pensée comme un outil de connaissance de soi et non comme une prédiction.

## L'essentiel

- Site : ${BASE}
- Langue : français
- Référente : Caroline Lavie, numérologue depuis 2013 (${BASE}/a-propos/)
- Produit : thème numérologique personnalisé de plus de 20 composantes, établi à partir de l'état civil (prénoms, noms, date de naissance)
- Prix : 59,90 €, paiement unique, sans abonnement
- Livraison : par email et sur le compte client, sous 24 heures après le paiement
- Exemple consultable : ${BASE}/exemple-theme-numerologique/
- Contact : contact@clesdesnombres.com
- Éditeur : LVL AGENCY LLC

## À qui cela s'adresse

- Personnes francophones qui veulent une lecture complète de leur thème, plutôt qu'un seul nombre.
- Personnes qui cherchent à calculer ou comprendre un nombre : les guides sont gratuits, sans compte.
- La numérologie n'est pas une science. Ce site ne remplace pas un avis médical, psychologique, juridique ou financier, et ne prédit pas l'avenir.
`;

const CLES = [
  ["/", "Thème Numérologique Personnalisé", "Présentation du thème, de son contenu et questions fréquentes."],
  ["/theme-numerologique/", "Commander son thème", "Formulaire de commande du thème à 59,90 €."],
  ["/exemple-theme-numerologique/", "Exemple de thème complet", "Aperçu de ce que contient un thème."],
  ["/a-propos/", "À propos", "Caroline Lavie, sa pratique et son approche."],
  ["/signification-annee-personnelle/", "Calculateur d'année personnelle", "Outil gratuit et signification de chaque année."],
];

const decode = (s) => s
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&rarr;/g, "→").replace(/&amp;/g, "&");

function fichier(u, nom) {
  return path.join(SITE, u.replace(/^\//, ""), nom);
}

function page(u) {
  const html = fs.readFileSync(fichier(u, "index.html"), "utf8");
  const titre = decode((html.match(/<title>(.*?)<\/title>/s) || [, u])[1]).split(" | ")[0].trim();
  let desc = decode((html.match(/<meta name="description" content="(.*?)"/s) || [, ""])[1]).trim();
  if (NON_REPRIS.test(desc)) desc = "";
  return { u, titre, desc };
}

function htmlVersMd(html) {
  let s = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  s = s.replace(/<(script|style|svg|form)[\s\S]*?<\/\1>/g, "");
  s = s.replace(/<a [^>]*href="(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, h, t) => `[${t}](${BASE}${h})`);
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, "\n# $1\n\n").replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, "\n## $1\n\n");
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, "\n### $1\n\n").replace(/<li[^>]*>([\s\S]*?)<\/li>/g, "- $1\n");
  s = s.replace(/<\/?strong>/g, "**").replace(/<\/p>/g, "\n\n").replace(/<[^>]+>/g, " ");
  return decode(s).replace(/[ \t]+/g, " ").replace(/^ +/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

function contenu(u) {
  const md = fichier(u, "index.md");
  const brut = fs.existsSync(md)
    ? fs.readFileSync(md, "utf8").replace(/^---[\s\S]*?\n---\n/, "")
    : htmlVersMd(fs.readFileSync(fichier(u, "index.html"), "utf8"));
  return brut.split("\n")
    .filter((l) => !NON_REPRIS.test(l))
    .join("\n").replace(/^(#{1,5}) /gm, "#$1 ").replace(/\n{3,}/g, "\n\n").trim();
}

const urls = [...fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(BASE, ""))
  .filter((u) => !EXCLUES.has(u) && fs.existsSync(fichier(u, "index.html")));

const estGuide = (u) => /^\/(decouvrir-la-numerologie|signification-[a-z-]+|nombres-maitres|nombres-karmiques|dictionnaire-numerologie|tous-les-nombres|heures-miroirs|decors-de-vie|theatre-de-vie|lecon-d-ame|les-defis)\/$/.test(u);
const estBlog = (u) => /^\/blog-numerologique\/.+/.test(u);
const cles = new Set(CLES.map((c) => c[0]));
const ligne = (p) => `- [${p.titre}](${BASE}${p.u})${p.desc ? `: ${p.desc}` : ""}`;

const guides = urls.filter((u) => estGuide(u) && !cles.has(u)).map(page);
const blog = urls.filter(estBlog).map(page);
const reste = urls.filter((u) => !estGuide(u) && !estBlog(u) && !cles.has(u) && u !== "/blog-numerologique/").map(page);

const llms = [
  PRESENTATION,
  "## Pages clés\n\n" + CLES.map(([u, t, d]) => `- [${t}](${BASE}${u}): ${d}`).join("\n"),
  `- [Contenu détaillé](${BASE}/llms-full.txt): Les guides de référence réunis dans un seul fichier.`,
  "\n## Guides de référence\n\n" + guides.map(ligne).join("\n"),
  "\n## Articles du blog\n\n" + blog.map(ligne).join("\n"),
  "\n## Optional\n\n" + reste.map((p) => `- [${p.titre}](${BASE}${p.u})`).join("\n"),
  "",
].join("\n");

const complet = guides.concat(blog).map((p) =>
  `\n---\n\n# ${p.titre}\n\nSource : ${BASE}${p.u}\n\n${contenu(p.u)}\n`);

fs.writeFileSync(path.join(SITE, "llms.txt"), llms);
fs.writeFileSync(path.join(SITE, "llms-full.txt"), PRESENTATION + complet.join(""));
console.log(`llms.txt : ${Buffer.byteLength(llms)} octets, ${urls.length} pages`);
console.log(`llms-full.txt : ${fs.statSync(path.join(SITE, "llms-full.txt")).size} octets, ${complet.length} pages`);
