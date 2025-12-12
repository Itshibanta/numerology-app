import { Link, Routes, Route } from "react-router-dom";
import "./App.css";

import HomePage from "./pages/HomePage";
import PricingPage from "./pages/PricingPage";
import ThemeGeneratorPage from "./pages/ThemeGeneratorPage";
import AboutPage from "./pages/AboutPage";
import LegalPage from "./pages/LegalPage";
import PrivacyPage from "./pages/PrivacyPage";
import ContactPage from "./pages/ContactPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ProfilePage from "./pages/ProfilePage";

import logo from "./assets/logo.png";

function isLoggedIn(): boolean {
  const stored = localStorage.getItem("user");
  if (!stored) return false;
  try {
    const u = JSON.parse(stored);
    return !!(u && typeof u.email === "string" && u.email.trim().length > 0);
  } catch {
    return false;
  }
}

export default function App() {
  const logged = isLoggedIn();

  return (
    <div className="app-root">
      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <Link to="/" aria-label="Accueil">
              <img src={logo} alt="Numerology App" />
            </Link>
          </div>

          <nav className="nav-links">
            <Link to="/">Accueil</Link>
            <Link to="/pricing">Tarifs</Link>
            <Link to="/theme">Générateur</Link>
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
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/theme" element={<ThemeGeneratorPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>

      <footer className="site-footer app-container">
        <nav className="footer-links">
          <Link to="/about">À propos</Link>
          <Link to="/privacy">Politique de confidentialité</Link>
          <Link to="/legal">Mentions légales</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <p className="footer-note">
          © {new Date().getFullYear()} — Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
