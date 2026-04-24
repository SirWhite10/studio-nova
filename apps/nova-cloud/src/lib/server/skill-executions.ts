import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { SkillExecutionLog, SkillStats } from "$lib/skills/types";
import { generateExecutionId } from "$lib/skills/types";
import { getAllSkills } from "./skill-store";

import { createDefaultSkillStats } from "$lib/skills/types";

const DATA_DIR = process.env.NOVA_DATA_DIR || join(process.cwd(), "data");
const EXECUTION_FILE = join(DATA_DIR, "skill-executions.json");

let executions: SkillExecutionLog[] = [];
let isLoaded = false;

export async function getAllExecutions(): Promise<SkillExecutionLog[]> {
  await loadExecutions();
  return [...executions];
}

export async function getExecutionLogs(skillId: string): Promise<SkillExecutionLog[]> {
  await loadExecutions();
  return executions.filter((e) => e.skill_id === skillId);
}

export async function logExecution(
  skillId: string,
  toolName: "search_skills" | "use_skill",
  success: boolean,
  durationMs: number,
  errorMessage?: string,
): Promise<SkillExecutionLog> {
  await loadExecutions();

  const id = generateExecutionId();
  const execution: SkillExecutionLog = {
    id,
    skill_id: skillId,
    tool_name: toolName,
    success,
    error_message: errorMessage,
    duration_ms: durationMs,
    created_at: new Date().toISOString(),
  };

  executions.push(execution);
  await saveExecutions();

  return execution;
}
export async function getSkillStats(skillId: string): Promise<SkillStats> {
  await loadExecutions();
  const logs = await getExecutionLogs(skillId);

  if (logs.length === 0) {
    return createDefaultSkillStats(skillId);
  }

  const usageCount = logs.length;
  const successCount = logs.filter((l) => l.success).length;
  const failureCount = logs.filter((l) => !l.success).length;
  const successRate = usageCount > 0 ? successCount / usageCount : 0;
  const failureRate = usageCount > 0 ? failureCount / usageCount : 0;
  const lastUsedAt =
    logs.length > 0
      ? new Date(Math.max(...logs.map((l) => new Date(l.created_at).getTime()))).toISOString()
      : undefined;

  return {
    skill_id: skillId,
    usage_count: usageCount,
    success_count: successCount,
    failure_count: failureCount,
    success_rate: successRate,
    failure_rate: failureRate,
    last_used_at: lastUsedAt,
  };
}
export async function getTopSkills(limit: number = 10): Promise<SkillStats[]> {
  await loadExecutions();
  const allSkills = await getAllSkills();

  const stats: SkillStats[] = [];
  for (const skill of allSkills) {
    const skillStats = await getSkillStats(skill.id);
    if (skillStats.usage_count > 0) {
      stats.push(skillStats);
    }
  }

  stats.sort((a, b) => b.usage_count - a.usage_count);
  return stats.slice(0, limit);
}
export async function getFailingSkills(): Promise<SkillStats[]> {
  await loadExecutions();
  const allSkills = await getAllSkills();

  const failing: SkillStats[] = [];
  for (const skill of allSkills) {
    const stats = await getSkillStats(skill.id);
    if (stats.usage_count > 0 && stats.failure_rate > 0.2) {
      failing.push(stats);
    }
  }

  failing.sort((a, b) => b.failure_rate - a.failure_rate);
  return failing;
}
export function clearSkillExecutions(): void {
  executions = [];
  isLoaded = false;
}

export async function resetAllExecutions(): Promise<void> {
  executions = [];
  isLoaded = false;
  if (existsSync(EXECUTION_FILE)) {
    await writeFile(EXECUTION_FILE, "[]", "utf-8");
  }
}

async function loadExecutions(): Promise<void> {
  if (isLoaded) return;
  try {
    if (existsSync(EXECUTION_FILE)) {
      const data = await readFile(EXECUTION_FILE, "utf-8");
      if (data.trim() === "") {
        executions = [];
      } else {
        executions = JSON.parse(data);
      }
    }
  } catch (error) {
    console.error("Failed to load skill executions:", error);
    executions = [];
  }
  isLoaded = true;
}
async function saveExecutions(): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    await writeFile(EXECUTION_FILE, JSON.stringify(executions, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save skill executions:", error);
  }
}
