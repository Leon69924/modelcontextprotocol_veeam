import https from "https";
import fs from "fs";

const caCert = process.env.VEEAM_CA_CERT
  ? fs.readFileSync(process.env.VEEAM_CA_CERT)
  : undefined;

export const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.VEEAM_IGNORE_SSL !== "true",
  ...(caCert && { ca: caCert })
});
