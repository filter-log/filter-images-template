import { clearSessionCookie, createSessionCookie, parseCookies, verifyPassword, verifySessionToken } from "../lib/auth.js";

const activeRepo = process.env.ACTIVE_IMAGE_REPO;

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    try {
      const session = readSession(req);
      return res.status(200).json({
        ok: true,
        authenticated: Boolean(session.valid),
        expiresAt: session.expiresAt || null,
        repository: activeRepo || null,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message || "Auth status check failed." });
    }
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.status(200).json({ ok: true, authenticated: false });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await parseJsonBody(req);
    const password = body?.password;

    if (!verifyPassword(password)) {
      res.setHeader("Set-Cookie", clearSessionCookie());
      return res.status(401).json({ error: "업로드 암호가 올바르지 않습니다." });
    }

    const sessionCookie = createSessionCookie();
    res.setHeader("Set-Cookie", sessionCookie.value);
    return res.status(200).json({
      ok: true,
      authenticated: true,
      expiresAt: sessionCookie.expiresAt,
      repository: activeRepo || null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Authentication failed." });
  }
}

function readSession(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifySessionToken(cookies);
}

function setCorsHeaders(req, res) {
  const origin = process.env.UPLOAD_PORTAL_ORIGIN || req.headers.origin || "";

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}
