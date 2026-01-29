import { create } from "ipfs-http-client";

const configuredHost = process.env.IPFS_HOST || process.env.IP;
const fallbackHost = "host.docker.internal";
const ipfsHost = configuredHost && configuredHost.trim().length > 0 ? configuredHost : fallbackHost;

// Create client using URL form — simpler and works with modern ipfs-http-client
const ipfsUrl = `http://${ipfsHost}:5001`;

const ipfs = create({ url: ipfsUrl });

// Export both the client and the resolved host/url so callers can log helpful
// diagnostic messages when connection fails.
export { ipfs as default, ipfsUrl, ipfsHost };
