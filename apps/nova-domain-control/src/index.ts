import { loadConfig } from "./config.ts";
import { createDomainControlServer } from "./server.ts";
import { SurrealDomainStore } from "./store.ts";

const config = loadConfig();
const store = new SurrealDomainStore(config.surreal);

await store.ensureSchema();

const server = createDomainControlServer(config, store);

server.listen(config.port, config.host, () => {
  console.log(`nova-domain-control listening on http://${config.host}:${config.port}`);
});
