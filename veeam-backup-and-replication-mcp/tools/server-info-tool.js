// tools/server-info-tool.js
import fetch from "node-fetch";
import { httpsAgent } from "./shared/https-agent.js";
import { getAuth, notAuthenticatedResponse } from "./shared/auth-store.js";

export default function(server) {
  // Add server info tool
  server.tool(
    "get-server-info",
    { },
    async () => {
      try {
        const auth = getAuth();
        if (!auth) return notAuthenticatedResponse();

        const { host, port, token } = auth;

        const response = await fetch(`https://${host}:${port}/api/v1/serverInfo`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'x-api-version': '1.2-rev0',
            'Authorization': `Bearer ${token}`
          },
          agent: httpsAgent
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch server info: ${response.statusText}`);
        }

        const serverInfo = await response.json();

        return {
          content: [{
            type: "text",
            text: JSON.stringify(serverInfo, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching server info: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );
}
