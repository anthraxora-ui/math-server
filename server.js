import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
// NOTE: Sometimes the import path changes in newer versions. 
// If this still fails, we will try removing the ".js" extension, 
// but for now, "type": "module" in package.json usually fixes it.
import { registerAppTool, registerAppResource } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

// YOUR VERCEL APP LINK
const MY_APP_URL = "https://handwring-app.vercel.app";

const server = new McpServer({
  name: "handwriting-math",
  version: "1.0.0"
});

// 1. REGISTER UI
registerAppResource(
  server,
  "math-widget",
  "ui://widget/math.html",
  {},
  async () => ({
    contents: [{
      uri: "ui://widget/math.html",
      mimeType: "text/html",
      text: `<iframe src="${MY_APP_URL}" style="width:100%; height:100%; border:none; display:block;"></iframe>`
    }]
  })
);

// 2. REGISTER TOOL
registerAppTool(
  server,
  "render_math",
  {
    title: "Render Handwritten Math",
    description: "Call this tool whenever the user asks for a math solution. Do not output text, just use this tool to render the equation.",
    inputSchema: {
      latex: z.string().describe("The math equation in LaTeX format"),
    },
    _meta: {
      ui: { resourceUri: "ui://widget/math.html" }
    }
  },
  async (args) => {
    return {
      content: [{ type: "text", text: "Rendering equation..." }],
      structuredContent: { latex: args.latex }
    };
  }
);

// 3. START SERVER
const httpServer = createServer(async (req, res) => {
  // CORS for ChatGPT
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(200); res.end(); return;
  }

  try {
    // Handle MCP Requests
    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error(err);
    res.writeHead(500).end("Server Error");
  }
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
