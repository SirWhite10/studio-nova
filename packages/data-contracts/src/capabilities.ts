export type CapabilityEvaluation = {
  compatible: boolean;
  required: string[];
  available: string[];
  missing: string[];
};

const TOKEN_ALIASES: Record<string, string> = {
  "arch:amd64": "arch:x86_64",
  "arch:aarch64": "arch:arm64",
  "os:darwin": "os:macos",
  "os:win32": "os:windows",
};

const CAPABILITY_LABELS: Record<string, string> = {
  arch: "architecture",
  os: "operating system",
  package: "packaging capability",
  runtime: "runtime",
  signing: "signing capability",
  target: "target capability",
  toolchain: "toolchain",
};

export function normalizeCapabilityToken(value: string) {
  const token = value.trim().toLowerCase().replaceAll(" ", "-");
  return TOKEN_ALIASES[token] ?? token;
}

export function normalizeCapabilityTokens(values: readonly string[]) {
  return [...new Set(values.map(normalizeCapabilityToken).filter(Boolean))].sort();
}

export function evaluateCapabilities(
  required: readonly string[],
  available: readonly string[],
): CapabilityEvaluation {
  const normalizedRequired = normalizeCapabilityTokens(required);
  const normalizedAvailable = normalizeCapabilityTokens(available);
  const provided = new Set(normalizedAvailable);
  const missing = normalizedRequired.filter((token) => !provided.has(token));
  return {
    compatible: missing.length === 0,
    required: normalizedRequired,
    available: normalizedAvailable,
    missing,
  };
}

export function describeCapability(token: string) {
  const normalized = normalizeCapabilityToken(token);
  const separator = normalized.indexOf(":");
  if (separator === -1) return normalized;
  const category = normalized.slice(0, separator);
  const value = normalized.slice(separator + 1);
  return `${CAPABILITY_LABELS[category] ?? category} ${value}`;
}

export function explainMissingCapabilities(missing: readonly string[]) {
  const normalized = normalizeCapabilityTokens(missing);
  if (normalized.length === 0) return null;
  return `Missing ${normalized.map(describeCapability).join(", ")}`;
}
