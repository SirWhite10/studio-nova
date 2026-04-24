// Node.js ESM loader hook to handle cloudflare: virtual module URLs.
// Used during `vite build` (via NODE_OPTIONS) so Node.js doesn't crash when
// @cloudflare/containers tries to import { DurableObject } from 'cloudflare:workers'.
//
// Usage: NODE_OPTIONS="--import ./cloudflare-loader.mjs" vite build

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("cloudflare:")) {
    return { shortCircuit: true, url: `node:module`, format: "builtin" };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("cloudflare:")) {
    return {
      shortCircuit: true,
      format: "module",
      source: `
export class DurableObject {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
}
export default {};
`,
    };
  }
  return nextLoad(url, context);
}
