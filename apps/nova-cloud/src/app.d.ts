// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      token?: string;
      userId?: string | null;
      session?: {
        user?: {
          id: string;
          email?: string;
          name?: string;
          [key: string]: any;
        };
      } | null;
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      /** Bun server instance (available when running under bun-serve adapter) */
      server: { upgrade(request: Request): Promise<void> };

      /** The original Request object (available when running under bun-serve adapter) */
      request: Request;
      env: Env;
      ctx: ExecutionContext;
      caches: CacheStorage;
      cf?: IncomingRequestCfProperties;
    }
  }
}

export {};
