// server/numerologyCalc.js
// Moteur déterministe: calcule TOUS les nombres + génère les "lignes factuelles de calcul".
// GPT ne doit plus jamais recalculer.
//
// ✅ Intégré :
// - Chemin de Vie = JJ + MM + AAAA (pas JJMMAAAA)
// - Théâtre de Vie (Actes) : Acte2 = Jour+Année, Acte4 = Mois+Année
// - Équilibre = 1ère lettre de chaque prénom/nom (référence stable)
// - Y voyelle/consonne : overrides (exceptions) + heuristique prudente V1.1
// - Robustesse : flags missingConsonants, opérations de réduction propres, nom_marital calc_lines = []
// - Clarification AAAA : yearDigitsSum + yearReduced explicites
// - Validation calendrier réelle (ex: bloque 31/02/2001)
// - Debug support optionnel (opts.includeDebug ou NUMEROLOGY_DEBUG=1)
// - Traces plus propres : "Aucune lettre retenue = 0", single source equilibriumValues

const MASTER_NUMBERS = new Set([11, 22, 33, 44]);
const KARMIC_NUMBERS = new Set([13, 14, 16, 19]);

// === TABLEAU RÉCAP (lookup strict, pas de calcul) ===
// Source : TABLEAU RECAP (actes + cycles), à recopier tel quel.
const TABLEAU_RECAP = {
  acts_start_ages: {
    "1": { acte2: 35, acte3: 44, acte4: 53 },
    "2/11": { acte2: 34, acte3: 43, acte4: 52 },
    "3": { acte2: 33, acte3: 42, acte4: 51 },
    "4/22": { acte2: 32, acte3: 41, acte4: 50 },
    "5": { acte2: 31, acte3: 40, acte4: 49 },
    "6/33": { acte2: 30, acte3: 39, acte4: 48 },
    "7": { acte2: 29, acte3: 38, acte4: 47 },
    "8/44": { acte2: 28, acte3: 37, acte4: 46 },
    "9": { acte2: 27, acte3: 36, acte4: 45 },
  },
  cycles_start_ages: {
    "1": { cycle2: 27, cycle3: 54 },
    "2/11": { cycle2: 26, cycle3: 53 },
    "3": { cycle2: 25, cycle3: 52 },
    "4/22": { cycle2: 24, cycle3: 60 },
    "5": { cycle2: 32, cycle3: 59 },
    "6/33": { cycle2: 31, cycle3: 58 },
    "7": { cycle2: 30, cycle3: 57 },
    "8/44": { cycle2: 29, cycle3: 56 },
    "9": { cycle2: 28, cycle3: 55 },
  },
};

function recapKeyFromCheminDeVie(cv) {
  const n = Number(cv);

  // sécurité
  if (!Number.isFinite(n)) throw new Error("INVALID_CV_FOR_RECAP_KEY");

  // regroupements Tableau récap
  if (n === 11 || n === 2) return "2/11";
  if (n === 22 || n === 4) return "4/22";
  if (n === 33 || n === 6) return "6/33";
  if (n === 44 || n === 8) return "8/44";

  // chemins simples
  if ([1, 3, 5, 7, 9].includes(n)) return String(n);

  throw new Error("UNSUPPORTED_CV_FOR_RECAP_KEY");
}

function getRecapAges(cvReduced) {
  const key = recapKeyFromCheminDeVie(cvReduced);
  const acts = TABLEAU_RECAP.acts_start_ages[key] || null;
  const cycles = TABLEAU_RECAP.cycles_start_ages[key] || null;
  return { key, acts, cycles };
}

// ✅ Overrides token-level pour Y (après normalisation A–Z).
// "vowel" => Y traité comme voyelle (dans tout le token)
// "consonant" => Y traité comme consonne
// Vide par défaut : heuristique V1.1
const Y_TOKEN_OVERRIDES = {
  // MAYA: "vowel",
  // MYRIAM: "vowel",
  // SYLVAIN: "vowel",
  // YVES: "consonant",
};

// Table pythagoricienne classique
// 1: A J S
// 2: B K T
// 3: C L U
// 4: D M V
// 5: E N W
// 6: F O X
// 7: G P Y
// 8: H Q Z
// 9: I R
const LETTER_VALUES = (() => {
  const map = {};
  const groups = {
    1: "AJS",
    2: "BKT",
    3: "CLU",
    4: "DMV",
    5: "ENW",
    6: "FOX",
    7: "GPY",
    8: "HQZ",
    9: "IR",
  };
  for (const [n, letters] of Object.entries(groups)) {
    for (const ch of letters) map[ch] = Number(n);
  }
  return map;
})();

