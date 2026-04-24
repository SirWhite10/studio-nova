export type SkillSource = "json" | "home-nova" | "project-nova" | "agents";

export interface Skill {
  id: string;
  name: string;
  description?: string;
  content: string;
  enabled: boolean;
  embedding?: number[];
  current_version: number;
  usage_count: number;
  success_count: number;
  failure_count: number;
  last_used_at?: string;
  createdAt: string;
  updatedAt: string;
  source?: "json" | "home-nova" | "project-nova" | "agents";
  folder_path?: string;
  file_hash?: string;
  readonly?: boolean;
}

export interface SkillVersion {
  id: string;
  skill_id: string;
  version_number: number;
  content: string;
  embedding: number[];
  file_hash: string;
  created_by: string;
  created_at: string;
  change_summary?: string;
}

export interface SkillExecutionLog {
  id: string;
  skill_id: string;
  tool_name: "search_skills" | "use_skill";
  success: boolean;
  error_message?: string;
  duration_ms: number;
  created_at: string;
}

export interface SkillWithStats extends Skill {
  success_rate: number;
  failure_rate: number;
  recent_failures: number;
}

export interface SkillStats {
  skill_id: string;
  usage_count: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  failure_rate: number;
  last_used_at?: string;
}

export function parseSkillMarkdown(content: string): { name: string; description?: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  // Parse YAML-like frontmatter (simplified)
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  if (!nameMatch) return null;

  return {
    name: nameMatch[1].trim(),
    description: descMatch ? descMatch[1].trim() : undefined,
  };
}

export function createDefaultSkillStats(skillId: string = ""): SkillStats {
  return {
    skill_id: skillId,
    usage_count: 0,
    success_count: 0,
    failure_count: 0,
    success_rate: 0,
    failure_rate: 0,
    last_used_at: undefined,
  };
}

export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateSkillId(): string {
  return `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateVersionId(): string {
  return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
