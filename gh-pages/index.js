const STORAGE_KEY = "code_verifier";
const storage = window.sessionStorage;

const url = new URL(window.location);
if (
  ["code", "state"].every(Array.prototype.includes, [
    ...url.searchParams.keys(),
  ])
) {
  handleRedirectCallback();
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, document.title, url.href);
}

async function handleRedirectCallback() {
  console.log(
    "handleRedirectCallback",
    "code:",
    url.searchParams.get("code"),
    "state:",
    url.searchParams.get("state")
  );

  const result = await fetch("https://discord-oauth2-pkce-in-cloudlfare-workers.azechi.workers.dev/token", {
    method: "POST",
    credentials: "include",
    mode: "cors",
    body: new URLSearchParams({
      code_verifier: storage.getItem(STORAGE_KEY),
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
      redirect_uri: "https://azechi.github.io/discord-oauth2-pkce-in-cloudflare-workers/",
    }),
  })
    .then((res) => res.text());

  console.log(result);
}

const loaded = new Promise(result => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', result, {once: true})
  } else {
    result();
  }
});

await loaded;
const button = document.getElementById("button");
button.disabled = false;

button.addEventListener("click", async () => {
  console.log("click");
  // screen lock on

  await loginWithRedirect();
});

async function loginWithRedirect() {
  const code_verifier = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))
  ).replace(/\/|\+|=/g, (x) => ({ "/": "_", "+": "-", "=": "" }[x]));

  storage.setItem(STORAGE_KEY, code_verifier);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array([...code_verifier].map((e) => e.charCodeAt(0)))
  );
  const code_challenge = btoa(
    String.fromCharCode(...new Uint8Array(hash))
  ).replace(/\/|\+|=/g, (x) => ({ "/": "_", "+": "-", "=": "" }[x]));

  const p = {
    code_challenge: code_challenge,
    code_challenge_method: "S256",
    redirect_uri: "https://azechi.github.io/discord-oauth2-pkce-in-cloudflare-workers/",
  };

  self.location.assign("https://discord-oauth2-pkce-in-cloudlfare-workers.azechi.workers.dev/login?" + new URLSearchParams(p).toString());
}
