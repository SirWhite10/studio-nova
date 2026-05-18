import type { BaseProps } from "$lib/base/canvas/types.js";

export const cardSizes = ["default", "sm"] as const;
export type CardSize = (typeof cardSizes)[number];

export const cardVariants = ["default", "outline", "elevated", "interactive"] as const;
export type CardVariant = (typeof cardVariants)[number];

export const cardActionEvents = ["tap"] as const;
export type CardActionEvent = (typeof cardActionEvents)[number];

export const cardActionTargets = ["_self", "_blank", "_parent", "_top"] as const;
export type CardActionTarget = (typeof cardActionTargets)[number];

export interface CardNavigateAction {
  event: "tap";
  type: "navigate";
  url: string;
  target?: CardActionTarget;
  rel?: string;
}

export interface CardProviderAction {
  event: "tap";
  type: "provider";
  source: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface CardEmitAction {
  event: "tap";
  type: "emit";
  name: string;
  payload?: Record<string, unknown>;
}

export type CardAction = CardNavigateAction | CardProviderAction | CardEmitAction;

export interface CardRootProps extends BaseProps {
  size?: CardSize;
  variant?: CardVariant;
  interactive?: boolean;
  disabled?: boolean;
  href?: string;
  target?: CardActionTarget;
  rel?: string;
  actions?: CardAction[];
}

export interface CardTextProps extends BaseProps {
  text?: string;
}
