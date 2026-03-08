import fetch from "node-fetch";
import { httpsAgent } from "./shared/https-agent.js";
import { getAuth, notAuthenticatedResponse } from "./shared/auth-store.js";
import { z } from "zod";

export default function (server) {
  // Add protection groups tool
  server.tool(
    "get-protection-groups",
    {
      limit: z.number().min(1).max(1000).default(200).describe("Maximum number of protection groups to retrieve"),
      skip: z.number().min(0).default(0).describe("Number of protection groups to skip (for pagination)")
    },
    async (params) => {
      try {
        const auth = getAuth();
        if (!auth) return notAuthenticatedResponse();

        const { host, port, token } = auth;
        const { limit = 200, skip = 0 } = params;

        const response = await fetch(`https://${host}:${port}/api/v1/agents/protectionGroups?limit=${limit}&skip=${skip}`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'x-api-version': '1.3-rev1',
            'Authorization': `Bearer ${token}`
          },
          agent: httpsAgent
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch protection groups: ${response.statusText}`);
        }

        const data = await response.json();

        // Add a summary message at the beginning
        const total = data.pagination.total;
        const count = data.pagination.count;
        const summary = `Retrieved ${count} protection groups out of ${total} total`;

        const formattedResult = {
          summary,
          protectionGroups: data.data, // Return the raw data objects for flexibility
          pagination: data.pagination
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(formattedResult, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching protection groups: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );
}
