import type { PageServerLoad } from "./$types";
import { scanAllSkillFolders } from "$lib/server/skill-folders";
import { requireUserId } from "$lib/server/surreal-query";
import { listSkillsByUser } from "$lib/server/surreal-skills";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { getStudioForUser } from "$lib/server/surreal-studios";

const AGENT_HARNESSES = [
  {
    key: "codex",
    title: "Codex",
    status: "Ready",
    summary:
      "Primary coding harness for repo edits, shell execution, and task-oriented implementation.",
  },
  {
    key: "opencode",
    title: "OpenCode",
    status: "Planned",
    summary:
      "A secondary coding harness slot for code-first agent workflows and alternate execution policies.",
  },
  {
    key: "openclaw",
    title: "OpenClaw",
    status: "Planned",
    summary:
      "Reserved agent surface for research-heavy or tool-routed execution once provider wiring lands.",
  },
  {
    key: "nanoclaw",
    title: "NanoClaw",
    status: "Planned",
    summary:
      "Compact agent profile intended for smaller scoped automations and lower-latency handoffs.",
  },
  {
    key: "claudecode",
    title: "ClaudeCode",
    status: "Planned",
    summary: "Dedicated harness slot for code tasks when a separate model runtime is enabled.",
  },
  {
    key: "pi",
    title: "Pi",
    status: "Planned",
    summary: "Reserved assistant profile for lighter product and support-oriented workflows.",
  },
] as const;

export const load: PageServerLoad = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);

  const [studio, savedSkills, detectedSkills] = await Promise.all([
    getStudioForUser(userId, studioId),
    listSkillsByUser(userId).catch(() => []),
    scanAllSkillFolders().catch(() => []),
  ]);

  return {
    studio,
    studioId,
    agentHarnesses: AGENT_HARNESSES,
    savedSkills,
    detectedSkills,
  };
};

export const ssr = false;
