import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, type Plugin } from "vite-plus";

function cloudflareStubPlugin(): Plugin {
  const CONTAINER_STUB = `
export class Container {}
export class ContainerSingleton {}
export default {};
`;

  return {
    name: "cloudflare-stub",
    enforce: "pre",
    resolveId(id) {
      if (id === "cloudflare:workers" || id.startsWith("cloudflare:")) {
        return "\0cloudflare:workers";
      }
      if (id === "@cloudflare/containers") {
        return "\0@cloudflare/containers";
      }
    },
    load(id) {
      if (id === "\0cloudflare:workers") {
        return `
export class DurableObject {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
}
export default {};
`;
      }
      if (id === "\0@cloudflare/containers") {
        return CONTAINER_STUB;
      }
    },
  };
}

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [cloudflareStubPlugin(), tailwindcss(), sveltekit()],

  optimizeDeps: {
    exclude: ["@cloudflare/containers"],
  },

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
