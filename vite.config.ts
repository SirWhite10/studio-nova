import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [
      "apps/nova-frp/**",
      "packages/puck/**",
      "packages/shadcn-svelte/**",
      "specs/005-nova-edge/**",
    ],
  },
  lint: {
    ignorePatterns: [
      "apps/nova-frp/**",
      "packages/puck/**",
      "packages/shadcn-svelte/**",
      "specs/005-nova-edge/**",
    ],
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
  },
  run: {
    cache: true,
  },
});
