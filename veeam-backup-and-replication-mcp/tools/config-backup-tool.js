import fetch from "node-fetch";
import { httpsAgent } from "./shared/https-agent.js";
import { getAuth, notAuthenticatedResponse } from "./shared/auth-store.js";
import { z } from "zod";

export default function (server) {
    // Tool: get_config_backup
    server.tool(
        "get-config-backup",
        {},
        async () => {
            try {
                const auth = getAuth();
                if (!auth) return notAuthenticatedResponse();

                const { host, port, token } = auth;

                const response = await fetch(`https://${host}:${port}/api/v1/configBackup`, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'x-api-version': '1.3-rev1',
                        'Authorization': `Bearer ${token}`
                    },
                    agent: httpsAgent
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch config backup status: ${response.statusText}`);
                }

                const data = await response.json();

                // Suggestion Analysis
                let suggestion = "";
                const isEnabled = data.isEnabled === true;
                const hasRepo = !!data.backupRepositoryId;
                const lastSuccess = data.lastSuccessfulBackup?.lastSuccessfulTime;

                if (isEnabled && hasRepo) {
                    suggestion = "\n\n💡 **Suggestion**: Configuration Backup is correctly configured. You can use the `start-config-backup` tool to trigger a backup now.";
                    if (lastSuccess) {
                        suggestion += ` (Last successful backup: ${lastSuccess})`;
                    } else {
                        suggestion += " (No successful backup recorded yet)";
                    }
                } else {
                    suggestion = "\n\n⚠️ **Warning**: Configuration Backup is NOT fully configured (disabled or missing repository).";
                }

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(data, null, 2) + suggestion
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error fetching config backup: ${error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    // Tool: start_config_backup
    server.tool(
        "start-config-backup",
        {
            confirmation: z.boolean().describe("You MUST ask the user for confirmation before running this. Set to true if user confirmed.")
        },
        async (params) => {
            try {
                const auth = getAuth();
                if (!auth) return notAuthenticatedResponse();

                if (params.confirmation !== true) {
                    return {
                        content: [{
                            type: "text",
                            text: "Action Aborted: User confirmation is required to start a configuration backup."
                        }],
                        isError: true
                    };
                }

                const { host, port, token } = auth;

                const response = await fetch(`https://${host}:${port}/api/v1/configBackup/backup`, {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'x-api-version': '1.3-rev1',
                        'Authorization': `Bearer ${token}`
                    },
                    agent: httpsAgent
                });

                if (!response.ok) {
                    throw new Error(`Failed to start config backup: ${response.statusText}`);
                }

                // POST to this endpoint typically returns 202 or 200 with no body or a task ID?
                // Documentation says "Start Configuration Backup", does not specify key response body for POST in the brief,
                // usually it returns empty or a task. Let's assume standard success for now or text.
                // If there's a body we'll try to parse it, otherwise success message.

                let resultText = "Configuration backup started successfully.";
                try {
                    const body = await response.text();
                    if (body) {
                        resultText += "\nResponse: " + body;
                    }
                } catch (e) {
                    // Ignore body parse error
                }

                return {
                    content: [{
                        type: "text",
                        text: resultText
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error starting config backup: ${error.message}`
                    }],
                    isError: true
                };
            }
        }
    );
}
