const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "responses.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const HAMPER_OPTIONS = new Set([
  "Yes — I would definitely consider buying one",
  "Yes — if there are different options / budgets",
  "Maybe — I'd like to see what's inside",
  "No",
]);

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]\n");
}

function readResponses() {
  ensureDb();
  try {
    const rows = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeResponses(rows) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(rows, null, 2) + "\n");
}

function send(res, status, body, headers) {
  res.writeHead(status, headers);
  res.end(body);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(),
  });
}

function asStringArray(value, max) {
  if (!Array.isArray(value)) return [];
  const items = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return max ? items.slice(0, max) : items;
}

function validatePayload(body) {
  const preferredDays = asStringArray(body.preferredDays);
  const fruits = asStringArray(body.fruits, 5);
  const dryFruits = asStringArray(body.dryFruits);
  const chooseMoreOften = asStringArray(body.chooseMoreOften, 2);
  const diwaliHamper =
    typeof body.diwaliHamper === "string" && HAMPER_OPTIONS.has(body.diwaliHamper)
      ? body.diwaliHamper
      : "";
  const other = {
    fruitsOther: typeof body.fruitsOther === "string" ? body.fruitsOther.trim().slice(0, 120) : "",
    dryFruitsOther: typeof body.dryFruitsOther === "string" ? body.dryFruitsOther.trim().slice(0, 120) : "",
    chooseMoreOftenOther:
      typeof body.chooseMoreOftenOther === "string" ? body.chooseMoreOftenOther.trim().slice(0, 120) : "",
  };

  if (
    !preferredDays.length &&
    !fruits.length &&
    !dryFruits.length &&
    !diwaliHamper &&
    !chooseMoreOften.length
  ) {
    return { error: "Please answer at least one question." };
  }

  return {
    row: {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
      preferredDays,
      fruits,
      fruitsOther: other.fruitsOther,
      dryFruits,
      dryFruitsOther: other.dryFruitsOther,
      diwaliHamper,
      chooseMoreOften,
      chooseMoreOftenOther: other.chooseMoreOftenOther,
    },
  };
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) return send(res, 403, "Forbidden");
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, "Not found");
  }
  const ext = path.extname(filePath);
  send(res, 200, fs.readFileSync(filePath), {
    "Content-Type": MIME[ext] || "application/octet-stream",
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 200_000) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "OPTIONS") {
      return send(res, 204, "", corsHeaders());
    }

    if (req.method === "GET" && url.pathname === "/api/feedback") {
      return sendJson(res, 200, { responses: readResponses() });
    }

    if (req.method === "POST" && url.pathname === "/api/feedback") {
      const body = JSON.parse((await readBody(req)) || "{}");
      const result = validatePayload(body);
      if (result.error) return sendJson(res, 400, { error: result.error });
      const rows = readResponses();
      rows.push(result.row);
      writeResponses(rows);
      return sendJson(res, 201, { ok: true, id: result.row.id });
    }

    if (req.method === "GET") return serveStatic(req, res);
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    if (!res.headersSent) sendJson(res, 400, { error: err.message || "Invalid request" });
  }
});

ensureDb();
server.listen(PORT, () => {
  console.log("Society Essentials survey → http://localhost:" + PORT);
  console.log("Responses database     → " + DB_FILE);
});
