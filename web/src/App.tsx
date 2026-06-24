import { Link, Routes, Route } from "react-router-dom";
import "./App.css";

import ThemeGeneratorPage from "./pages/ThemeGeneratorPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ProfilePage from "./pages/ProfilePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";

import logo from "./assets/logo.png";

// Les pages de contenu/SEO (accueil, silos, blog, légales) sont servies par le
// site statique à la racine. L'app React ne gère que les routes transactionnelles.
// -> Les liens vers le site statique sont des <a href> (navigation pleine page),
//    les liens internes à l'app restent des <Link> (navigation SPA).

function isLoggedIn(): boolean {
  const token = localStorage.getItem("auth_token");
  return !!token;
}

export default function App() {
  const logged = isLoggedIn();

  return (
    <div className="app-root">
      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <a href="/" aria-label="Accueil">
              <img src={logo} alt="Clés Des Nombres" />
            </a>
          </div>

          <nav className="nav-links">
            <a href="/">Accueil</a>
            <a href="/signification-chemin-de-vie/">Chemin de Vie</a>
            <a href="/blog-numerologique/">Blog</a>
            <Link to="/theme-numerologique">Mon thème</Link>
            {!logged ? (
              <Link to="/signin">Connexion</Link>
            ) : (
              <Link to="/profile">Mon profil</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="app-container">
        <Routes>
          <Route path="/theme-numerologique" element={<ThemeGeneratorPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </main>

      <footer className="site-footer app-container">
        <nav className="footer-links">
          <a href="/mentions-legales/">Mentions légales</a>
          <a href="/politique-confidentialite/">Confidentialité</a>
          <a href="/cgv/">CGV</a>
          <a href="/contact/">Contact</a>
        </nav>
        <p className="footer-note">
          © {new Date().getFullYear()} Clés Des Nombres — Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
