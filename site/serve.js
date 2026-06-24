// Serveur statique autonome pour prévisualiser le dossier site/ en local.
// Reproduit le comportement "pretty URLs" de Netlify (production) :
// /chemin/ -> /chemin/index.html, /chemin -> /chemin/index.html ou /chemin.html.
// Usage : node serve.js  (ou: npm run serve / npm run dev)
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 5500;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safeJoin(root, requestPath) {
  const resolved = path.normalize(path.join(root, requestPath));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function send404(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const base = safeJoin(ROOT, urlPath);

  if (!base) {
    res.writeHead(400);
    return res.end("Bad request");
  }

  const candidates = urlPath.endsWith("/")
    ? [path.join(base, "index.html")]
    : [base, path.join(base, "index.html"), `${base}.html`];

  const tryNext = (i) => {
    if (i >= candidates.length) return send404(res);
    const candidate = candidates[i];
    fs.stat(candidate, (err, stat) => {
      if (err) return tryNext(i + 1);
      if (stat.isDirectory()) {
        const indexFile = path.join(candidate, "index.html");
        return fs.stat(indexFile, (e2) => {
          if (e2) return tryNext(i + 1);
          fs.readFile(indexFile, (e3, data) => {
            if (e3) return tryNext(i + 1);
            res.writeHead(200, { "Content-Type": MIME[".html"] });
            res.end(data);
          });
        });
      }
      fs.readFile(candidate, (e4, data) => {
        if (e4) return tryNext(i + 1);
        const ext = path.extname(candidate).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
      });
    });
  };

  tryNext(0);
});

server.listen(PORT, () => {
  console.log(`Clés des Nombres — preview locale sur http://localhost:${PORT}/`);
});
