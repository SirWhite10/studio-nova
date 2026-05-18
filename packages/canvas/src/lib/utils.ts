type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

function flattenClassValue(value: ClassValue, output: string[]) {
  if (!value) {
    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    output.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      flattenClassValue(entry, output);
    }
    return;
  }

  for (const [key, enabled] of Object.entries(value)) {
    if (enabled) {
      output.push(key);
    }
  }
}

export function cn(...values: ClassValue[]): string {
  const output: string[] = [];

  for (const value of values) {
    flattenClassValue(value, output);
  }

  return output.join(" ");
}
