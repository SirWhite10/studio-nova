import adapterNode from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapterNode(),
    env: {
      // Explicitly include private env vars that should be available on the server
      publicPrefix: "PUBLIC_",
    },
  },
};

export default config;
