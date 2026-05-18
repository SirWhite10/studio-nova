import type { ViewEventProps } from "./view.types.js";

/**
 * Event handler function type
 */
export type EventHandler<T extends Event = Event> = (event: T) => void | Promise<void>;

/**
 * Optional event handler type (for props)
 */
export type OptionalEventHandler<T extends Event = Event> =
  | EventHandler<T>
  | Function
  | null
  | undefined;

/**
 * Action execution context
 */
export interface ActionContext {
  element: HTMLElement;
  actionParams?: any;
  eventType: string;
  originalEvent: Event | null;
}

/**
 * Action executor function type
 */
export type ActionExecutor = (actionId: string, context: ActionContext) => Promise<void>;

/**
 * Event processing utilities
 */
export class ViewEventProcessor {
  private actionExecutor?: ActionExecutor;

  constructor(actionExecutor?: ActionExecutor) {
    this.actionExecutor = actionExecutor;
  }

  /**
   * Safely executes an event handler, handling both sync and async cases
   */
  private async safeExecuteHandler<T extends Event>(
    handler: OptionalEventHandler<T>,
    event: T,
  ): Promise<void> {
    if (handler) {
      const result = handler(event);
      if (result instanceof Promise) {
        await result;
      }
    }
  }

  /**
   * Checks if a keyboard event should trigger tap behavior
   */
  private isActivationKey(event: KeyboardEvent): boolean {
    return event.key === "Enter" || event.key === " ";
  }

  /**
   * Prevents default behavior for activation keys
   */
  private preventDefaultForActivationKeys(event: KeyboardEvent): void {
    if (this.isActivationKey(event)) {
      event.preventDefault();
    }
  }

  /**
   * Creates a tap handler that combines click and keyboard events
   */
  createTapHandler(
    ontap: OptionalEventHandler<MouseEvent | KeyboardEvent>,
    onActionTap?: string,
    actionParams?: any,
  ): {
    onclick?: EventHandler<MouseEvent>;
    onkeydown?: EventHandler<KeyboardEvent>;
  } {
    const handleClick = async (event: MouseEvent) => {
      // Execute direct tap handler
      await this.safeExecuteHandler(ontap, event);

      // Execute action if specified
      if (onActionTap && this.actionExecutor) {
        await this.actionExecutor(onActionTap, {
          element: event.currentTarget as HTMLElement,
          actionParams,
          eventType: "click",
          originalEvent: event,
        });
      }
    };

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (this.isActivationKey(event)) {
        this.preventDefaultForActivationKeys(event);

        // Execute direct tap handler
        await this.safeExecuteHandler(ontap, event);

        // Execute action if specified
        if (onActionTap && this.actionExecutor) {
          await this.actionExecutor(onActionTap, {
            element: event.currentTarget as HTMLElement,
            actionParams,
            eventType: "keydown",
            originalEvent: event,
          });
        }
      }
    };

    const handlers: {
      onclick?: EventHandler<MouseEvent>;
      onkeydown?: EventHandler<KeyboardEvent>;
    } = {};

    if (ontap || onActionTap) {
      handlers.onclick = handleClick;
      handlers.onkeydown = handleKeyDown;
    }

    return handlers;
  }

  /**
   * Creates a hover handler that combines mouse enter/leave
   */
  createHoverHandler(
    onhover: OptionalEventHandler<MouseEvent>,
    onhoverend: OptionalEventHandler<MouseEvent>,
    onActionHover?: string,
    onActionHoverEnd?: string,
    actionParams?: any,
  ): {
    onmouseenter?: EventHandler<MouseEvent>;
    onmouseleave?: EventHandler<MouseEvent>;
  } {
    const handleMouseEnter = async (event: MouseEvent) => {
      await this.safeExecuteHandler(onhover, event);

      if (onActionHover && this.actionExecutor) {
        await this.actionExecutor(onActionHover, {
          element: event.currentTarget as HTMLElement,
          actionParams,
          eventType: "mouseenter",
          originalEvent: event,
        });
      }
    };

    const handleMouseLeave = async (event: MouseEvent) => {
      await this.safeExecuteHandler(onhoverend, event);

      if (onActionHoverEnd && this.actionExecutor) {
        await this.actionExecutor(onActionHoverEnd, {
          element: event.currentTarget as HTMLElement,
          actionParams,
          eventType: "mouseleave",
          originalEvent: event,
        });
      }
    };

    const handlers: {
      onmouseenter?: EventHandler<MouseEvent>;
      onmouseleave?: EventHandler<MouseEvent>;
    } = {};

    if (onhover || onActionHover) {
      handlers.onmouseenter = handleMouseEnter;
    }

    if (onhoverend || onActionHoverEnd) {
      handlers.onmouseleave = handleMouseLeave;
    }

    return handlers;
  }

  /**
   * Creates a press handler for mouse down/up events
   */
  createPressHandler(
    onpress: OptionalEventHandler<MouseEvent>,
    onpressend: OptionalEventHandler<MouseEvent>,
    onActionPress?: string,
    onActionPressEnd?: string,
    actionParams?: any,
  ): {
    onmousedown?: EventHandler<MouseEvent>;
    onmouseup?: EventHandler<MouseEvent>;
  } {
    const handleMouseDown = async (event: MouseEvent) => {
      await this.safeExecuteHandler(onpress, event);

      if (onActionPress && this.actionExecutor) {
        await this.actionExecutor(onActionPress, {
          element: event.currentTarget as HTMLElement,
          actionParams,
          eventType: "mousedown",
          originalEvent: event,
        });
      }
    };

    const handleMouseUp = async (event: MouseEvent) => {
      await this.safeExecuteHandler(onpressend, event);

      if (onActionPressEnd && this.actionExecutor) {
        await this.actionExecutor(onActionPressEnd, {
          element: event.currentTarget as HTMLElement,
          actionParams,
          eventType: "mouseup",
          originalEvent: event,
        });
      }
    };

    const handlers: {
      onmousedown?: EventHandler<MouseEvent>;
      onmouseup?: EventHandler<MouseEvent>;
    } = {};

    if (onpress || onActionPress) {
      handlers.onmousedown = handleMouseDown;
    }

    if (onpressend || onActionPressEnd) {
      handlers.onmouseup = handleMouseUp;
    }

    return handlers;
  }

  /**
   * Creates focus handlers
   */
  createFocusHandler(
    onfocus: OptionalEventHandler<FocusEvent>,
    onblur: OptionalEventHandler<FocusEvent>,
    onActionFocus?: string,
    onActionBlur?: string,
    actionParams?: any,
  ): {
    onfocus?: EventHandler<FocusEvent>;
    onblur?: EventHandler<FocusEvent>;
  } {
    const handleFocus = async (event: FocusEvent) => {
      await this.safeExecuteHandler(onfocus, event);

      if (onActionFocus && this.actionExecutor) {
        await this.actionExecutor(onActionFocus, {
          element: event.currentTarget as HTMLElement,
          actionParams,
          eventType: "focus",
          originalEvent: event,
        });
      }
    };

    const handleBlur = async (event: FocusEvent) => {
      await this.safeExecuteHandler(onblur, event);

      if (onActionBlur && this.actionExecutor) {
        await this.actionExecutor(onActionBlur, {
          element: event.currentTarget as HTMLElement,
          actionParams,
          eventType: "blur",
          originalEvent: event,
        });
      }
    };

    const handlers: {
      onfocus?: EventHandler<FocusEvent>;
      onblur?: EventHandler<FocusEvent>;
    } = {};

    if (onfocus || onActionFocus) {
      handlers.onfocus = handleFocus;
    }

    if (onblur || onActionBlur) {
      handlers.onblur = handleBlur;
    }

    return handlers;
  }
}

