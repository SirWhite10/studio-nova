import { loadConfig } from "../config.ts";
import { RuntimeControlService } from "../runtime/service.ts";

const studioId = process.argv.find((arg, index) => index > 1 && arg !== "--") ?? "studio-smoke";
const service = new RuntimeControlService(loadConfig());

console.log(service.renderSmokeRuntime(studioId));
