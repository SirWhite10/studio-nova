// import adapter from '@sveltejs/adapter-auto';
import adapter from "@sveltejs/adapter-cloudflare";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      // Use the build config (no containers) for the platformProxy emulation.
      // Miniflare does not support containers locally (needs a Docker build ID).
      // The full wrangler.jsonc is used for wrangler dev and wrangler deploy.
      platformProxy: {
        configPath: "wrangler.build.jsonc",
      },
    }),
    env: {
      // Explicitly include private env vars that should be available on the server
      publicPrefix: "PUBLIC_",
    },
  },
};

export default config;
