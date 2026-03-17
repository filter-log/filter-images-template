import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE_NAME = "filter_upload_session";
const SESSION_TTL_SECONDS = Number(process.env.UPLOAD_SESSION_TTL_SECONDS || 60 * 60 * 12);

export function verifyPassword(inputPassword) {
  const expected = process.env.UPLOAD_PASSWORD;

  if (!expected) {
    throw new Error("UPLOAD_PASSWORD is not configured.");
  }

  if (typeof inputPassword !== "string") {
    return false;
  }

  const actualDigest = createHash("sha256").update(inputPassword, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

export function createSessionCookie() {
  const secret = getSessionSecret();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const expiresEpoch = Math.floor(Date.parse(expiresAt) / 1000);
  const payload = `${expiresEpoch}`;
  const signature = sign(payload, secret);
  const token = `${payload}.${signature}`;

  return {
    expiresAt,
    value: serializeCookie(token, SESSION_TTL_SECONDS),
  };
}

export function verifySessionToken(cookies) {
  const secret = getSessionSecret();
  const token = cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    return { valid: false, expiresAt: null };
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return { valid: false, expiresAt: null };
  }

  const expectedSignature = sign(payload, secret);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return { valid: false, expiresAt: null };
  }

  const expiresEpoch = Number(payload);

  if (!Number.isFinite(expiresEpoch) || expiresEpoch <= Math.floor(Date.now() / 1000)) {
    return { valid: false, expiresAt: null };
  }

  return {
    valid: true,
    expiresAt: new Date(expiresEpoch * 1000).toISOString(),
  };
}

export function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const [name, ...rest] = part.split("=");
      if (!name || rest.length === 0) {
        return accumulator;
      }
      accumulator[name] = decodeURIComponent(rest.join("="));
      return accumulator;
    }, {});
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; ${cookiePolicy()}`;
}

function serializeCookie(token, maxAgeSeconds) {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=${maxAgeSeconds}; ${cookiePolicy()}`;
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function getSessionSecret() {
  const secret = process.env.UPLOAD_SESSION_SECRET || process.env.UPLOAD_PASSWORD;

  if (!secret) {
    throw new Error("UPLOAD_SESSION_SECRET or UPLOAD_PASSWORD must be configured.");
  }

  return secret;
}

function cookiePolicy() {
  const origin = process.env.UPLOAD_PORTAL_ORIGIN || "";
  const isLocalhost = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
  return isLocalhost ? "SameSite=Lax" : "SameSite=None; Secure";
}
