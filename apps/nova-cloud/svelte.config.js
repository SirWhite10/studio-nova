import adapterCloudflare from "@sveltejs/adapter-cloudflare";
import adapterNode from "@sveltejs/adapter-node";

const adapter =
  process.env.NOVA_SVELTE_ADAPTER === "node"
    ? adapterNode()
    : adapterCloudflare({
        // Use the build config (no containers) for the platformProxy emulation.
        // Miniflare does not support containers locally (needs a Docker build ID).
        // The full wrangler.jsonc is used for wrangler dev and wrangler deploy.
        platformProxy: {
          configPath: "wrangler.build.jsonc",
          remoteBindings: false,
        },
      });

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter,
    env: {
      // Explicitly include private env vars that should be available on the server
      publicPrefix: "PUBLIC_",
    },
  },
};

export default config;
