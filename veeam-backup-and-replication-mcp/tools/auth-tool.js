// tools/auth-tool.js
import fetch from "node-fetch";
import dotenv from "dotenv";
import { httpsAgent } from "./shared/https-agent.js";
import { setAuth } from "./shared/auth-store.js";

dotenv.config();

const DEFAULT_HOST = process.env.VEEAM_HOST;
const DEFAULT_USERNAME = process.env.VEEAM_USERNAME;
const DEFAULT_PASSWORD = process.env.VEEAM_PASSWORD;
const DEFAULT_PORT = process.env.VEEAM_PORT || "9419";
const DEFAULT_API_VERSION = process.env.VEEAM_API_VERSION || "1.2-rev0";

async function authenticate(host, username, password, port, apiVersion) {
  const response = await fetch(`https://${host}:${port}/api/oauth2/token`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'x-api-version': apiVersion,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&refresh_token=&code=&use_short_term_refresh=&vbr_token=`,
    agent: httpsAgent
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("No access token received from VBR server");
  }
  return data.access_token;
}

export default function(server) {
  server.tool(
    "auth-vbr",
    {},
    async () => {
      try {
        const host = DEFAULT_HOST;
        const username = DEFAULT_USERNAME;
        const password = DEFAULT_PASSWORD;
        const port = DEFAULT_PORT;
        const apiVersion = DEFAULT_API_VERSION;

        if (!host) {
          throw new Error("Host not configured. Set VEEAM_HOST environment variable.");
        }
        if (!username) {
          throw new Error("Username not configured. Set VEEAM_USERNAME environment variable.");
        }
        if (!password) {
          throw new Error("Password not configured. Set VEEAM_PASSWORD environment variable.");
        }

        const token = await authenticate(host, username, password, port, apiVersion);

        setAuth({ host, port, token, apiVersion });

        return {
          content: [{
            type: "text",
            text: `Authentication successful. Connected to ${host}:${port}. Token received and stored for subsequent API calls.`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Authentication failed: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );
}
