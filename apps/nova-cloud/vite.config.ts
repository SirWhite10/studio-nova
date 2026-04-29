import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [tailwindcss(), sveltekit()],

  ssr: {
    noExternal: [],
  },

  server: {
    host: "0.0.0.0",
    port: 8105,
    strictPort: true,
    allowedHosts: true,
    watch: {
      ignored: ["**/data/**"],
    },
  },

  preview: {
    port: 8105,
    strictPort: true,
  },
});
