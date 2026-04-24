# Use the official Cloudflare Sandbox container image (Python variant)
# Includes Python 3.11, Node.js, Bun, and common dev tools
FROM docker.io/cloudflare/sandbox:0.7.18-python

# Expose ports for local development (required by wrangler dev)
# NOTE: Port 3000 is reserved by the Sandbox SDK internally - do not expose it
EXPOSE 8000
EXPOSE 8080
EXPOSE 5173
