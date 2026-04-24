export function planDisplayMessage(plan: string) {
  if (plan === "pro") {
    return "Pro plan — up to 3 active runtimes, 24hr sandbox sessions, and longer agent runs.";
  }
  return "Free plan — 1 active runtime, 1hr sandbox sessions, and shorter guarded agent runs.";
}

export type ColorPreset = {
  name: string;
  hue: number;
  gradient: string;
  swatch: string;
};

export const COLOR_PRESETS: ColorPreset[] = [
  {
    name: "Amber",
    hue: 25,
    gradient: "from-amber-400/80 via-orange-500/70 to-rose-500/80",
    swatch: "bg-amber-500",
  },
  {
    name: "Sky",
    hue: 220,
    gradient: "from-cyan-400/80 via-sky-500/70 to-blue-600/80",
    swatch: "bg-sky-500",
  },
  {
    name: "Emerald",
    hue: 160,
    gradient: "from-emerald-400/80 via-teal-500/70 to-cyan-600/80",
    swatch: "bg-emerald-500",
  },
  {
    name: "Fuchsia",
    hue: 320,
    gradient: "from-fuchsia-400/80 via-pink-500/70 to-rose-600/80",
    swatch: "bg-fuchsia-500",
  },
  {
    name: "Violet",
    hue: 280,
    gradient: "from-violet-400/80 via-purple-500/70 to-indigo-600/80",
    swatch: "bg-violet-500",
  },
  {
    name: "Rose",
    hue: 10,
    gradient: "from-rose-400/80 via-red-500/70 to-orange-600/80",
    swatch: "bg-rose-500",
  },
  {
    name: "Teal",
    hue: 180,
    gradient: "from-teal-400/80 via-cyan-500/70 to-sky-600/80",
    swatch: "bg-teal-500",
  },
  {
    name: "Lime",
    hue: 90,
    gradient: "from-lime-400/80 via-green-500/70 to-emerald-600/80",
    swatch: "bg-lime-500",
  },
];

export type PurposeOption = {
  key: string;
  label: string;
  description: string;
  icon: string;
  defaultHue: number;
  gradient: string;
};

export const PURPOSE_OPTIONS: PurposeOption[] = [
  {
    key: "coding",
    label: "Coding",
    description: "Build, debug, and ship software with runtime access",
    icon: "terminal",
    defaultHue: 220,
    gradient: "from-cyan-400/80 via-sky-500/70 to-blue-600/80",
  },
  {
    key: "research",
    label: "Research",
    description: "Explore ideas, analyze data, and synthesize findings",
    icon: "layers",
    defaultHue: 160,
    gradient: "from-emerald-400/80 via-teal-500/70 to-cyan-600/80",
  },
  {
    key: "content",
    label: "Content",
    description: "Write, edit, and publish creative and marketing content",
    icon: "sparkles",
    defaultHue: 25,
    gradient: "from-amber-400/80 via-orange-500/70 to-rose-500/80",
  },
  {
    key: "general",
    label: "General",
    description: "A versatile studio for any kind of work",
    icon: "briefcase",
    defaultHue: 320,
    gradient: "from-fuchsia-400/80 via-pink-500/70 to-rose-600/80",
  },
];
