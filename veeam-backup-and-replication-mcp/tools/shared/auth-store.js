const AUTH_TTL_MS = 14 * 60 * 1000; // 14 minutes (under Veeam's 15-min default)

let authState = null;
let authTimestamp = 0;

export function getAuth() {
  if (!authState) return null;
  if (Date.now() - authTimestamp > AUTH_TTL_MS) {
    authState = null;
    return null;
  }
  return authState;
}

export function setAuth({ host, port, token, apiVersion }) {
  authState = { host, port, token, apiVersion };
  authTimestamp = Date.now();
}

export function notAuthenticatedResponse() {
  const expired = authTimestamp > 0 && Date.now() - authTimestamp > AUTH_TTL_MS;
  return {
    content: [{
      type: "text",
      text: expired
        ? "Session expired. Please call auth-vbr tool to re-authenticate."
        : "Not authenticated. Please call auth-vbr tool first."
    }],
    isError: true
  };
}
