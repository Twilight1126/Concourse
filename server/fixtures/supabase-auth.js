import { generateKeyPairSync, sign } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const key = { ...publicKey.export({ format: "jwk" }), alg: "ES256", kid: "test-signing-key", key_ops: ["verify"] };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

export function signedToken(issuer, userId = "verified-account", overrides = {}) {
  const header = encode({ alg: "ES256", kid: key.kid, typ: "JWT" });
  const payload = encode({
    iss: `${issuer}/auth/v1`, aud: "authenticated", role: "authenticated", sub: userId,
    email: "member@example.com", exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  });
  const input = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(input), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${input}.${signature}`;
}

export function jwksResponse(url) {
  if (String(url).includes("/.well-known/jwks.json")) return Response.json({ keys: [key] });
  return null;
}
