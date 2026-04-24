import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const workerPath = resolve("_worker/index.js");
const marker = "async scheduled(controller, env2, ctx) {";

if (!existsSync(workerPath)) {
  console.warn(`[cron-patch] Skipping scheduled handler patch; ${workerPath} does not exist`);
  process.exit(0);
}

let source = readFileSync(workerPath, "utf8");

if (source.includes(marker)) {
  console.log("[cron-patch] Scheduled handler already present");
  process.exit(0);
}

const target = "\n  }\n};\nexport {\n";
const scheduledHandler = `
  },
  async scheduled(controller, env2, ctx) {
    const secret = env2.NOVA_CRON_SECRET;
    const appUrl = env2.NOVA_APP_URL || env2.PUBLIC_SITE_URL;
    if (!secret || !appUrl) {
      console.warn("[scheduled-jobs] Missing NOVA_CRON_SECRET or NOVA_APP_URL/PUBLIC_SITE_URL");
      return;
    }
    const url = new URL("/api/internal/scheduled-jobs/run-due", appUrl);
    const request = new Request(url, {
      method: "POST",
      headers: {
        authorization: \`Bearer \${secret}\`,
        "content-type": "application/json"
      }
    });
    ctx.waitUntil((async () => {
      const response = await this.fetch(request, env2, ctx);
      if (!response.ok) {
        throw new Error(\`Scheduled jobs runner failed with \${response.status}\`);
      }
    })());
  }
};
export {
`;

if (!source.includes(target)) {
  throw new Error("[cron-patch] Could not find Cloudflare worker export boundary");
}

source = source.replace(target, scheduledHandler);
writeFileSync(workerPath, source);
console.log("[cron-patch] Added scheduled handler to _worker/index.js");
