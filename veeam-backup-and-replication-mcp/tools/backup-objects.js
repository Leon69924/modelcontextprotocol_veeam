import fetch from "node-fetch";
import { httpsAgent } from "./shared/https-agent.js";
import { getAuth, notAuthenticatedResponse } from "./shared/auth-store.js";
import { z } from "zod";

export default function (server) {
    // Add backup objects tool
    server.tool(
        "get-backup-objects",
        {
            limit: z.number().min(1).max(1000).default(200).describe("Maximum number of backup objects to retrieve"),
            skip: z.number().min(0).default(0).describe("Number of backup objects to skip (for pagination)")
        },
        async (params) => {
            try {
                const auth = getAuth();
                if (!auth) return notAuthenticatedResponse();

                const { host, port, token } = auth;
                const { limit = 200, skip = 0 } = params;

                const response = await fetch(`https://${host}:${port}/api/v1/backupObjects?limit=${limit}&skip=${skip}`, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'x-api-version': '1.3-rev1',
                        'Authorization': `Bearer ${token}`
                    },
                    agent: httpsAgent
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch backup objects: ${response.statusText}`);
                }

                const data = await response.json();

                // Add a summary message
                const total = data.pagination.total;
                const count = data.pagination.count;
                const summary = `Retrieved ${count} backup objects out of ${total} total`;

                const formattedResult = {
                    summary,
                    backupObjects: data.data.map(obj => ({
                        id: obj.id,
                        name: obj.name,
                        type: obj.type,
                        platformName: obj.platformName,
                        viType: obj.viType,
                        restorePointsCount: obj.restorePointsCount,
                        lastRunFailed: obj.lastRunFailed
                    })),
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
                        text: `Error fetching backup objects: ${error.message}`
                    }],
                    isError: true
                };
            }
        }
    );
}
