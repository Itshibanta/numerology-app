import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Charge le design system du site SEO (servi à la racine du déploiement combiné).
// Chargé en dernier -> les classes premium (.btn, .card, .hero-section, .form-card…)
// font autorité pour les pages app re-skinnées.
const siteTheme = document.createElement("link");
siteTheme.rel = "stylesheet";
siteTheme.href = "/styles.css";
document.head.appendChild(siteTheme);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
