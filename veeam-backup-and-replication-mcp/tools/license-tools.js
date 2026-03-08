// tools/license-tools.js
import fetch from "node-fetch";
import { httpsAgent } from "./shared/https-agent.js";
import { getAuth, notAuthenticatedResponse } from "./shared/auth-store.js";

export default function(server) {
  // Add licensing information tool
  server.tool(
    "get-license-info",
    { },
    async () => {
      try {
        const auth = getAuth();
        if (!auth) return notAuthenticatedResponse();

        const { host, port, token } = auth;

        const response = await fetch(`https://${host}:${port}/api/v1/license`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'x-api-version': '1.2-rev0',
            'Authorization': `Bearer ${token}`
          },
          agent: httpsAgent
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch license info: ${response.statusText}`);
        }

        const licenseData = await response.json();

        // Format the license data for better readability
        const formattedLicense = {
          status: licenseData.status,
          edition: licenseData.edition,
          expirationDate: licenseData.expirationDate,
          licensedTo: licenseData.licensedTo,
          instanceLicenseSummary: {
            package: licenseData.instanceLicenseSummary?.package,
            licensedInstancesNumber: licenseData.instanceLicenseSummary?.licensedInstancesNumber,
            usedInstancesNumber: licenseData.instanceLicenseSummary?.usedInstancesNumber,
            workloadCount: licenseData.instanceLicenseSummary?.workload?.length || 0
          },
          supportExpirationDate: licenseData.supportExpirationDate
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(formattedLicense, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching license info: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Add tool to get detailed license workload information
  server.tool(
    "get-license-workloads",
    { },
    async () => {
      try {
        const auth = getAuth();
        if (!auth) return notAuthenticatedResponse();

        const { host, port, token } = auth;

        const response = await fetch(`https://${host}:${port}/api/v1/license`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'x-api-version': '1.2-rev0',
            'Authorization': `Bearer ${token}`
          },
          agent: httpsAgent
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch license info: ${response.statusText}`);
        }

        const licenseData = await response.json();

        // Get the workload data only
        const workloads = licenseData.instanceLicenseSummary?.workload || [];

        // Group workloads by type
        const workloadsByType = {};
        workloads.forEach(workload => {
          if (!workloadsByType[workload.type]) {
            workloadsByType[workload.type] = [];
          }
          workloadsByType[workload.type].push(workload);
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(workloadsByType, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching license workloads: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );
}
