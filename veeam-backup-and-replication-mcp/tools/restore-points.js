import fetch from "node-fetch";
import { httpsAgent } from "./shared/https-agent.js";
import { getAuth, notAuthenticatedResponse } from "./shared/auth-store.js";
import { z } from "zod";

export default function (server) {
    // Add restore points tool
    server.tool(
        "get-restore-points",
        {
            id: z.string().uuid().describe("Backup object ID. To get the ID, run the get-backup-objects tool."),
            limit: z.number().min(1).max(1000).default(200).describe("Maximum number of restore points to return"),
            skip: z.number().min(0).default(0).describe("Number of restore points to skip"),
            createdAfterFilter: z.string().optional().describe("Returns restore points created after this date-time"),
            createdBeforeFilter: z.string().optional().describe("Returns restore points created before this date-time"),
            nameFilter: z.string().optional().describe("Filter by name pattern (supports *)"),
            orderBy: z.string().optional().describe("Column to sort by"),
            orderAsc: z.boolean().default(true).describe("Sort ascending")
        },
        async (params) => {
            try {
                const auth = getAuth();
                if (!auth) return notAuthenticatedResponse();

                const { host, port, token } = auth;
                const { id, limit = 200, skip = 0, ...filters } = params;

                // Build query string
                const queryParams = new URLSearchParams({
                    limit: limit.toString(),
                    skip: skip.toString()
                });

                if (filters.createdAfterFilter) queryParams.append('createdAfterFilter', filters.createdAfterFilter);
                if (filters.createdBeforeFilter) queryParams.append('createdBeforeFilter', filters.createdBeforeFilter);
                if (filters.nameFilter) queryParams.append('nameFilter', filters.nameFilter);
                if (filters.orderBy) {
                    queryParams.append('orderColumn', filters.orderBy);
                    queryParams.append('orderAsc', filters.orderAsc.toString());
                }

                const response = await fetch(`https://${host}:${port}/api/v1/backupObjects/${id}/restorePoints?${queryParams.toString()}`, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'x-api-version': '1.3-rev1',
                        'Authorization': `Bearer ${token}`
                    },
                    agent: httpsAgent
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch restore points: ${response.statusText}`);
                }

                const data = await response.json();

                // Extract unique backup IDs
                const backupIds = [...new Set(data.data.map(rp => rp.backupId).filter(id => id))];

                // Fetch backup details for each ID
                const backupDetailsMap = new Map();

                await Promise.all(backupIds.map(async (backupId) => {
                    try {
                        const backupResponse = await fetch(`https://${host}:${port}/api/v1/backups/${backupId}`, {
                            method: 'GET',
                            headers: {
                                'accept': 'application/json',
                                'x-api-version': '1.3-rev1',
                                'Authorization': `Bearer ${token}`
                            },
                            agent: httpsAgent
                        });

                        if (backupResponse.ok) {
                            const backupData = await backupResponse.json();
                            backupDetailsMap.set(backupId, {
                                jobName: backupData.name,
                                repositoryName: backupData.repositoryName
                            });
                        }
                    } catch (err) {
                        // Ignore errors for individual backup fetches, just leave details extra fields empty
                    }
                }));

                // Add a summary message
                const total = data.pagination.total;
                const count = data.pagination.count;
                const summary = `Retrieved ${count} restore points out of ${total} total`;

                const formattedResult = {
                    summary,
                    restorePoints: data.data.map(rp => {
                        const backupDetails = backupDetailsMap.get(rp.backupId) || {};
                        return {
                            creationTime: rp.creationTime,
                            type: rp.type,
                            jobName: backupDetails.jobName || "Unknown",
                            repositoryName: backupDetails.repositoryName || "Unknown",
                            allowedOperations: rp.allowedOperations,
                            // Keep original fields just in case
                            id: rp.id,
                            name: rp.name,
                            platformName: rp.platformName,
                            backupId: rp.backupId
                        };
                    }),
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
                        text: `Error fetching restore points: ${error.message}`
                    }],
                    isError: true
                };
            }
        }
    );
}
