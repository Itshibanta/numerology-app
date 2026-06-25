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
                <a href="/signification-chemin-de-vie/">Chemin de Vie</a>
                <div className="dropdown">
                  <a href="/signification-chemin-de-vie/" className="dropdown-title">Signification du chemin de vie</a>
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
              </li>
              <li className="has-dropdown">
                <a href="/signification-annee-personnelle/">Année Personnelle</a>
                <div className="dropdown">
                  <a href="/signification-annee-personnelle/" className="dropdown-title">Signification de l'année personnelle</a>
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
              </li>
              <li className="has-dropdown">
                <a href="/nombres-maitres/">Nombres Maîtres</a>
                <div className="dropdown">
                  <a href="/nombres-maitres/" className="dropdown-title">Signification des nombres maîtres</a>
                  <div className="dropdown-grid">
                    <a href="/nombre-maitre-11/">Nombre maître 11</a>
                    <a href="/nombre-maitre-22/">Nombre maître 22</a>
                    <a href="/nombre-maitre-33/">Nombre maître 33</a>
                    <a href="/nombre-maitre-44/">Nombre maître 44</a>
                  </div>
                </div>
              </li>
              <li className="has-dropdown">
                <a href="/nombres-karmiques/">Nombres Karmiques</a>
                <div className="dropdown">
                  <a href="/nombres-karmiques/" className="dropdown-title">Signification des nombres karmiques</a>
                  <div className="dropdown-grid">
                    <a href="/nombre-karmique-13/">Nombre karmique 13</a>
                    <a href="/nombre-karmique-14/">Nombre karmique 14</a>
                    <a href="/nombre-karmique-16/">Nombre karmique 16</a>
                    <a href="/nombre-karmique-19/">Nombre karmique 19</a>
                  </div>
                </div>
              </li>
              <li className="nav-account-wrap">
                <Link to="/theme-numerologique" className="nav-cta">Mon Thème</Link>
                <Link to="/signin" className="nav-account">Mon compte</Link>
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
          <div className="footer-col"><h4>Explorer</h4><ul>
            <li><a href="/signification-chemin-de-vie/">Chemin de Vie</a></li>
            <li><a href="/signification-annee-personnelle/">Année Personnelle</a></li>
            <li><a href="/nombres-maitres/">Nombres Maîtres</a></li>
            <li><a href="/nombres-karmiques/">Nombres Karmiques</a></li>
          </ul></div>
          <div className="footer-col"><h4>Blog</h4><ul>
            <li><a href="/blog-numerologique/">Tous les articles</a></li>
            <li><a href="/exemple-theme-numerologique/">Exemple de thème</a></li>
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
