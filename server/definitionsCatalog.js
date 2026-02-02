// server/definitionsCatalog.js

const DEFINITIONS = {
  chemin_de_vie: {
    title: "Chemin de Vie",
    definition:
      "Axe central du thème : il indique la direction globale de vie, les grandes leçons à intégrer et la dynamique qui structure le parcours.",
  },

  nombre_expression: {
    title: "Nombre d’Expression",
    definition:
      "Expression de la personnalité dans la matière : il décrit comment tu agis, communiques et mets tes talents en œuvre au quotidien.",
  },

  nombre_ressource: {
    title: "Nombre Ressource",
    definition:
      "Réserve de soutien : il met en lumière les qualités sur lesquelles tu peux t’appuyer naturellement pour avancer et stabiliser ton chemin.",
  },

  nombre_actif: {
    title: "Nombre Actif",
    definition:
      "Énergie d’action immédiate : il montre ce que tu déclenches spontanément, ta manière d’initier, de réagir et de passer à l’action.",
  },

  nombre_hereditaire: {
    title: "Nombre Héréditaire",
    definition:
      "Héritage familial : il reflète des schémas transmis (forces, fragilités, réflexes) qui influencent ton fonctionnement et tes choix.",
  },

  nombre_moi_intime: {
    title: "Nombre Moi Intime",
    definition:
      "Vie intérieure et besoins affectifs : il révèle tes motivations profondes, ta sensibilité et ce qui te nourrit émotionnellement.",
  },

  defi_moi_intime: {
    title: "Défi du Moi Intime",
    definition:
      "Point de friction émotionnelle : il indique les blocages ou excès possibles dans l’intime et les ajustements à faire pour retrouver l’équilibre.",
  },

  nombre_realisation: {
    title: "Nombre de Réalisation",
    definition:
      "Accomplissement progressif : il représente ce vers quoi tu tends en maturité, ce que tu cherches à construire et incarner sur la durée.",
  },

  nombre_elan_spirituel: {
    title: "Nombre d’Élan Spirituel",
    definition:
      "Moteur du cœur : il exprime l’aspiration profonde, la vibration du désir intérieur et ce qui donne du sens à ton chemin.",
  },

  defi_elan_spirituel: {
    title: "Nombre Défi de l’Élan Spirituel",
    definition:
      "Tension sur le désir profond : il met en évidence les risques de manque, d’excès ou d’illusions et la façon de canaliser cet élan.",
  },

  defi_nombre_expression: {
    title: "Défi du Nombre d’Expression",
    definition:
      "Ajustement dans l’expression : il pointe les dérives possibles (sur/sous-expression) et ce qui doit être maîtrisé pour exprimer ton potentiel avec justesse.",
  },

  nombre_equilibre: {
    title: "Nombre d’Équilibre",
    definition:
      "Stabilisateur du thème : il indique la posture la plus saine à adopter en cas de stress, de doute ou de surcharge pour revenir au centre.",
  },
};

function getDefinitionByKey(key) {
  return DEFINITIONS[key] || null;
}

module.exports = {
  DEFINITIONS,
  getDefinitionByKey,
};
