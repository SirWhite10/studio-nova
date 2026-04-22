export function sanitizeKubernetesName(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized.slice(0, 48) || "studio";
}

export function runtimeNamespace(namespacePrefix: string, studioId: string) {
  return `${namespacePrefix}-${sanitizeKubernetesName(studioId)}`.slice(0, 63);
}
