import http from "node:http";

import { createOOREPClient } from "oorep-mcp";

const port = Number(process.env.PORT || 5055);
const client = createOOREPClient({
  baseUrl: process.env.OOREP_MCP_BASE_URL || "https://www.oorep.com",
  timeoutMs: Number(process.env.OOREP_MCP_TIMEOUT_MS || 30000),
  cacheTtlMs: Number(process.env.OOREP_MCP_CACHE_TTL_MS || 300000),
  defaultRepertory: process.env.OOREP_MCP_DEFAULT_REPERTORY || "publicum",
  defaultMateriaMedica: process.env.OOREP_MCP_DEFAULT_MATERIA_MEDICA || "boericke",
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, payload) {
  res.writeHead(status, {"Content-Type": "application/json"});
  res.end(JSON.stringify(payload));
}

async function route(path, payload) {
  if (path === "/health") {
    return {status: "ok"};
  }
  if (path === "/search-repertory") {
    return client.searchRepertory({
      symptom: payload.symptom,
      repertory: payload.repertory,
      minWeight: payload.minWeight,
      maxResults: payload.maxResults,
      includeRemedyStats: payload.includeRemedyStats,
    });
  }
  if (path === "/search-materia-medica") {
    return client.searchMateriaMedica({
      symptom: payload.symptom,
      materiamedica: payload.materiamedica,
      remedy: payload.remedy,
      maxResults: payload.maxResults,
    });
  }
  if (path === "/get-remedy-info") {
    const remedy = await client.getRemedyInfo({remedy: payload.remedy});
    return {remedy};
  }
  if (path === "/list-repertories") {
    return {repertories: await client.listRepertories({language: payload.language})};
  }
  if (path === "/list-materia-medicas") {
    return {materiaMedicas: await client.listMateriaMedicas({language: payload.language})};
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "POST" && req.url !== "/health") {
      send(res, 405, {error: "method_not_allowed"});
      return;
    }
    const payload = req.url === "/health" ? {} : await readJson(req);
    const result = await route(req.url, payload);
    if (result === null) {
      send(res, 404, {error: "not_found"});
      return;
    }
    send(res, 200, result);
  } catch (error) {
    send(res, 502, {error: "oorep_failed", message: error?.message || "OOREP request failed"});
  }
});

process.on("SIGTERM", () => {
  client.destroy();
  server.close(() => process.exit(0));
});

server.listen(port, "0.0.0.0");
