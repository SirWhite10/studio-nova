import { defaultBuildLogger, Template } from "e2b";
import { novaBunTemplate } from "./template";

async function main() {
  await Template.build(novaBunTemplate, "nova-bun-agent", {
    apiKey: process.env.E2B_API_KEY,
    cpuCount: 2,
    memoryMB: 2048,
    onBuildLogs: defaultBuildLogger(),
  });
  console.log("Template built successfully!");
}

main().catch(console.error);
