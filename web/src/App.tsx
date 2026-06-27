import { useState } from "react";
import { Link, Routes, Route } from "react-router-dom";
import "./App.css";

import ThemeGeneratorPage from "./pages/ThemeGeneratorPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ProfilePage from "./pages/ProfilePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";

// Header + footer répliqués à l'identique du site statique (site/) pour une
// cohérence visuelle totale. Liens vers le site SEO = <a href> (pleine page),
// liens internes app = <Link> (SPA). Aucune logique de génération touchée.

export default function App() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-root">
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className="site-logo">Clés <span>Des Nombres</span></a>
          <nav aria-label="Navigation principale">
            <ul className={navOpen ? "nav-links open" : "nav-links"} id="navLinks">
              <li className="has-dropdown">
                <a href="/decouvrir-la-numerologie/">Découvrir la Numérologie</a>
                <div className="dropdown dropdown--discover">
            <span className="dropdown-title dropdown-title--arbre">Arbre de Vie</span>
                  <div className="discover-item">
                    <a href="/signification-chemin-de-vie/" className="discover-link">Chemin de Vie<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Chemins de vie</span>
                      <div className="dropdown-grid">
                        <a href="/chemin-de-vie-1/">Chemin de vie 1</a>
                        <a href="/chemin-de-vie-2/">Chemin de vie 2</a>
                        <a href="/chemin-de-vie-3/">Chemin de vie 3</a>
                        <a href="/chemin-de-vie-4/">Chemin de vie 4</a>
                        <a href="/chemin-de-vie-5/">Chemin de vie 5</a>
                        <a href="/chemin-de-vie-6/">Chemin de vie 6</a>
                        <a href="/chemin-de-vie-7/">Chemin de vie 7</a>
                        <a href="/chemin-de-vie-8/">Chemin de vie 8</a>
                        <a href="/chemin-de-vie-9/">Chemin de vie 9</a>
                      </div>
                      <span className="dropdown-sub">Chemins de vie maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/chemin-de-vie-11/">Chemin de vie 11</a>
                        <a href="/chemin-de-vie-22/">Chemin de vie 22</a>
                        <a href="/chemin-de-vie-33/">Chemin de vie 33</a>
                        <a href="/chemin-de-vie-44/">Chemin de vie 44</a>
                      </div>
                    </div>
                  </div>
                  <div className="discover-item">
                    <a href="/signification-annee-personnelle/" className="discover-link">Année Personnelle<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Années personnelles</span>
                      <div className="dropdown-grid">
                        <a href="/annee-personnelle-1/">Année personnelle 1</a>
                        <a href="/annee-personnelle-2/">Année personnelle 2</a>
                        <a href="/annee-personnelle-3/">Année personnelle 3</a>
                        <a href="/annee-personnelle-4/">Année personnelle 4</a>
                        <a href="/annee-personnelle-5/">Année personnelle 5</a>
                        <a href="/annee-personnelle-6/">Année personnelle 6</a>
                        <a href="/annee-personnelle-7/">Année personnelle 7</a>
                        <a href="/annee-personnelle-8/">Année personnelle 8</a>
                        <a href="/annee-personnelle-9/">Année personnelle 9</a>
                      </div>
                      <span className="dropdown-sub">Années personnelles maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/annee-personnelle-11/">Année personnelle 11</a>
                        <a href="/annee-personnelle-22/">Année personnelle 22</a>
                        <a href="/annee-personnelle-33/">Année personnelle 33</a>
                        <a href="/annee-personnelle-44/">Année personnelle 44</a>
                      </div>
                    </div>
                  </div>
                  <div className="discover-item">
                    <a href="/signification-nombre-expression/" className="discover-link">Nombre d'Expression<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Nombres d'expression</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-expression-1/">Nombre d'expression 1</a>
                        <a href="/nombre-expression-2/">Nombre d'expression 2</a>
                        <a href="/nombre-expression-3/">Nombre d'expression 3</a>
                        <a href="/nombre-expression-4/">Nombre d'expression 4</a>
                        <a href="/nombre-expression-5/">Nombre d'expression 5</a>
                        <a href="/nombre-expression-6/">Nombre d'expression 6</a>
                        <a href="/nombre-expression-7/">Nombre d'expression 7</a>
                        <a href="/nombre-expression-8/">Nombre d'expression 8</a>
                        <a href="/nombre-expression-9/">Nombre d'expression 9</a>
                      </div>
                      <span className="dropdown-sub">Nombres d'expression maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-expression-11/">Nombre d'expression 11</a>
                        <a href="/nombre-expression-22/">Nombre d'expression 22</a>
                        <a href="/nombre-expression-33/">Nombre d'expression 33</a>
                        <a href="/nombre-expression-44/">Nombre d'expression 44</a>
                      </div>
                    </div>
                  </div>
                  <div className="discover-item">
                    <a href="/signification-nombre-ressource/" className="discover-link">Nombre Ressource<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Nombres ressource</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-ressource-1/">Nombre ressource 1</a>
                        <a href="/nombre-ressource-2/">Nombre ressource 2</a>
                        <a href="/nombre-ressource-3/">Nombre ressource 3</a>
                        <a href="/nombre-ressource-4/">Nombre ressource 4</a>
                        <a href="/nombre-ressource-5/">Nombre ressource 5</a>
                        <a href="/nombre-ressource-6/">Nombre ressource 6</a>
                        <a href="/nombre-ressource-7/">Nombre ressource 7</a>
                        <a href="/nombre-ressource-8/">Nombre ressource 8</a>
                        <a href="/nombre-ressource-9/">Nombre ressource 9</a>
                      </div>
                      <span className="dropdown-sub">Nombres ressource maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-ressource-11/">Nombre ressource 11</a>
                        <a href="/nombre-ressource-22/">Nombre ressource 22</a>
                        <a href="/nombre-ressource-33/">Nombre ressource 33</a>
                        <a href="/nombre-ressource-44/">Nombre ressource 44</a>
                      </div>
                    </div>
                  </div>
                  <div className="discover-item">
                    <a href="/signification-nombre-actif/" className="discover-link">Nombre Actif<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Nombres actifs</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-actif-1/">Nombre actif 1</a>
                        <a href="/nombre-actif-2/">Nombre actif 2</a>
                        <a href="/nombre-actif-3/">Nombre actif 3</a>
                        <a href="/nombre-actif-4/">Nombre actif 4</a>
                        <a href="/nombre-actif-5/">Nombre actif 5</a>
                        <a href="/nombre-actif-6/">Nombre actif 6</a>
                        <a href="/nombre-actif-7/">Nombre actif 7</a>
                        <a href="/nombre-actif-8/">Nombre actif 8</a>
                        <a href="/nombre-actif-9/">Nombre actif 9</a>
                      </div>
                      <span className="dropdown-sub">Nombres actifs maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-actif-11/">Nombre actif 11</a>
                        <a href="/nombre-actif-22/">Nombre actif 22</a>
                        <a href="/nombre-actif-33/">Nombre actif 33</a>
                        <a href="/nombre-actif-44/">Nombre actif 44</a>
                      </div>
                    </div>
                  </div>
                  <div className="discover-item">
                    <a href="/signification-nombre-elan-spirituel/" className="discover-link">Nombre d'Élan Spirituel<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Nombres d'élan spirituel</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-elan-spirituel-1/">Élan spirituel 1</a>
                        <a href="/nombre-elan-spirituel-2/">Élan spirituel 2</a>
                        <a href="/nombre-elan-spirituel-3/">Élan spirituel 3</a>
                        <a href="/nombre-elan-spirituel-4/">Élan spirituel 4</a>
                        <a href="/nombre-elan-spirituel-5/">Élan spirituel 5</a>
                        <a href="/nombre-elan-spirituel-6/">Élan spirituel 6</a>
                        <a href="/nombre-elan-spirituel-7/">Élan spirituel 7</a>
                        <a href="/nombre-elan-spirituel-8/">Élan spirituel 8</a>
                        <a href="/nombre-elan-spirituel-9/">Élan spirituel 9</a>
                      </div>
                      <span className="dropdown-sub">Nombres d'élan spirituel maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-elan-spirituel-11/">Élan spirituel 11</a>
                        <a href="/nombre-elan-spirituel-22/">Élan spirituel 22</a>
                        <a href="/nombre-elan-spirituel-33/">Élan spirituel 33</a>
                        <a href="/nombre-elan-spirituel-44/">Élan spirituel 44</a>
                      </div>
                    </div>
                  </div>
                  <div className="discover-item">
                    <a href="/signification-nombre-hereditaire/" className="discover-link">Nombre Héréditaire<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Nombres héréditaires</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-hereditaire-1/">Nombre héréditaire 1</a>
                        <a href="/nombre-hereditaire-2/">Nombre héréditaire 2</a>
                        <a href="/nombre-hereditaire-3/">Nombre héréditaire 3</a>
                        <a href="/nombre-hereditaire-4/">Nombre héréditaire 4</a>
                        <a href="/nombre-hereditaire-5/">Nombre héréditaire 5</a>
                        <a href="/nombre-hereditaire-6/">Nombre héréditaire 6</a>
                        <a href="/nombre-hereditaire-7/">Nombre héréditaire 7</a>
                        <a href="/nombre-hereditaire-8/">Nombre héréditaire 8</a>
                        <a href="/nombre-hereditaire-9/">Nombre héréditaire 9</a>
                      </div>
                      <span className="dropdown-sub">Nombres héréditaires maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-hereditaire-11/">Nombre héréditaire 11</a>
                        <a href="/nombre-hereditaire-22/">Nombre héréditaire 22</a>
                        <a href="/nombre-hereditaire-33/">Nombre héréditaire 33</a>
                        <a href="/nombre-hereditaire-44/">Nombre héréditaire 44</a>
                      </div>
                    </div>
                  </div>
                  <div className="discover-item">
                    <a href="/signification-nombre-equilibre/" className="discover-link">Nombre d'Équilibre<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Nombres d'équilibre</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-equilibre-1/">Nombre d'équilibre 1</a>
                        <a href="/nombre-equilibre-2/">Nombre d'équilibre 2</a>
                        <a href="/nombre-equilibre-3/">Nombre d'équilibre 3</a>
                        <a href="/nombre-equilibre-4/">Nombre d'équilibre 4</a>
                        <a href="/nombre-equilibre-5/">Nombre d'équilibre 5</a>
                        <a href="/nombre-equilibre-6/">Nombre d'équilibre 6</a>
                        <a href="/nombre-equilibre-7/">Nombre d'équilibre 7</a>
                        <a href="/nombre-equilibre-8/">Nombre d'équilibre 8</a>
                        <a href="/nombre-equilibre-9/">Nombre d'équilibre 9</a>
                      </div>
                      <span className="dropdown-sub">Nombres d'équilibre maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-equilibre-11/">Nombre d'équilibre 11</a>
                        <a href="/nombre-equilibre-22/">Nombre d'équilibre 22</a>
                        <a href="/nombre-equilibre-33/">Nombre d'équilibre 33</a>
                        <a href="/nombre-equilibre-44/">Nombre d'équilibre 44</a>
                      </div>
                    </div>
                  </div>
                  <div className="discover-item">
                    <a href="/signification-nombre-realisation/" className="discover-link">Nombre de Réalisation<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Nombres de réalisation</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-realisation-1/">Nombre de réalisation 1</a>
                        <a href="/nombre-realisation-2/">Nombre de réalisation 2</a>
                        <a href="/nombre-realisation-3/">Nombre de réalisation 3</a>
                        <a href="/nombre-realisation-4/">Nombre de réalisation 4</a>
                        <a href="/nombre-realisation-5/">Nombre de réalisation 5</a>
                        <a href="/nombre-realisation-6/">Nombre de réalisation 6</a>
                        <a href="/nombre-realisation-7/">Nombre de réalisation 7</a>
                        <a href="/nombre-realisation-8/">Nombre de réalisation 8</a>
                        <a href="/nombre-realisation-9/">Nombre de réalisation 9</a>
                      </div>
                      <span className="dropdown-sub">Nombres de réalisation maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-realisation-11/">Nombre de réalisation 11</a>
                        <a href="/nombre-realisation-22/">Nombre de réalisation 22</a>
                        <a href="/nombre-realisation-33/">Nombre de réalisation 33</a>
                        <a href="/nombre-realisation-44/">Nombre de réalisation 44</a>
                      </div>
                    </div>
                  </div>
                  <div className="discover-item">
                    <a href="/signification-nombre-moi-intime/" className="discover-link">Nombre Moi Intime<span className="discover-caret" aria-hidden="true">›</span></a>
                    <div className="flyout">
                      <span className="dropdown-sub">Nombres Moi Intime</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-moi-intime-1/">Nombre Moi Intime 1</a>
                        <a href="/nombre-moi-intime-2/">Nombre Moi Intime 2</a>
                        <a href="/nombre-moi-intime-3/">Nombre Moi Intime 3</a>
                        <a href="/nombre-moi-intime-4/">Nombre Moi Intime 4</a>
                        <a href="/nombre-moi-intime-5/">Nombre Moi Intime 5</a>
                        <a href="/nombre-moi-intime-6/">Nombre Moi Intime 6</a>
                        <a href="/nombre-moi-intime-7/">Nombre Moi Intime 7</a>
                        <a href="/nombre-moi-intime-8/">Nombre Moi Intime 8</a>
                        <a href="/nombre-moi-intime-9/">Nombre Moi Intime 9</a>
                      </div>
                      <span className="dropdown-sub">Nombres Moi Intime maîtres</span>
                      <div className="dropdown-grid">
                        <a href="/nombre-moi-intime-11/">Nombre Moi Intime 11</a>
                        <a href="/nombre-moi-intime-22/">Nombre Moi Intime 22</a>
                        <a href="/nombre-moi-intime-33/">Nombre Moi Intime 33</a>
                        <a href="/nombre-moi-intime-44/">Nombre Moi Intime 44</a>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              <li className="has-dropdown">
                <a href="/decors-de-vie/">Les Grands Axes</a>
                <div className="dropdown dropdown--axes">
                  <a href="/decors-de-vie/" className="dropdown-title">Décors de Vie — Les Cycles</a>
                  <div className="dropdown-grid dropdown-grid--col">
                    <a href="/decors-de-vie/#cycle-formatif">Le Cycle Formatif</a>
                    <a href="/decors-de-vie/#cycle-productif">Le Cycle Productif</a>
                    <a href="/decors-de-vie/#cycle-de-moisson">Le Cycle de Moisson</a>
                  </div>
                  <a href="/theatre-de-vie/" className="dropdown-title">Théâtre de Vie — Les 4 Actes</a>
                  <div className="dropdown-grid dropdown-grid--col">
                    <a href="/theatre-de-vie/#acte-1">Acte 1 — La Clé d'Évolution</a>
                    <a href="/theatre-de-vie/#acte-2">Acte 2 — L'Axe d'Évolution</a>
                    <a href="/theatre-de-vie/#acte-3">Acte 3 — La Deuxième Chance</a>
                    <a href="/theatre-de-vie/#acte-4">Acte 4 — Préparation à la future incarnation</a>
                  </div>
                  <a href="/lecon-d-ame/" className="dropdown-title">Leçon d'Âme</a>
                  <a href="/les-defis/" className="dropdown-title">Les Défis</a>
                  <div className="dropdown-grid dropdown-grid--col">
                    <a href="/les-defis/#defi-mineur-1">1er Défi Mineur</a>
                    <a href="/les-defis/#defi-mineur-2">2e Défi Mineur</a>
                    <a href="/les-defis/#defi-majeur">Défi Majeur</a>
                  </div>
                </div>
              </li>
              <li className="has-dropdown">
                <a href="/nombres-maitres/">Nombres Spéciaux</a>
                <div className="dropdown">
                  <a href="/nombres-maitres/" className="dropdown-title">Nombres Maître</a>
                  <div className="dropdown-grid">
                    <a href="/nombre-maitre-11/">Nombre maître 11</a>
                    <a href="/nombre-maitre-22/">Nombre maître 22</a>
                    <a href="/nombre-maitre-33/">Nombre maître 33</a>
                    <a href="/nombre-maitre-44/">Nombre maître 44</a>
                  </div>
                  <a href="/nombres-karmiques/" className="dropdown-title">Nombres Karmiques</a>
                  <div className="dropdown-grid">
                    <a href="/nombre-karmique-13/">Nombre karmique 13</a>
                    <a href="/nombre-karmique-14/">Nombre karmique 14</a>
                    <a href="/nombre-karmique-16/">Nombre karmique 16</a>
                    <a href="/nombre-karmique-19/">Nombre karmique 19</a>
                  </div>
                </div>
              </li>
              <li className="has-dropdown">
                <Link to="/theme-numerologique">Mon Thème</Link>
                <div className="dropdown dropdown--compact">
                  <div className="dropdown-grid dropdown-grid--col">
                    <Link to="/theme-numerologique">Découvrir mon thème</Link>
                    <a href="/theme-numerologique-gratuit/">Découvrir mon thème gratuit</a>
                    <Link to="/signin">Mon compte</Link>
                  </div>
                </div>
              </li>
            </ul>
            <button className="nav-toggle" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">
              <span></span><span></span><span></span>
            </button>
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/theme-numerologique" element={<ThemeGeneratorPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <a href="/" className="site-logo">Clés <span>Des Nombres</span></a>
            <p>L'analyse numérologique personnalisée la plus précise en France.</p>
          </div>
          <div className="footer-col footer-col--explore"><h4>Explorer</h4><ul>
            <li><a href="/decouvrir-la-numerologie/">Découvrir la numérologie</a></li>
            <li><a href="/dictionnaire-numerologie/">Dictionnaire de la numérologie</a></li>
            <li><a href="/signification-chemin-de-vie/">Chemin de Vie</a></li>
            <li><a href="/signification-annee-personnelle/">Année Personnelle</a></li>
            <li><a href="/signification-nombre-expression/">Nombre d'Expression</a></li>
            <li><a href="/signification-nombre-ressource/">Nombre Ressource</a></li>
            <li><a href="/signification-nombre-actif/">Nombre Actif</a></li>
            <li><a href="/signification-nombre-elan-spirituel/">Nombre d'Élan Spirituel</a></li>
            <li><a href="/signification-nombre-hereditaire/">Nombre Héréditaire</a></li>
            <li><a href="/signification-nombre-equilibre/">Nombre d'Équilibre</a></li>
            <li><a href="/signification-nombre-realisation/">Nombre de Réalisation</a></li>
            <li><a href="/signification-nombre-moi-intime/">Nombre Moi Intime</a></li>
            <li><a href="/nombres-maitres/">Nombres Maître</a></li>
            <li><a href="/nombres-karmiques/">Nombres Karmiques</a></li>
          </ul></div>
          <div className="footer-col"><h4>Blog</h4><ul>
            <li><a href="/blog-numerologique/">Tous les articles</a></li>
            <li><a href="/exemple-theme-numerologique/">Exemple de thème</a></li>
            <li><a href="/a-propos/">À propos</a></li>
          </ul></div>
          <div className="footer-col"><h4>Légal</h4><ul>
            <li><a href="/contact/">Contact</a></li>
            <li><a href="/mentions-legales/">Mentions légales</a></li>
            <li><a href="/cgv/">CGV</a></li>
            <li><a href="/politique-confidentialite/">Confidentialité</a></li>
          </ul></div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Clés Des Nombres</span>
          <a href="/theme-numerologique/">Obtenir mon thème numérologique →</a>
        </div>
      </footer>
    </div>
  );
}
