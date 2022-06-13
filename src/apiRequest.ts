export interface JSONRequest<_Response> extends Request {
  _brand: "json";
}

export interface RequireAuthorize<_Request extends Request> extends Request {
  _brand: "requireAuthorize";
}

const fetchJson = <T>(request: JSONRequest<T>) =>
  fetch(request).then((res) => res.json() as Promise<T>);

function authorizer(access_token: string) {
  return <T extends Request>(request: RequireAuthorize<T>) =>
    new Request(request, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }) as T;
}

export { fetchJson, authorizer };
