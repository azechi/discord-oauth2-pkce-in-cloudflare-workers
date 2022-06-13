import { sessionCookie, SignAndEncode, VerifyAndDecode } from "./sessionCookie";
import { base64UrlEncode } from "./base64Url";
import { fetchJson, authorizer } from "./apiRequest";
import { authorizeUrl, tokenRequest, usersMeRequest } from "./discord";

export interface Env {
  discord_client_id: string;
  secret_key: string;
}

let sessionEncode: SignAndEncode;
let sessionDecode: VerifyAndDecode;

export default {
  async fetch(
    req: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    if (!sessionEncode) {
      console.log("initialize the sessionEncode");
      [sessionEncode, sessionDecode] = await sessionCookie(env.secret_key);
    }
    const client_id = env.discord_client_id;

    const url = new URL(req.url);
    if (url.pathname === "/login") {
      if (req.method !== "GET") {
        throw Error("use GET method");
      }
      const params = acceptUrlParameters(url.searchParams, [
        "redirect_uri",
        "code_challenge",
        "code_challenge_method",
      ] as const);
      const state = getRandomBase64UrlString(24);
      const sessionExpires = new Date(Date.now() + 3600000);
      const response = await saveSession(
        redirect302Response(authorizeUrl({ ...params, state, client_id })),
        state,
        sessionExpires,
        sessionEncode,
        "./token"
      );
      return response;
    } else if (url.pathname === "/token") {
      if (req.method === "OPTIONS") {
        const res = new Response(null, { status: 204 });
        res.headers.append(
          "Access-Control-Allow-Origin",
          "https://localdev.azechi.net"
        );
        res.headers.append("Access-Control-Allow-Methods", "POST");
        res.headers.append(
          "Access-Control-Allow-Headers",
          "Authorization, Cookie"
        );
        res.headers.append("Access-Control-Allow-Credentials", "true");
        return res;
      }

      if (req.method !== "POST") {
        throw Error("must use POST method");
      }
      const sessionValue = await loadSession(req, new Date(), sessionDecode);
      const form = await req.formData();
      if (!sessionValue && sessionValue !== form.get("state")) {
        throw Error("state invalid");
      }
      const params = acceptFormParameters(form, [
        "code",
        "code_verifier",
        "redirect_uri",
      ] as const);
      const { access_token } = await fetchJson(
        tokenRequest({ ...params, client_id })
      );
      const authorize = authorizer(access_token);
      const user = await fetchJson(authorize(usersMeRequest()));
      const res = new Response(`${JSON.stringify(user)}`);

      res.headers.append(
        "Access-Control-Allow-Origin",
        "https://localdev.azechi.net"
      );
      res.headers.append("Access-Control-Allow-Credentials", "true");
      return res;
    }

    return new Response(null, { status: 404 });
  },
};

type _ToObject<Keys extends readonly string[]> =
  Keys extends readonly (infer Key)[]
    ? { [Keys in Key extends string ? Key : never]: string }
    : never;

function acceptUrlParameters<Keys extends readonly string[]>(
  input: URLSearchParams,
  requiredKeys: Keys
) {
  const entries = requiredKeys.map((key) => {
    if (!input.has(key)) {
      throw Error(`missing required key: "${key}"`);
    }
    return [key, input.get(key)!];
  });

  return Object.fromEntries(entries) as _ToObject<Keys>;
}

function acceptFormParameters<Keys extends readonly string[]>(
  input: FormData,
  requiredKeys: Keys
) {
  const entries = requiredKeys.map((key) => {
    if (!input.has(key)) {
      throw Error(`missing required key: "${key}"`);
    }
    const val = input.get(key)!;
    if (typeof val !== "string") {
      throw Error(`${key} must be string`);
    }

    return [key, val];
  });

  return Object.fromEntries(entries) as _ToObject<Keys>;
}

const COOKIENAME = "__session";

async function saveSession(
  response: Response,
  value: any,
  expires: Date,
  encode: SignAndEncode,
  path: string
) {
  const session = await encode(value, expires);
  response.headers.append(
    "Set-Cookie",
    `${COOKIENAME}=${session}; Path=${path}; Secure; HttpOnly; SameSite=None`
  );

  return response;
}

async function loadSession(
  request: Request,
  now: Date,
  decode: VerifyAndDecode
) {
  const cookieString = request.headers.get("Cookie") || "";
  const session = (
    cookieString.split("; ").find((x) => x.startsWith(COOKIENAME)) || ""
  ).split("=")[1];
  return await decode(session, now);
}

function redirect302Response(location: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
    },
  });
}

function getRandomBase64UrlString(byteLength: number) {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(byteLength)));
}
