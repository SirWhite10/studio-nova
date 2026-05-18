import type { ViewStyleProps } from "./view.types.js";

/**
 * Interaction state types
 */
export interface ViewInteractionStates {
  // Mouse states
  hover?: boolean;
  active?: boolean;
  focus?: boolean;

  // Keyboard states
  focusVisible?: boolean;

  // Component states
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;

  // Custom states
  pressed?: boolean;
  expanded?: boolean;
}

/**
 * State-based styling configuration
 */
export interface ViewStateStyles {
  // Base styles (always applied)
  base?: Partial<ViewStyleProps>;

  // Interaction states
  hover?: Partial<ViewStyleProps>;
  active?: Partial<ViewStyleProps>;
  focus?: Partial<ViewStyleProps>;
  focusVisible?: Partial<ViewStyleProps>;
  pressed?: Partial<ViewStyleProps>;

  // Component states
  disabled?: Partial<ViewStyleProps>;
  loading?: Partial<ViewStyleProps>;
  selected?: Partial<ViewStyleProps>;
  expanded?: Partial<ViewStyleProps>;

  // Combined states (for complex interactions)
  "hover:focus"?: Partial<ViewStyleProps>;
  "active:focus"?: Partial<ViewStyleProps>;
  "hover:active"?: Partial<ViewStyleProps>;
  "hover:selected"?: Partial<ViewStyleProps>;
  "focus:selected"?: Partial<ViewStyleProps>;
}

/**
 * Props for state-based styling
 */
export interface ViewStateProps {
  states?: ViewStateStyles;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
  expanded?: boolean;
}

/**
 * State manager class for handling interaction states
 */
export class ViewStateManager {
  private currentStates = $state<ViewInteractionStates>({
    hover: false,
    active: false,
    focus: false,
    focusVisible: false,
    disabled: false,
    loading: false,
    selected: false,
    pressed: false,
    expanded: false,
  });

  private stateStyles: ViewStateStyles = {};
  private element: HTMLElement | null = null;

  constructor(stateStyles: ViewStateStyles = {}) {
    this.stateStyles = stateStyles;
  }

  setStateStyles(stateStyles: ViewStateStyles = {}) {
    this.stateStyles = stateStyles;
  }

  /**
   * Initialize state manager with DOM element
   */
  init(element: HTMLElement) {
    this.element = element;
    this.setupEventListeners();
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    if (this.element) {
      this.removeEventListeners();
      this.element = null;
    }
  }

  /**
   * Update component states
   */
  updateStates(newStates: Partial<ViewInteractionStates>) {
    Object.assign(this.currentStates, newStates);
  }

  /**
   * Get current states
   */
  getStates(): ViewInteractionStates {
    return { ...this.currentStates };
  }

