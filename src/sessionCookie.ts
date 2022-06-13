import { base64UrlEncode, base64UrlDecode } from "./base64Url";
import { hmac } from "./hmac";

export default {
  async fetch() {
    const now = new Date();
    console.log(now);
    // 64 bytea
    const secret = "sM1gh5bo1zyke8XQvoGq3nZ5tJ1VQJIYkuQe8YLHYJQ";

    const [signAndEncode, verifyAndDecode] = await sessionCookie(secret);

    const message = "Hello!";
    const expires = new Date(now.getTime() + 10);
    console.log(expires);

    const encoded = await signAndEncode(message, expires);
    console.log(encoded);

    const value = await verifyAndDecode(encoded, now);

    console.log(value);

    return new Response("\n");
  },
};

export interface SignAndEncode {
  (value: any, expires: Date): Promise<string>;
}

export interface VerifyAndDecode {
  (cookieValue: string, now: Date): Promise<any>;
}

async function sessionCookie(secret: string) {
  const [digest, verify] = await hmac(base64UrlDecode(secret));

  const signAndEncode: SignAndEncode = async (value: any, expires: Date) => {
    const exp = String(expires.getTime());
    const val = encodeURIComponent(JSON.stringify(value));
    const msg = `${exp}.${val}`;
    const sign = await digest(new TextEncoder().encode(msg));
    return `${base64UrlEncode(sign)}.${msg}`;
  };

  const verifyAndDecode: VerifyAndDecode = async (
    cookieValue: string,
    now: Date
  ) => {
    const [sign, msg] = splitN(cookieValue, ".", 2);

    if (!(await verify(base64UrlDecode(sign), new TextEncoder().encode(msg)))) {
      throw new Error("session invalid signature");
    }

    const [exp, value] = splitN(msg, ".", 2);

    if (new Date(Number(exp)) <= now) {
      throw new Error("session expired");
    }

    return JSON.parse(decodeURIComponent(value));
  };

  return [signAndEncode, verifyAndDecode] as const;
}

export { sessionCookie };

function splitN(s: string, sep: string, c: number) {
  const acm = [];
  let i = 0;
  let j;
  while (--c) {
    j = s.indexOf(sep, i);
    if (j === -1) {
      break;
    }
    acm.push(s.substring(i, j));
    i = j + sep.length;
  }
  acm.push(s.substring(i));
  return acm;
}
