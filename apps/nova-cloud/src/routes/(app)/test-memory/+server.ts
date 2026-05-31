import { json } from "@sveltejs/kit";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  try {
    const dataPath = "./data/memory.json";
    if (!existsSync(dataPath)) {
      return json({ success: true, count: 0, entries: [] });
    }
    const data = await readFile(dataPath, "utf-8");
    const entries = JSON.parse(data);
    const filtered = entries.filter(
      (e: any) => e.metadata.chatId === "55d3cb1b-288d-4d65-affb-38e35106e13c",
    );
    return json({
      success: true,
      count: filtered.length,
      entries: filtered.map((e: any) => e.content),
    });
  } catch (error) {
    console.error("Test memory error:", error);
    return json({ error: String(error), stack: (error as Error).stack }, { status: 500 });
  }
};
