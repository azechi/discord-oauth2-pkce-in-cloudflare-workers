import type { JSONRequest, RequireAuthorize } from "./apiRequest";

function authorizeUrl(parameters: {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state: string;
}) {
  const q = new URLSearchParams({
    ...parameters,
    response_type: "code",
    scope: "identify",
    prompt: "none",
  });
  return `https://discord.com/api/oauth2/authorize?${q}`;
}

export interface TokenResponse {
  access_token: string;
}

function tokenRequest(params: {
  client_id: string;
  code: string;
  code_verifier: string;
  redirect_uri: string;
}) {
  return new Request("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      ...params,
      grant_type: "authorization_code",
      scope: "identify",
    }),
  }) as JSONRequest<TokenResponse>;
}

export interface UsersMeRequest {}

function usersMeRequest() {
  return new Request("https://discord.com/api/users/@me") as RequireAuthorize<
    JSONRequest<UsersMeRequest>
  >;
}

export { authorizeUrl, tokenRequest, usersMeRequest };