function stripAccents(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeLettersOnly(s) {
  return stripAccents(s).toUpperCase().replace(/[^A-Z]/g, "");
}

function isRealCalendarDate(day, month, year) {
  // month: 1..12
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function parseDateFR(dateStr) {
  // Attend "JJ/MM/AAAA"
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((dateStr || "").trim());
  if (!m) throw new Error("INVALID_DATE_FORMAT");

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);

  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1000) {
    throw new Error("INVALID_DATE_VALUE");
  }
  if (!isRealCalendarDate(day, month, year)) {
    throw new Error("INVALID_DATE_VALUE");
  }

  return { day, month, year };
}

function sumDigits(nOrStr) {
  const s = String(nOrStr).replace(/\D/g, "");
  let sum = 0;
  for (const ch of s) sum += Number(ch);
  return sum;
}

function reduceNumber(n) {
  // Réduction finale, maîtres-nombres conservés.
  let cur = Number(n);
  while (cur >= 10 && !MASTER_NUMBERS.has(cur)) {
    cur = sumDigits(cur);
  }
  return cur;
}

function karmicDisplayIfAny(rawTotal, reducedFinal) {
  if (KARMIC_NUMBERS.has(rawTotal)) return `${rawTotal}/${reducedFinal}`;
  return null;
}

function letterValue(ch) {
  return LETTER_VALUES[ch] || 0;
}

function splitNameTokens(raw) {
  // Tokens "humains" (prénoms / noms)
  return String(raw || "")
    .trim()
    .split(/\s+/)
    .map((p) => normalizeLettersOnly(p))
    .filter(Boolean);
}

// ---- Y VOWEL/CONSONANT (overrides + heuristique V1.1) ----
function isVowelChar(ch) {
  return ch === "A" || ch === "E" || ch === "I" || ch === "O" || ch === "U";
}

function isConsonantChar(ch) {
  return ch >= "A" && ch <= "Z" && !isVowelChar(ch) && ch !== "Y";
}

function yOverrideMode(token) {
  return Y_TOKEN_OVERRIDES[token] || null; // "vowel" | "consonant" | null
}

function isYVowelInToken(token, idx) {
  if (token[idx] !== "Y") return false;

  const mode = yOverrideMode(token);
  if (mode === "vowel") return true;
  if (mode === "consonant") return false;

  // Heuristique prudente
  if (idx === 0 || idx === token.length - 1) return false;

  const prev = token[idx - 1];
  const next = token[idx + 1];

  return isConsonantChar(prev) && isConsonantChar(next);
}

function extractVowelsSmart(token) {
  const out = [];
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (isVowelChar(ch)) out.push(ch);
    else if (ch === "Y" && isYVowelInToken(token, i)) out.push(ch);
  }
  return out;
}

function extractConsonantsSmart(token) {
  const out = [];
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    const yIsVowel = ch === "Y" && isYVowelInToken(token, i);
    if (ch >= "A" && ch <= "Z" && !isVowelChar(ch) && !yIsVowel) out.push(ch);
  }
  return out;
}

function sumLetters(normalized) {
  let total = 0;
  for (const ch of normalized) total += letterValue(ch);
  return total;
}

// ---- Calc lines builders (audit strict: opérations only) ----
function buildCalcLines_digits(label, rawExpr) {
  const raw = String(rawExpr);
  const digits = raw.replace(/\D/g, "").split("");
  const lines = [];

  lines.push(`${label} = ${raw}`);

  if (digits.length > 0) {
    let cur = digits.reduce((a, x) => a + Number(x), 0);
    lines.push(`${digits.join("+")} = ${cur}`);

    while (cur >= 10 && !MASTER_NUMBERS.has(cur)) {
      const ds = String(cur).split("");
      const next = ds.reduce((a, x) => a + Number(x), 0);
      lines.push(`${ds.join("+")} = ${next}`);
      cur = next;
    }
  }

  return lines;
}

