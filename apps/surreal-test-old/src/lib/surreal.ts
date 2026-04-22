import { Surreal } from "surrealdb";

const db = new Surreal();
let connected = false;

export async function getDb(): Promise<Surreal> {
  if (!connected) {
    await db.connect("wss://brave-comet-06ekjp8tutqvvbohvijuupk2eg.aws-use2.surreal.cloud", {
      namespace: "main",
      database: "main",
      authentication: {
        username: "",
        password: "",
      },
    });
    connected = true;
  }
  return db;
}

export { db };
