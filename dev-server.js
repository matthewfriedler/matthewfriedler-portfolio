// Local preview server — zero dependencies, plain Node (18+).
// Mimics what Vercel does in production closely enough to test locally:
//   - serves static files, with clean URLs (/about -> about.html)
//   - runs api/*.js as functions, with req.body parsed and res.status()/res.json()
// Usage: node dev-server.js        (then open http://localhost:3000)
//        PORT=4000 node dev-server.js
// Reads .env (if present) so RESEND_API_KEY works locally.

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

// Minimal .env loader (KEY=value lines; no quotes handling beyond stripping).
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// Files that exist in the repo but are not part of the public site.
const PRIVATE = new Set(["dev-server.js", "vercel.json", ".env", ".env.example", "CLAUDE.md", "README.md"]);

function sendFile(res, file, status = 200) {
  res.writeHead(status, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

function resolveStatic(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const rel = clean === "/" ? "index.html" : clean.replace(/^[/\\]/, "");
  if (PRIVATE.has(rel) || rel.startsWith(".") || rel.startsWith("api")) return null;
  const candidates = [rel, rel + ".html"];
  for (const c of candidates) {
    const full = path.join(ROOT, c);
    if (full.startsWith(ROOT) && fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}

async function runFunction(req, res, file) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  req.body = raw;
  if ((req.headers["content-type"] || "").includes("application/json")) {
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
  }
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
    return res;
  };
  delete require.cache[require.resolve(file)]; // pick up edits without restart
  const handler = require(file);
  await (handler.default || handler)(req, res);
}

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    try {
      if (pathname.startsWith("/api/")) {
        const file = path.join(ROOT, pathname.replace(/\/$/, "") + ".js");
        if (file.startsWith(path.join(ROOT, "api")) && fs.existsSync(file)) {
          await runFunction(req, res, file);
        } else {
          res.writeHead(404).end("Not found");
        }
      } else if (pathname.endsWith(".html")) {
        // Vercel cleanUrls redirects /about.html -> /about
        res.writeHead(308, { Location: pathname.replace(/(index)?\.html$/, "") || "/" }).end();
      } else {
        const file = resolveStatic(pathname);
        if (file) sendFile(res, file);
        else res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      }
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end("Server error");
    }
    console.log(`${req.method} ${pathname} -> ${res.statusCode}`);
  })
  .listen(PORT, () => console.log(`Preview: http://localhost:${PORT}`));
