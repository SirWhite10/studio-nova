import type {
  BaseProps,
  CanvasActionContext,
  CanvasNode,
  CanvasProviderActions,
  CanvasProviderData,
} from "$lib/base/canvas/types.js";
import type { CardAction, CardRootProps } from "./schema.js";

export interface ExecuteCardActionsOptions {
  node: CanvasNode<BaseProps>;
  actions?: CardAction[];
  href?: string;
  target?: CardRootProps["target"];
  rel?: string;
  providerActions?: CanvasProviderActions;
  providerData?: CanvasProviderData;
}

export function hasCardTapActions(options: {
  actions?: CardAction[];
  href?: string;
  interactive?: boolean;
  onclick?: unknown;
}): boolean {
  return Boolean(
    options.interactive ||
    options.href ||
    options.actions?.some((action) => action.event === "tap") ||
    options.onclick,
  );
}

export async function executeCardTapActions({
  node,
  actions = [],
  href,
  target,
  rel,
  providerActions = {},
  providerData = {},
}: ExecuteCardActionsOptions): Promise<void> {
  let didNavigate = false;

  for (const [index, action] of actions.entries()) {
    if (action.event !== "tap") {
      continue;
    }

    if (action.type === "provider") {
      const handler = providerActions[action.source]?.[action.action];
      if (!handler) {
        continue;
      }

      const context: CanvasActionContext = {
        node,
        actionProp: `actions.${index}`,
        args: [],
        providerData,
      };

      await handler(action.payload, context);
      continue;
    }

    if (action.type === "emit") {
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent(`canvas:${action.name}`, {
            detail: {
              node,
              payload: action.payload,
            },
          }),
        );
      }
      continue;
    }

    didNavigate = true;
    navigate(action.url, action.target, action.rel);
  }

  if (!didNavigate && href) {
    navigate(href, target, rel);
  }
}

function navigate(url: string, target: CardRootProps["target"], rel: string | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  if (target && target !== "_self") {
    const features = rel?.includes("noreferrer") ? "noreferrer" : "noopener";
    window.open(url, target, features);
    return;
  }

  window.location.assign(url);
}
