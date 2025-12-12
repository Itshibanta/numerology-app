// web/src/pages/HomePage.tsx

import { Link } from "react-router-dom";
import creatorPhoto from "../assets/creator.jpg";

export default function HomePage() {
  return (
    <div className="home-root">
      {/* ========================== */}
      {/* HERO / BANNIÈRE */}
      {/* ========================== */}
      <section className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-title">
            Transforme ta date de naissance en véritable carte de navigation de vie
          </h1>
          <p className="home-subtitle">
            Notre générateur numérologique analyse ton état civil et produit un thème complet,
            structuré et directement exploitable – pour toi, ou comme support de séance avec
            tes clients si tu es professionnel.
          </p>
        </div>
      </section>

      {/* ================================= */}
      {/* SECTION : Comment ça fonctionne ? */}
      {/* ================================= */}
      <section className="home-section home-how">
        <h2>Comment ça fonctionne&nbsp;?</h2>
        <p>
          Tu n&apos;as rien à calculer toi-même. Tu renseignes simplement ton état civil,
          le moteur se charge des calculs et de la mise en forme, puis tu récupères un thème
          complet, prêt à être lu, imprimé ou partagé.
        </p>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Tu entres ton état civil</h3>
            <p>
              Prénom, second prénom, nom marital si besoin, date, lieu et heure de naissance
              si tu la connais. En moins d&apos;une minute, toutes les informations nécessaires
              sont renseignées.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Les nombres clés sont calculés</h3>
            <p>
              Chemin de vie, expression, âme, personnalité, cycles, défis, réalisations…
              les nombres importants sont calculés puis organisés dans une structure cohérente,
              pensée pour la lecture et l&apos;accompagnement.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Un thème complet est généré</h3>
            <p>
              Tu obtiens un texte découpé en sections claires, avec des explications,
              des éléments de contexte et des pistes de réflexion concrètes&nbsp;:
              de quoi passer immédiatement de la théorie à l&apos;exploration personnelle.
            </p>
          </div>
        </div>

        <div className="home-section-actions">
          <Link className="btn btn-secondary" to="/theme">
            Découvrir mon thème
          </Link>
        </div>
      </section>

      {/* ========================== */}
      {/* SECTION : Pourquoi un thème ? */}
      {/* ========================== */}
      <section className="home-section">
        <h2>Pourquoi un thème numérologique structuré change la donne</h2>
        <p>
          La plupart des contenus numérologiques accessibles en ligne sont soit trop génériques,
          soit trop flous. Tu te retrouves avec des phrases qui pourraient s&apos;appliquer à
          n&apos;importe qui, ou à l&apos;inverse avec des interprétations tellement ésotériques
          qu&apos;il devient difficile de les relier à ta réalité quotidienne.
        </p>
        <p>
          Un thème structuré te permet au contraire de poser les choses clairement&nbsp;:
          quels sont tes nombres principaux, comment ils interagissent, quels schémas se répètent
          dans ta vie et quelles périodes sont les plus favorables à certains types de décisions.
          C&apos;est un document que tu peux relire, annoter et utiliser comme base pour tes choix
          ou tes accompagnements.
        </p>
        <p>
          L&apos;objectif n&apos;est pas de te dire quoi faire à ta place, mais de te fournir une
          carte de navigation suffisamment précise pour que tu puisses voir ce que tu ne voyais
          pas encore, mettre des mots sur tes ressentis et comprendre pourquoi certains thèmes
          reviennent constamment dans ton histoire.
        </p>
      </section>    


      {/* ====================================== */}
      {/* SECTION : Ce que contient ton thème   */}
      {/* (remplace "Concrètement, qu'est-ce que tu reçois ?") */}
      {/* ====================================== */}
<section className="home-section theme-details">
  <h2>Ce que contient ton thème</h2>
  <p>
    Chemin de vie, nombre d&apos;expression, nombre intime, nombre de personnalité…
    les grandes composantes de ton profil numérologique sont détaillées et mises en
    perspective.
  </p>

  <div className="theme-grid">

    {/* 1. Nombres fondamentaux */}
    <article className="theme-item">
      <div className="theme-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="8" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
          <rect x="13" y="13" width="8" height="8" rx="2" />
        </svg>
      </div>
      <h3>Nombres fondamentaux</h3>
      <p>
        Chemin de vie, nombre d&apos;expression, nombre intime, nombre de
        personnalité… les grandes composantes de ton profil numérologique sont
        détaillées et mises en perspective.
      </p>
    </article>

    {/* 2. Axes de direction — COMPASS */}
    <article className="theme-item">
      <div className="theme-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <polygon points="10,10 15,9 14,14 9,15" />
        </svg>
      </div>
      <h3>Axes de direction</h3>
      <p>
        Les grandes directions vers lesquelles ta personnalité et ton chemin de
        vie t&apos;emportent naturellement, ainsi que les domaines où ton
        énergie s&apos;exprime le plus facilement.
      </p>
    </article>

    {/* 3. Cycles & périodes de vie */}
    <article className="theme-item">
      <div className="theme-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9a6 6 0 0 1 11-2" />
          <polyline points="17 3 17 7 13 7" />
          <path d="M18 15a6 6 0 0 1-11 2" />
          <polyline points="7 21 7 17 11 17" />
        </svg>
      </div>
      <h3>Cycles & périodes de vie</h3>
      <p>
        Les grandes phases de ton parcours, leurs thématiques principales et la
        façon dont elles se succèdent, pour mieux comprendre ce qui se joue en
        ce moment pour toi.
      </p>
    </article>

    {/* 4. Défis & zones de tension — CROSS PATHS */}
    <article className="theme-item">
      <div className="theme-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18" />
          <path d="M3 12h18" />
          <path d="M7 7l5 5-5 5" />
          <path d="M17 7l-5 5 5 5" />
        </svg>
      </div>

      <h3>Défis & zones de tension</h3>
      <p>
        Les points sensibles, les répétitions, les tiraillements internes et la
        manière dont ils peuvent devenir des leviers d&apos;évolution plutôt
        que des blocages.
      </p>
    </article>

    {/* 5. Synthèse & pistes d'intégration — PUZZLE */}
    <article className="theme-item">
      <div className="theme-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="
            M9 3h1a2 2 0 1 0 4 0h1a2 2 0 0 1 2 2v2
            a2 2 0 1 0 0 4v2a2 2 0 1 0 0 4v2a2 2 0 0 1-2 2h-2
            a2 2 0 1 0-4 0H9a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-4v-2
            a2 2 0 1 0 0-4V5a2 2 0 0 1 2-2z" />
        </svg>
      </div>

      <h3>Synthèse & pistes d&apos;intégration</h3>
      <p>
        Une mise en perspective globale de ton thème, avec des pistes concrètes
        pour intégrer ce que tu viens de lire et l&apos;utiliser dans ta vie ou
        tes accompagnements.
      </p>
    </article>

  </div>
</section>


      {/* ====================================== */}
      {/* SECTION : Pour qui est fait ce générateur ? */}
      {/* ====================================== */}
      <section className="home-section">
        <h2>Pour qui est fait ce générateur&nbsp;?</h2>
        <p>
          L&apos;outil a été conçu pour rester simple d&apos;accès tout en offrant un niveau de
          profondeur suffisant pour un travail sérieux. Il s&apos;adresse autant aux personnes
          qui découvrent la numérologie qu&apos;aux praticiens qui souhaitent professionnaliser
          leur approche.
        </p>

        <div className="audience-grid">
          <div className="audience-card">
            <h3>Exploration personnelle</h3>
            <p>
              Si tu veux un regard structuré sur ton chemin de vie, tes schémas récurrents
              et les grandes phases qui se dessinent, sans te perdre dans des calculs ou des
              interprétations contradictoires.
            </p>
          </div>

          <div className="audience-card">
            <h3>Professionnels de l&apos;accompagnement</h3>
            <p>
              Coaches, thérapeutes, praticiens énergétiques ou accompagnants qui souhaitent
              remettre à leurs clients un rapport clair, sérieux et bien rédigé, sans devoir
              réécrire chaque thème à partir de zéro.
            </p>
          </div>

          <div className="audience-card">
            <h3>Passionnés de numérologie</h3>
            <p>
              Si tu pratiques déjà la numérologie et que tu veux gagner du temps sur la mise en
              forme, croiser tes propres lectures avec une structure solide et enrichir tes
              analyses avec un support professionnel.
            </p>
          </div>
        </div>

        <div className="home-section-actions">
          <Link className="btn btn-secondary" to="/pricing">
            Voir les formules et tarifs
          </Link>
        </div>
      </section>


      {/* ====================================== */}
      {/* SECTION : Confiance des professionnels */}
      {/* ====================================== */}
      <section className="home-section pro-section">
        <h2>Déjà adopté par plus de 40 professionnels</h2>

        <p>
          Coaches, thérapeutes, énergéticiens et accompagnants en développement personnel
          utilisent déjà ce générateur pour produire des thèmes numérologiques clairs,
          structurés et cohérents — sans compromis sur la profondeur ou la qualité.
        </p>

        <div className="text-block">
          <p>
            ➤ <strong>Jusqu’à 3 à 5 heures gagnées</strong> par thème&nbsp;: là où un
            professionnel passait habituellement des heures à recalculer les données,
            structurer les sections et rédiger un document lisible, le générateur produit un
            thème complet, fluide et déjà mis en forme en quelques secondes.
          </p>

          <p>
            ➤ Une <strong>cohérence rédactionnelle stable</strong>&nbsp;: les professionnels
            n’ont plus à jongler entre différents supports, notes personnelles ou méthodes de
            calcul. Toutes les parties du thème suivent la même logique, la même exigence et
            la même qualité d’écriture.
          </p>

          <p>
            ➤ Un thème qui <strong>renforce la perception de sérieux</strong>&nbsp;: les
            clients reçoivent un document structuré, professionnel, imprimable ou partageable
            immédiatement, ce qui augmente la valeur perçue de chaque séance.
          </p>

          <p>
            ➤ Un support idéal pour les séances&nbsp;: certains praticiens l’utilisent comme
            fil conducteur pour guider leurs consultations, poser les bonnes questions et
            permettre au client d’avancer plus vite sur ses blocages, répétitions et
            dynamiques personnelles.
          </p>

          <p>
            ➤ Un outil qui <strong>fluidifie l’accompagnement</strong>&nbsp;: les utilisateurs
            témoignent d’une meilleure qualité d’échange, d’un gain de clarté pour leurs
            clients et d’un cadre qui professionnalise leur pratique au quotidien.
          </p>

          <p>
            En résumé, le générateur ne remplace pas la sensibilité du praticien — il lui
            donne un <strong>appui solide, rapide et fiable</strong>, pour se concentrer sur
            ce qui compte vraiment&nbsp;: l’humain, l’intuition et l’accompagnement.
          </p>
        </div>
      </section>

      {/* ====================================== */}
      {/* SECTION : Bandeau "Ils en parlent"    */}
      {/* ====================================== */}
      <section className="home-section highlight-strip">
        <div className="highlight-grid">
          <div className="highlight-item">
            <span className="highlight-number">40+</span>
            <span className="highlight-label">professionnels utilisateurs</span>
          </div>
          <div className="highlight-item">
            <span className="highlight-number">3–5 h</span>
            <span className="highlight-label">de travail économisées par thème</span>
          </div>
          <div className="highlight-item">
            <span className="highlight-number">120+</span>
            <span className="highlight-label">thèmes déjà générés</span>
          </div>
        </div>
      </section>

      {/* ============================ */}
      {/* SECTION : Histoire / créatrice */}
      {/* ============================ */}
      <section className="home-section">
        <div className="creator-card">
          <h2>L&apos;histoire derrière l&apos;outil</h2>
          <img
            src={creatorPhoto}
            alt="Créatrice du générateur"
            className="creator-photo"
          />

          <p className="creator-intro">
            Le premier thème généré avec ce système n&apos;était pas destiné à être vendu.
            Il a été créé pour une personne très proche, dans un moment de transition de vie
            où les repères habituels ne suffisaient plus. L&apos;intention de départ était
            simple&nbsp;: mettre à plat ce que la numérologie révélait, de manière claire,
            structurée et accessible.
          </p>

          <h3>Une praticienne avant d&apos;être un outil</h3>
          <p>
            Derrière le générateur, il y a d&apos;abord une approche humaine. L&apos;outil a
            été pensé pour soutenir des échanges réels, des discussions profondes et des prises
            de conscience, pas pour produire un document impersonnel de plus à stocker dans un
            dossier.
          </p>
          <p>
            Le thème n&apos;est ni une sentence, ni une étiquette. C&apos;est un miroir
            structuré qui t&apos;aide à voir plus clairement où tu en es, ce qui se répète,
            ce qui demande à évoluer et ce qui, au contraire, te porte depuis longtemps. C&apos;est
            cette exigence de clarté et de respect de la personne qui a guidé la conception
            de l&apos;outil.
          </p>

          {/* Timeline horizontale simple */}
          <div className="timeline">
            <div className="timeline-item">
              <span className="timeline-dot"></span>
              <span className="timeline-year">2012</span>
              <span className="timeline-text">Premiers thèmes rédigés à la main pour des proches.</span>
            </div>
            <div className="timeline-item">
              <span className="timeline-dot"></span>
              <span className="timeline-year">2016</span>
              <span className="timeline-text">Approfondissement de la pratique et tests en séance.</span>
            </div>
            <div className="timeline-item">
              <span className="timeline-dot"></span>
              <span className="timeline-year">2021</span>
              <span className="timeline-text">Structuration d&apos;un modèle de lecture stable.</span>
            </div>
            <div className="timeline-item">
              <span className="timeline-dot"></span>
              <span className="timeline-year">2024</span>
              <span className="timeline-text">Mise en forme numérique du thème complet.</span>
            </div>
            <div className="timeline-item">
              <span className="timeline-dot"></span>
              <span className="timeline-year">2025</span>
              <span className="timeline-text">Création du générateur automatisé.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================== */}
      {/* SECTION : Sans / Avec générateur      */}
      {/* ====================================== */}
      <section className="home-section comparison-section">
        <h2>Avant / après le générateur</h2>
        <p>
          Le générateur ne remplace pas ton intuition ni ton expérience. Il te fait simplement
          gagner un temps considérable et t&apos;offre une base de travail claire, stable et
          professionnelle.
        </p>

        <div className="comparison-table">
          <div className="comparison-column">
            <h3>Sans générateur</h3>
            <ul>
              <li>3 à 5 heures de calculs, de notes et de rédaction par thème.</li>
              <li>Structure différente d&apos;un document à l&apos;autre.</li>
              <li>Risque de redites, d&apos;oublis ou d&apos;incohérences.</li>
              <li>Support parfois difficile à transmettre ou à relire.</li>
            </ul>
          </div>
          <div className="comparison-column">
            <h3>Avec le générateur</h3>
            <ul>
              <li>Thème produit en quelques secondes à partir de l&apos;état civil.</li>
              <li>Structure stable, claire et immédiatement exploitable.</li>
              <li>Style rédactionnel cohérent d&apos;un thème à l&apos;autre.</li>
              <li>Document prêt à être imprimé, partagé ou utilisé en séance.</li>
            </ul>
          </div>
        </div>
        <div className="before-after-cta">
          <a href="/theme" className="cta-btn">
            Générer mon thème
          </a>
        </div>
      </section>
    </div>
  );
}