  /**
   * Setup event listeners for state detection
   */
  private setupEventListeners() {
    if (!this.element) return;

    // Mouse events
    this.element.addEventListener("mouseenter", this.handleMouseEnter);
    this.element.addEventListener("mouseleave", this.handleMouseLeave);
    this.element.addEventListener("mousedown", this.handleMouseDown);
    this.element.addEventListener("mouseup", this.handleMouseUp);

    // Focus events
    this.element.addEventListener("focus", this.handleFocus);
    this.element.addEventListener("blur", this.handleBlur);

    // Keyboard events
    this.element.addEventListener("keydown", this.handleKeyDown);
    this.element.addEventListener("keyup", this.handleKeyUp);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners() {
    if (!this.element) return;

    this.element.removeEventListener("mouseenter", this.handleMouseEnter);
    this.element.removeEventListener("mouseleave", this.handleMouseLeave);
    this.element.removeEventListener("mousedown", this.handleMouseDown);
    this.element.removeEventListener("mouseup", this.handleMouseUp);
    this.element.removeEventListener("focus", this.handleFocus);
    this.element.removeEventListener("blur", this.handleBlur);
    this.element.removeEventListener("keydown", this.handleKeyDown);
    this.element.removeEventListener("keyup", this.handleKeyUp);
  }

  /**
   * Mouse enter handler
   */
  private handleMouseEnter = (_event: MouseEvent) => {
    this.currentStates.hover = true;
  };

  /**
   * Mouse leave handler
   */
  private handleMouseLeave = (_event: MouseEvent) => {
    this.currentStates.hover = false;
    this.currentStates.active = false;
    this.currentStates.pressed = false;
  };

  /**
   * Mouse down handler
   */
  private handleMouseDown = (_event: MouseEvent) => {
    this.currentStates.active = true;
    this.currentStates.pressed = true;
  };

  /**
   * Mouse up handler
   */
  private handleMouseUp = (_event: MouseEvent) => {
    this.currentStates.active = false;
    this.currentStates.pressed = false;
  };

  /**
   * Focus handler
   */
  private handleFocus = (event: FocusEvent) => {
    this.currentStates.focus = true;

    // Determine if focus is visible (keyboard navigation)
    this.currentStates.focusVisible = this.isFocusVisible(event);
  };

  /**
   * Blur handler
   */
  private handleBlur = (_event: FocusEvent) => {
    this.currentStates.focus = false;
    this.currentStates.focusVisible = false;
  };

  /**
   * Key down handler
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    // Handle activation keys
    if (event.key === "Enter" || event.key === " ") {
      this.currentStates.active = true;
      this.currentStates.pressed = true;
    }

    // Update focus visible state
    this.currentStates.focusVisible = true;
  };

  /**
   * Key up handler
   */
  private handleKeyUp = (event: KeyboardEvent) => {
    // Handle activation keys
    if (event.key === "Enter" || event.key === " ") {
      this.currentStates.active = false;
      this.currentStates.pressed = false;
    }
  };

  /**
   * Determine if focus should be visible
   */
  private isFocusVisible(event: FocusEvent): boolean {
    // Focus is visible if it was triggered by keyboard
    // This is a simplified implementation
    return event.relatedTarget !== null || (event.target as HTMLElement)?.matches(":focus-visible");
  }

  /**
   * Get computed styles based on current states
   */
  getComputedStyles(): Partial<ViewStyleProps> {
    const styles: Partial<ViewStyleProps> = {};

    // Apply base styles
    if (this.stateStyles.base) {
      Object.assign(styles, this.stateStyles.base);
    }

    // Apply state-specific styles
    if (this.currentStates.hover && this.stateStyles.hover) {
      Object.assign(styles, this.stateStyles.hover);
    }

    if (this.currentStates.active && this.stateStyles.active) {
      Object.assign(styles, this.stateStyles.active);
    }

    if (this.currentStates.focus && this.stateStyles.focus) {
      Object.assign(styles, this.stateStyles.focus);
    }

    if (this.currentStates.focusVisible && this.stateStyles.focusVisible) {
      Object.assign(styles, this.stateStyles.focusVisible);
    }

    if (this.currentStates.pressed && this.stateStyles.pressed) {
      Object.assign(styles, this.stateStyles.pressed);
    }

    if (this.currentStates.disabled && this.stateStyles.disabled) {
      Object.assign(styles, this.stateStyles.disabled);
    }

    if (this.currentStates.loading && this.stateStyles.loading) {
      Object.assign(styles, this.stateStyles.loading);
    }

    if (this.currentStates.selected && this.stateStyles.selected) {
      Object.assign(styles, this.stateStyles.selected);
    }

    if (this.currentStates.expanded && this.stateStyles.expanded) {
      Object.assign(styles, this.stateStyles.expanded);
    }

    // Apply combined state styles
    if (this.currentStates.hover && this.currentStates.focus && this.stateStyles["hover:focus"]) {
      Object.assign(styles, this.stateStyles["hover:focus"]);
    }

    if (this.currentStates.active && this.currentStates.focus && this.stateStyles["active:focus"]) {
      Object.assign(styles, this.stateStyles["active:focus"]);
    }

    if (this.currentStates.hover && this.currentStates.active && this.stateStyles["hover:active"]) {
      Object.assign(styles, this.stateStyles["hover:active"]);
    }

    if (
      this.currentStates.hover &&
      this.currentStates.selected &&
      this.stateStyles["hover:selected"]
    ) {
      Object.assign(styles, this.stateStyles["hover:selected"]);
    }

    if (
      this.currentStates.focus &&
      this.currentStates.selected &&
      this.stateStyles["focus:selected"]
    ) {
      Object.assign(styles, this.stateStyles["focus:selected"]);
    }

    return styles;
  }
}

/**
 * Create a state manager instance
 */
export function createViewStateManager(stateStyles: ViewStateStyles = {}): ViewStateManager {
  return new ViewStateManager(stateStyles);
}

/**
 * Hook for using view states in components
 */
export function useViewStates(
  getElement: () => HTMLElement | null,
  getStateStyles: () => ViewStateStyles = () => ({}),
  getInitialStates: () => Partial<ViewInteractionStates> = () => ({}),
) {
  const stateManager = createViewStateManager();

  // Initialize with element
  $effect(() => {
    stateManager.setStateStyles(getStateStyles());
    stateManager.updateStates(getInitialStates());
    const element = getElement();

    if (element) {
      stateManager.init(element);

      // Cleanup on destroy
      return () => {
        stateManager.destroy();
      };
    }
  });

  // Return reactive computed styles
  return {
    get currentStates() {
      return stateManager.getStates();
    },
    get computedStyles() {
      return stateManager.getComputedStyles();
    },
    updateStates: (newStates: Partial<ViewInteractionStates>) => {
      stateManager.updateStates(newStates);
    },
  };
}

/**
 * Utility function to merge state styles
 */
export function mergeStateStyles(...styleObjects: ViewStateStyles[]): ViewStateStyles {
  const merged: ViewStateStyles = {};

  for (const styles of styleObjects) {
    for (const [key, value] of Object.entries(styles)) {
      if (merged[key as keyof ViewStateStyles]) {
        merged[key as keyof ViewStateStyles] = {
          ...merged[key as keyof ViewStateStyles],
          ...value,
        };
      } else {
        merged[key as keyof ViewStateStyles] = value;
      }
    }
  }

  return merged;
}

/**
 * Predefined state style presets
 */
export const statePresets = {
  button: {
    base: {
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    hover: {
      opacity: 0.9,
      transform: "translateY(-1px)",
    },
    active: {
      transform: "translateY(0)",
      opacity: 0.8,
    },
    focus: {
      outline: "2px solid var(--focus-ring)",
      outlineOffset: "2px",
    },
    disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
  } as ViewStateStyles,

  card: {
    base: {
      transition: "all 0.3s ease",
    },
    hover: {
      transform: "translateY(-2px)",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
    },
    focus: {
      outline: "2px solid var(--focus-ring)",
      outlineOffset: "2px",
    },
  } as ViewStateStyles,

  interactive: {
    base: {
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    hover: {
      background: "var(--hover-bg, rgba(0, 0, 0, 0.05))",
    },
    active: {
      background: "var(--active-bg, rgba(0, 0, 0, 0.1))",
    },
    "hover:focus": {
      background: "var(--hover-focus-bg, rgba(0, 0, 0, 0.08))",
    },
  } as ViewStateStyles,
} as const;