function buildCalcLines_letters(label, lettersList, sumTotal) {
  const lines = [];

  const joined = lettersList && lettersList.length ? lettersList.join("") : "";
  lines.push(`${label} = ${joined}`);

  if (!lettersList || lettersList.length === 0) {
    lines.push(`Aucune lettre retenue = 0`);
    return lines;
  }

  const values = lettersList.map(letterValue);
  lines.push(`${values.join("+")} = ${sumTotal}`);

  if (sumTotal < 10 || MASTER_NUMBERS.has(sumTotal)) {
    return lines;
  }

  let cur = sumTotal;
  while (cur >= 10 && !MASTER_NUMBERS.has(cur)) {
    const ds = String(cur).split("");
    const next = ds.reduce((a, x) => a + Number(x), 0);
    lines.push(`${ds.join("+")} = ${next}`);
    cur = next;
  }

  return lines;
}

function reductionOpsIfNeeded(raw) {
  const n = Number(raw);
  if (Number.isNaN(n)) return [];
  if (n < 10 || MASTER_NUMBERS.has(n)) return [];
  return buildCalcLines_digits("Réduction", String(raw)).slice(1);
}

function abs(n) {
  return Math.abs(Number(n));
}

function computeNumerology(inputs, opts = {}) {
  const targetYear = Number(opts.targetYear || new Date().getFullYear());
  const includeDebug =
    opts.includeDebug === true || process.env.NUMEROLOGY_DEBUG === "1";

  const { prenom, secondPrenom, nomFamille, nomMarital, dateNaissance } =
    inputs || {};

  if (!prenom || !nomFamille || !dateNaissance) {
    throw new Error("MISSING_REQUIRED_FIELDS");
  }

  const { day, month, year } = parseDateFR(dateNaissance);

  // Tokens (prénoms / noms)
  const prenomTokens = splitNameTokens(prenom);
  const secondPrenomTokens = splitNameTokens(secondPrenom || "");
  const nomTokens = splitNameTokens(nomFamille);
  const maritalTokens = nomMarital ? splitNameTokens(nomMarital) : [];

  // Normalisés collés
  const prenomN = prenomTokens.join("");
  const nomN = nomTokens.join("");
  const maritalN = maritalTokens.join("");

  // Nom complet naissance = prénoms + nom naissance
  const birthTokens = [...prenomTokens, ...secondPrenomTokens, ...nomTokens].filter(Boolean);
  const fullBirthNameN = birthTokens.join("");

  // ==== Chemin de Vie (JJ + MM + AAAA) ====
  const cvRaw = day + month + year;
  const cvReduced = reduceNumber(cvRaw);

  // === ÂGES OFFICIELS (Tableau récap) : lookup strict ===
  const recap = getRecapAges(cvReduced);
  if (!recap.acts || !recap.cycles) {
    throw new Error("TABLEAU_RECAP_LOOKUP_FAILED");
  }

  // ==== Expression ====
  const exprTotal = sumLetters(fullBirthNameN);
  const exprReduced = reduceNumber(exprTotal);
  const exprKarmic = karmicDisplayIfAny(exprTotal, exprReduced);

  // ==== Ressource ====
  const resRaw = cvReduced + exprReduced;
  const resReduced = reduceNumber(resRaw);

  // ==== Actif (prénom usuel) ====
  const actifTotal = sumLetters(prenomN);
  const actifReduced = reduceNumber(actifTotal);
  const actifKarmic = karmicDisplayIfAny(actifTotal, actifReduced);

  // ==== Héréditaire (nom naissance) ====
  const heredTotal = sumLetters(nomN);
  const heredReduced = reduceNumber(heredTotal);
  const heredKarmic = karmicDisplayIfAny(heredTotal, heredReduced);

  // ==== Moi Intime (consonnes) ====
  const consonantsMI = birthTokens.flatMap(extractConsonantsSmart);
  const miTotal = consonantsMI.reduce((a, ch) => a + letterValue(ch), 0);
  const miReduced = reduceNumber(miTotal);
  const miKarmic = karmicDisplayIfAny(miTotal, miReduced);

  // ==== Défi Moi Intime ====
  const missingConsonants = consonantsMI.length === 0;
  const firstCons = consonantsMI[0] || null;
  const lastCons = consonantsMI[consonantsMI.length - 1] || null;

  const defiMIraw =
    !missingConsonants && firstCons && lastCons
      ? abs(letterValue(firstCons) - letterValue(lastCons))
      : 0;

  const defiMIreduced = reduceNumber(defiMIraw);

  // ==== Réalisation ====
  const dayReduced = reduceNumber(day);
  const monthReduced = reduceNumber(month);
  const realRaw = dayReduced + monthReduced;
  const realReduced = reduceNumber(realRaw);

  // ==== Élan Spirituel (voyelles) ====
  const vowelsES = birthTokens.flatMap(extractVowelsSmart);
  const esTotal = vowelsES.reduce((a, ch) => a + letterValue(ch), 0);
  const esReduced = reduceNumber(esTotal);
  const esKarmic = karmicDisplayIfAny(esTotal, esReduced);

  // ==== Défi Élan Spirituel ====
  const defiESraw = defiMIraw;
  const defiESreduced = reduceNumber(defiESraw);

  // ==== Défi Expression ====
  const defiExprRaw = esReduced + defiESreduced;
  const defiExprReduced = reduceNumber(defiExprRaw);

  // ==== Équilibre (1ère lettre de chaque token d’état civil) ====
  const civilTokens = [...prenomTokens, ...secondPrenomTokens, ...nomTokens, ...maritalTokens].filter(Boolean);
  const equilibriumLetters = civilTokens.map((t) => t[0]).filter(Boolean);
  const equilibriumValues = equilibriumLetters.map(letterValue);
  const equilibriumTotal = equilibriumValues.reduce((a, x) => a + x, 0);
  const equilibriumReduced = reduceNumber(equilibriumTotal);

  // ==== Nom marital (si applicable) ====
  let marital = null;
  if (maritalN) {
    const mTotal = sumLetters(maritalN);
    const mReduced = reduceNumber(mTotal);
    marital = {
      total: mTotal,
      reduced: mReduced,
      karmic: karmicDisplayIfAny(mTotal, mReduced),
    };
  }

  // ==== Décors de vie ====
  const cycleFormatif = reduceNumber(month);
  const cycleProductif = reduceNumber(day);

  // Clarification AAAA
  const yearDigitsSum = sumDigits(year); // ex: 1996 => 25
  const yearReduced = reduceNumber(yearDigitsSum); // 25 => 7 (ou master)

  const cycleMoissonRaw = yearDigitsSum; // somme chiffres AAAA
  const cycleMoisson = reduceNumber(cycleMoissonRaw);

  // ==== Théâtre de Vie — 4 Actes (corrigé) ====
  const acte1 = reduceNumber(day + month);
  const acte2 = reduceNumber(day + year);
  const acte3 = reduceNumber(acte1 + acte2);
  const acte4 = reduceNumber(month + year);

  // ==== Leçon d’âme ====
  const leconAmeRaw = acte1 + acte2 + acte3 + acte4;
  const leconAme = reduceNumber(leconAmeRaw);

  // ==== Défis (standard) ====
  const defi1raw = abs(dayReduced - monthReduced);
  const defi1 = reduceNumber(defi1raw);

  const defi2raw = abs(dayReduced - yearReduced);
  const defi2 = reduceNumber(defi2raw);

  const defiMajorRaw = abs(defi1 - defi2);
  const defiMajor = reduceNumber(defiMajorRaw);

  // ==== Année personnelle ====
  const targetYearReduced = reduceNumber(sumDigits(targetYear));
  const anneePersRaw = dayReduced + monthReduced + targetYearReduced;
  const anneePers = reduceNumber(anneePersRaw);

  // ==== Année clé (sans réduction) ====
  const anneeCle = day + month + year;

  // ==== Debug token breakdown (support) ====
  const debug_birthTokens = includeDebug
    ? birthTokens.map((token) => {
        const letters = Array.from(token);

        const vowels = extractVowelsSmart(token);
        const consonants = extractConsonantsSmart(token);

        const sumAll = letters.reduce((acc, ch) => acc + letterValue(ch), 0);
        const sumVowels = vowels.reduce((acc, ch) => acc + letterValue(ch), 0);
        const sumCons = consonants.reduce((acc, ch) => acc + letterValue(ch), 0);

        return {
          token,
          letters,
          sumAll,
          vowels,
          sumVowels,
          consonants,
          sumConsonants: sumCons,
          yOverride: yOverrideMode(token),
        };
      })
    : null;

  // ==== Meta Y: overrides utilisés ====
  const overridesApplied = [];
  for (const t of civilTokens) {
    if (t.includes("Y")) {
      const mode = yOverrideMode(t);
      if (mode) overridesApplied.push({ token: t, mode });
    }
  }

  // ==== LIGNES FACTUELLES DE CALCUL ====
  const calc_lines = {
    chemin_de_vie: [
      `JJ = ${String(day).padStart(2, "0")}`,
      `MM = ${String(month).padStart(2, "0")}`,
      `AAAA = ${String(year)}`,
      `${day}+${month}+${year} = ${cvRaw}`,
      ...reductionOpsIfNeeded(cvRaw),
    ],

    expression: buildCalcLines_letters(
      "NOM COMPLET (NAISSANCE)",
      Array.from(fullBirthNameN),
      exprTotal
    ),

    ressource: [
      `Chemin de Vie (réduit) = ${cvReduced}`,
      `Expression (réduite) = ${exprReduced}`,
      `${cvReduced}+${exprReduced} = ${resRaw}`,
      ...reductionOpsIfNeeded(resRaw),
    ],

    actif: buildCalcLines_letters("PRÉNOM USUEL", Array.from(prenomN), actifTotal),

    hereditaire: buildCalcLines_letters("NOM DE NAISSANCE", Array.from(nomN), heredTotal),

    moi_intime: buildCalcLines_letters("CONSONNES (MOI INTIME)", consonantsMI, miTotal),

    defi_moi_intime: [
      `Première consonne = ${firstCons || ""} (${firstCons ? letterValue(firstCons) : 0})`,
      `Dernière consonne = ${lastCons || ""} (${lastCons ? letterValue(lastCons) : 0})`,
      `|${firstCons ? letterValue(firstCons) : 0}-${lastCons ? letterValue(lastCons) : 0}| = ${defiMIraw}`,
      ...reductionOpsIfNeeded(defiMIraw),
    ],

    realisation: [
      `Jour (réduit) = ${dayReduced}`,
      `Mois (réduit) = ${monthReduced}`,
      `${dayReduced}+${monthReduced} = ${realRaw}`,
      ...reductionOpsIfNeeded(realRaw),
    ],

    elan_spirituel: buildCalcLines_letters("VOYELLES (ÉLAN SPIRITUEL)", vowelsES, esTotal),

    defi_elan_spirituel: [
      `Même formule que Défi du Moi Intime = ${defiESraw}`,
      ...reductionOpsIfNeeded(defiESraw),
    ],

    defi_expression: [
      `Élan Spirituel (réduit) = ${esReduced}`,
      `Défi Élan Spirituel (réduit) = ${defiESreduced}`,
      `${esReduced}+${defiESreduced} = ${defiExprRaw}`,
      ...reductionOpsIfNeeded(defiExprRaw),
    ],

    equilibre: [
      `Référence (1ères lettres) = ${equilibriumLetters.join("")}`,
      `${equilibriumValues.join("+")} = ${equilibriumTotal}`,
      ...reductionOpsIfNeeded(equilibriumTotal),
    ],

    nom_marital: maritalN
      ? buildCalcLines_letters("NOM MARITAL", Array.from(maritalN), marital.total)
      : [],

    decors: [
      `Cycle Formatif (mois) = ${month} → ${cycleFormatif}`,
      `Cycle Productif (jour) = ${day} → ${cycleProductif}`,
      `Somme chiffres AAAA = ${String(year).split("").join("+")} = ${yearDigitsSum}`,
      ...reductionOpsIfNeeded(yearDigitsSum),
      `Cycle de Moisson = ${cycleMoissonRaw} → ${cycleMoisson}`,
      `Début Cycle Productif (2e cycle) (Tableau récap) = ${recap.cycles.cycle2} ans`,
      `Début Cycle de Moisson (3e cycle) (Tableau récap) = ${recap.cycles.cycle3} ans`,
    ],

    theatre: [
      `Acte 1 = ${day}+${month} = ${day + month} → ${acte1}`,
      `Acte 2 = ${day}+${year} = ${day + year} → ${acte2}`,
      `Acte 3 = ${acte1}+${acte2} = ${acte1 + acte2} → ${acte3}`,
      `Acte 4 = ${month}+${year} = ${month + year} → ${acte4}`,
      `Début Acte 2 (Tableau récap) = ${recap.acts.acte2} ans`,
      `Début Acte 3 (Tableau récap) = ${recap.acts.acte3} ans`,
      `Début Acte 4 (Tableau récap) = ${recap.acts.acte4} ans`,
    ],

    lecon_ame: [
      `${acte1}+${acte2}+${acte3}+${acte4} = ${leconAmeRaw}`,
      ...reductionOpsIfNeeded(leconAmeRaw),
    ],

    defis: [
      `Année: somme chiffres AAAA = ${yearDigitsSum}`,
      `Année (réduite) = ${yearReduced}`,
      `1er Défi = |${dayReduced}-${monthReduced}| = ${defi1raw} → ${defi1}`,
      `2e Défi = |${dayReduced}-${yearReduced}| = ${defi2raw} → ${defi2}`,
      `Défi Majeur = |${defi1}-${defi2}| = ${defiMajorRaw} → ${defiMajor}`,
    ],

    annee_personnelle: [
      `Année cible = ${targetYear}`,
      `Année cible: somme chiffres = ${String(targetYear).split("").join("+")} = ${sumDigits(targetYear)}`,
      `Année cible (réduite) = ${targetYearReduced}`,
      `Jour (réduit) = ${dayReduced}`,
      `Mois (réduit) = ${monthReduced}`,
      `${dayReduced}+${monthReduced}+${targetYearReduced} = ${anneePersRaw} → ${anneePers}`,
    ],

    annee_cle: [
    `Jour+Mois = ${day}+${month} = ${day + month}`,
    `(Jour+Mois)+Année naissance = ${day + month}+${year} = ${anneeCle}`,
    ],

  };

  const computed = {
    chemin_de_vie: { total: cvRaw, reduced: cvReduced },

    expression: { total: exprTotal, reduced: exprReduced, karmic: exprKarmic },

    ressource: { total: resRaw, reduced: resReduced },

    actif: { total: actifTotal, reduced: actifReduced, karmic: actifKarmic },

    hereditaire: { total: heredTotal, reduced: heredReduced, karmic: heredKarmic },

    moi_intime: { total: miTotal, reduced: miReduced, karmic: miKarmic },

    defi_moi_intime: {
      total: defiMIraw,
      reduced: defiMIreduced,
      first: firstCons,
      last: lastCons,
      missingConsonants,
    },

    realisation: { total: realRaw, reduced: realReduced },

    elan_spirituel: { total: esTotal, reduced: esReduced, karmic: esKarmic },

    defi_elan_spirituel: {
      total: defiESraw,
      reduced: defiESreduced,
      missingConsonants,
    },

    defi_expression: { total: defiExprRaw, reduced: defiExprReduced },

    equilibre: {
      total: equilibriumTotal,
      reduced: equilibriumReduced,
      letters: equilibriumLetters,
    },

    nom_marital: marital, // null si absent

    decors: {
      cycle_formatif: cycleFormatif,
      cycle_productif: cycleProductif,
      yearDigitsSum,
      yearReduced,
      cycle_moisson: { total: cycleMoissonRaw, reduced: cycleMoisson },
      ages: {
        recap_key: recap.key,
        debut_cycle2: recap.cycles.cycle2,
        debut_cycle3: recap.cycles.cycle3,
      },
    },

    theatre: {
      acte1,
      acte2,
      acte3,
      acte4,
      ages: {
        recap_key: recap.key,
        debut_acte2: recap.acts.acte2,
        debut_acte3: recap.acts.acte3,
        debut_acte4: recap.acts.acte4,
      },
    },

    lecon_ame: { total: leconAmeRaw, reduced: leconAme },

    defis: {
      defi1,
      defi2,
      defi_majeur: defiMajor,
      raw: { defi1raw, defi2raw, defiMajorRaw },
    },

    annee_personnelle: { total: anneePersRaw, reduced: anneePers, targetYear },

    annee_cle: { year: anneeCle },

    meta_y_rule: {
      rule:
        "Overrides token-level (Y_TOKEN_OVERRIDES) then fallback: Y vowel only if surrounded by consonants within token; never vowel at start/end; default consonant",
      overridesApplied,
    },
  };

  const base = {
    inputs: {
      prenom,
      secondPrenom: secondPrenom || "",
      nomFamille,
      nomMarital: nomMarital || "",
      dateNaissance,
      targetYear,
    },
    computed,
    calc_lines,
  };

  if (includeDebug) {
    return {
      ...base,
      debug: {
        birthTokens: debug_birthTokens,
      },
    };
  }

  return base;
}

module.exports = { computeNumerology };
