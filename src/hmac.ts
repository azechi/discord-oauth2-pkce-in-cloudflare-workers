export default {
  async fetch(): Promise<Response> {
    const { base64UrlEncode, base64UrlDecode } = await import("./base64Url");

    // 64 bytea
    const secret = "sM1gh5bo1zyke8XQvoGq3nZ5tJ1VQJIYkuQe8YLHYJQ";
    const [digest, verify] = await hmac(base64UrlDecode(secret));

    const message = "Hello!";

    const sign = await digest(new TextEncoder().encode(message));

    console.log(base64UrlEncode(sign));

    const valid = await verify(sign, new TextEncoder().encode(message));

    console.log(valid);

    return new Response("\n");
  },
};

async function hmac(rawKey: ArrayBufferLike) {
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign", "verify"]
  );

  const digest = (message: ArrayBufferLike) =>
    crypto.subtle.sign("HMAC", key, message);

  // safe-compare ???
  const verify = (digest: ArrayBufferLike, message: ArrayBufferLike) =>
    crypto.subtle.verify("HMAC", key, digest, message);

  return [digest, verify] as const;
}

export { hmac };
