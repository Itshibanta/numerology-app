// mcp-server/server.js
import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createRequire } from "module";

// On réutilise la logique depuis server/numerologyLogic.js (CommonJS)
const require = createRequire(import.meta.url);
const { generateNumerologyTheme } = require("../server/numerologyLogic.js");

// 1) MCP server de base
const mcpServer = new McpServer({
  name: "numerology-mcp-server",
  version: "0.1.0",
});

// 2) Déclaration du tool generate_theme
mcpServer.tool(
  "generate_theme",
  "Génère un thème numérologique complet à partir de l'état civil.",
  {
    prenom: z.string().min(1),
    secondPrenom: z.string().optional(),
    nomMarital: z.string().optional(),
    dateNaissance: z.string().min(1),
    lieuNaissance: z.string().optional(),
    heureNaissance: z.string().optional(),
  },
  async (args) => {
    const theme = await generateNumerologyTheme(args);

    return {
      content: [
        {
          type: "text",
          text: theme,
        },
      ],
      structuredContent: {
        theme,
      },
    };
  }
);

// 3) Transport HTTP pour le protocole MCP
const app = express();
app.use(express.json());

// 🔹 Petit endpoint de santé, juste pour toi
app.get("/", (req, res) => {
  res.send("MCP numerology server UP");
});

const transport = new StreamableHTTPServerTransport({
  path: "/mcp",
});

// Toutes les requêtes MCP passent par POST /mcp
app.post("/mcp", async (req, res) => {
  try {
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Erreur MCP /mcp :", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// GET /mcp -> non autorisé
app.get("/mcp", (req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed" },
    id: null,
  });
});

// 4) Connecter le MCP server au transport
async function setupServer() {
  await mcpServer.connect(transport);
}

setupServer().catch((err) => {
  console.error("Erreur setup MCP serveur :", err);
  process.exit(1);
});

const PORT = process.env.MCP_PORT || 4000;
app.listen(PORT, () => {
  console.log(`MCP numerology server listening on http://localhost:${PORT}/`);
});