/**
 * Creates all event handlers for a View component
 */
export function createViewEventHandlers(
  props: ViewEventProps,
  actionExecutor?: ActionExecutor,
): Record<string, EventHandler<any>> {
  const processor = new ViewEventProcessor(actionExecutor);

  const handlers: Record<string, EventHandler<any>> = {};

  // Tap handlers (click + keyboard)
  if (props.ontap || props.onActionTap) {
    const tapHandlers = processor.createTapHandler(
      props.ontap,
      props.onActionTap,
      props.actionParams,
    );
    Object.assign(handlers, tapHandlers);
  }

  // Hover handlers
  if (props.onhover || props.onhoverend || props.onActionHover || props.onActionHoverEnd) {
    const hoverHandlers = processor.createHoverHandler(
      props.onhover,
      props.onhoverend,
      props.onActionHover,
      props.onActionHoverEnd,
      props.actionParams,
    );
    Object.assign(handlers, hoverHandlers);
  }

  // Press handlers
  if (props.onpress || props.onpressend || props.onActionPress || props.onActionPressEnd) {
    const pressHandlers = processor.createPressHandler(
      props.onpress,
      props.onpressend,
      props.onActionPress,
      props.onActionPressEnd,
      props.actionParams,
    );
    Object.assign(handlers, pressHandlers);
  }

  // Focus handlers
  if (props.onfocus || props.onblur || props.onActionFocus || props.onActionBlur) {
    const focusHandlers = processor.createFocusHandler(
      props.onfocus,
      props.onblur,
      props.onActionFocus,
      props.onActionBlur,
      props.actionParams,
    );
    Object.assign(handlers, focusHandlers);
  }

  // Direct event handlers (not grouped)
  if (props.onkeydown) {
    const originalKeyDown = handlers.onkeydown;
    handlers.onkeydown = async (event: KeyboardEvent) => {
      // Call grouped handler first (if exists)
      if (originalKeyDown) {
        await originalKeyDown(event);
      }
      // Then call direct handler
      await props.onkeydown!(event);
    };
  }

  if (props.onkeyup) {
    handlers.onkeyup = props.onkeyup as EventHandler<any>;
  }

  // Mouse event handlers that aren't grouped
  if (props.onmouseenter && !props.onhover) {
    handlers.onmouseenter = props.onmouseenter as EventHandler<any>;
  }

  if (props.onmouseleave && !props.onhoverend) {
    handlers.onmouseleave = props.onmouseleave as EventHandler<any>;
  }

  if (props.onmousedown && !props.onpress) {
    handlers.onmousedown = props.onmousedown as EventHandler<any>;
  }

  if (props.onmouseup && !props.onpressend) {
    handlers.onmouseup = props.onmouseup as EventHandler<any>;
  }

  if (props.onmousemove) {
    handlers.onmousemove = props.onmousemove as EventHandler<any>;
  }

  if (props.onwheel) {
    handlers.onwheel = props.onwheel as EventHandler<any>;
  }

  return handlers;
}

/**
 * Default action executor - logs actions (for development)
 */
export const defaultActionExecutor: ActionExecutor = async (actionId, context) => {
  console.warn(`Action "${actionId}" not implemented. Context:`, context);
};

/**
 * Creates event handlers with default action executor
 */
export function createDefaultViewEventHandlers(
  props: ViewEventProps,
): Record<string, EventHandler<any>> {
  return createViewEventHandlers(props, defaultActionExecutor);
}
