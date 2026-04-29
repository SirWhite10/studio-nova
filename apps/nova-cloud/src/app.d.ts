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
      env?: {
        STORAGE?: {
          list(options?: { prefix?: string; delimiter?: string }): Promise<{
            objects?: Array<{
              key: string;
              size: number;
              uploaded: Date;
            }>;
            delimitedPrefixes?: string[];
            delimiters?: string[];
          }>;
          get(key: string): Promise<{
            arrayBuffer(): Promise<ArrayBuffer>;
          } | null>;
          put(
            key: string,
            value: ArrayBuffer | Uint8Array | string,
            options?: { httpMetadata?: { contentType?: string } },
          ): Promise<unknown>;
          delete(key: string): Promise<void>;
        };
      };
    }
  }
}

export {};
