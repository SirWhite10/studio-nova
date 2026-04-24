// Stub for the cloudflare:workers virtual module.
// Only used during Vite build — at runtime in Cloudflare Workers the real
// module is injected by the runtime and this file is never loaded.
// @cloudflare/containers only imports { DurableObject } from 'cloudflare:workers'.

export class DurableObject {
  ctx: any;
  env: any;
  constructor(ctx: any, env: any) {
    this.ctx = ctx;
    this.env = env;
  }
}

export default {};
