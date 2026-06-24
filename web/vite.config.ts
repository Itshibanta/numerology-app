import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// L'app React est servie sous /app/ (assets), tandis que le site statique SEO
// occupe la racine. Le routeur lit l'URL réelle (ex: /theme-numerologique).
export default defineConfig({
  base: "/app/",
  plugins: [react()],
});
