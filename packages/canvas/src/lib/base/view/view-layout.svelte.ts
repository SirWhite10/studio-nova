import type { ViewProps } from "./view.types.js";

/**
 * Layout computation result
 */
export interface ViewLayoutResult {
  layoutStyles: Record<string, string>;
  computedSpacing: {
    padding: string;
    margin: string;
    gap: string;
  };
  flexboxStyles: Record<string, string>;
  gridStyles: Record<string, string>;
  positionStyles: Record<string, string>;
}

/**
 * Layout configuration for different display types
 */
export interface LayoutConfig {
  display: ViewProps["display"];
  flexDirection?: ViewProps["flexDirection"];
  alignItems?: ViewProps["alignItems"];
  justifyContent?: ViewProps["justifyContent"];
  gap?: ViewProps["gap"];
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: string;
}

/**
 * Spacing utilities
 */
export class ViewSpacingManager {
  /**
   * Normalize spacing value to CSS string
   */
  static normalizeSpacing(value: string | number | undefined): string {
    if (value === undefined || value === null) return "0";
    if (typeof value === "number") return `${value}px`;
    if (typeof value === "string") {
      // Handle CSS custom properties
      if (value.startsWith("--")) return `var(${value})`;
      // Handle calc() expressions
      if (value.includes("calc(")) return value;
      // Handle percentage, em, rem, vw, vh values
      if (value.match(/^\d+(\.\d+)?(px|em|rem|%|vw|vh|vmin|vmax)$/)) return value;
      // Handle unitless numbers
      if (value.match(/^\d+(\.\d+)?$/)) return `${value}px`;
      // Return as-is for other values
      return value;
    }
    return "0";
  }

  /**
   * Parse shorthand spacing values (like CSS padding/margin)
   */
  static parseSpacingShorthand(value: string | number | undefined): {
    top: string;
    right: string;
    bottom: string;
    left: string;
  } {
    const normalized = this.normalizeSpacing(value);
    const parts = normalized.split(/\s+/);

    switch (parts.length) {
      case 1:
        return {
          top: parts[0],
          right: parts[0],
          bottom: parts[0],
          left: parts[0],
        };
      case 2:
        return {
          top: parts[0],
          right: parts[1],
          bottom: parts[0],
          left: parts[1],
        };
      case 3:
        return {
          top: parts[0],
          right: parts[1],
          bottom: parts[2],
          left: parts[1],
        };
      case 4:
        return {
          top: parts[0],
          right: parts[1],
          bottom: parts[2],
          left: parts[3],
        };
      default:
        return { top: "0", right: "0", bottom: "0", left: "0" };
    }
  }

  /**
   * Compute responsive spacing based on breakpoints
   */
  static computeResponsiveSpacing(
    value: string | number | undefined,
    breakpoint?: "sm" | "md" | "lg" | "xl",
  ): string {
    const baseValue = this.normalizeSpacing(value);

    if (!breakpoint) return baseValue;

    // Apply responsive multipliers
    const multipliers = {
      sm: 0.75,
      md: 1,
      lg: 1.25,
      xl: 1.5,
    };

    const multiplier = multipliers[breakpoint];

    // Extract numeric value and unit
    const match = baseValue.match(/^(\d+(?:\.\d+)?)(.*)/);
    if (match) {
      const [, num, unit] = match;
      return `${Number.parseFloat(num) * multiplier}${unit}`;
    }

    return baseValue;
  }
}

/**
 * Flexbox layout manager
 */
export class ViewFlexboxManager {
  /**
   * Compute flexbox styles
   */
  static computeFlexboxStyles(props: ViewProps): Record<string, string> {
    const styles: Record<string, string> = {};

    if (props.display === "flex" || props.display === "inline-flex") {
      // Flex direction
      if (props.flexDirection) {
        styles["flex-direction"] = props.flexDirection;
      }

      // Flex wrap
      if (props.flexWrap) {
        styles["flex-wrap"] = props.flexWrap;
      }

      // Alignment
      if (props.alignItems) {
        styles["align-items"] =
          props.alignItems === "start"
            ? "flex-start"
            : props.alignItems === "end"
              ? "flex-end"
              : props.alignItems;
      }

      if (props.alignContent) {
        styles["align-content"] =
          props.alignContent === "start"
            ? "flex-start"
            : props.alignContent === "end"
              ? "flex-end"
              : props.alignContent === "between"
                ? "space-between"
                : props.alignContent === "around"
                  ? "space-around"
                  : props.alignContent === "evenly"
                    ? "space-evenly"
                    : props.alignContent;
      }

      // Justification
      if (props.justifyContent) {
        styles["justify-content"] =
          props.justifyContent === "start"
            ? "flex-start"
            : props.justifyContent === "end"
              ? "flex-end"
              : props.justifyContent === "between"
                ? "space-between"
                : props.justifyContent === "around"
                  ? "space-around"
                  : props.justifyContent === "evenly"
                    ? "space-evenly"
                    : props.justifyContent;
      }

      // Gap properties
      if (props.gap) {
        styles["gap"] = ViewSpacingManager.normalizeSpacing(props.gap);
      }

      if (props.rowGap) {
        styles["row-gap"] = ViewSpacingManager.normalizeSpacing(props.rowGap);
      }

      if (props.columnGap) {
        styles["column-gap"] = ViewSpacingManager.normalizeSpacing(props.columnGap);
      }

      // Flex properties
      if (props.flex !== undefined) {
        styles["flex"] = typeof props.flex === "number" ? props.flex.toString() : props.flex;
      }

      if (props.flexGrow !== undefined) {
        styles["flex-grow"] = props.flexGrow.toString();
      }

      if (props.flexShrink !== undefined) {
        styles["flex-shrink"] = props.flexShrink.toString();
      }

      if (props.flexBasis) {
        styles["flex-basis"] = ViewSpacingManager.normalizeSpacing(props.flexBasis);
      }
    }

    return styles;
  }

  /**
   * Compute flex item styles
   */
  static computeFlexItemStyles(props: ViewProps): Record<string, string> {
    const styles: Record<string, string> = {};

    // Flex properties for flex items
    if (props.flex !== undefined) {
      styles["flex"] = typeof props.flex === "number" ? props.flex.toString() : props.flex;
    }

    if (props.flexGrow !== undefined) {
      styles["flex-grow"] = props.flexGrow.toString();
    }

    if (props.flexShrink !== undefined) {
      styles["flex-shrink"] = props.flexShrink.toString();
    }

    if (props.flexBasis) {
      styles["flex-basis"] = ViewSpacingManager.normalizeSpacing(props.flexBasis);
    }

    // Self-alignment properties
    if (props.alignSelf) {
      styles["align-self"] =
        props.alignSelf === "start"
          ? "flex-start"
          : props.alignSelf === "end"
            ? "flex-end"
            : props.alignSelf;
    }

    if (props.justifySelf) {
      styles["justify-self"] =
        props.justifySelf === "start"
          ? "flex-start"
          : props.justifySelf === "end"
            ? "flex-end"
            : props.justifySelf;
    }

    return styles;
  }
}

/**
 * Grid layout manager
 */
export class ViewGridManager {
  /**
   * Compute grid styles
   */
  static computeGridStyles(props: ViewProps): Record<string, string> {
    const styles: Record<string, string> = {};

    if (props.display === "grid" || props.display === "inline-grid") {
      // Gap properties
      if (props.gap) {
        styles["gap"] = ViewSpacingManager.normalizeSpacing(props.gap);
      }

      if (props.rowGap) {
        styles["row-gap"] = ViewSpacingManager.normalizeSpacing(props.rowGap);
      }

      if (props.columnGap) {
        styles["column-gap"] = ViewSpacingManager.normalizeSpacing(props.columnGap);
      }

      // Alignment properties
      if (props.alignItems) {
        styles["align-items"] =
          props.alignItems === "start"
            ? "start"
            : props.alignItems === "end"
              ? "end"
              : props.alignItems;
      }

      if (props.alignContent) {
        styles["align-content"] =
          props.alignContent === "start"
            ? "start"
            : props.alignContent === "end"
              ? "end"
              : props.alignContent === "between"
                ? "space-between"
                : props.alignContent === "around"
                  ? "space-around"
                  : props.alignContent === "evenly"
                    ? "space-evenly"
                    : props.alignContent;
      }

      // Justification properties
      if (props.justifyContent) {
        styles["justify-content"] =
          props.justifyContent === "start"
            ? "start"
            : props.justifyContent === "end"
              ? "end"
              : props.justifyContent === "between"
                ? "space-between"
                : props.justifyContent === "around"
                  ? "space-around"
                  : props.justifyContent === "evenly"
                    ? "space-evenly"
                    : props.justifyContent;
      }

      if (props.justifyItems) {
        styles["justify-items"] =
          props.justifyItems === "start"
            ? "start"
            : props.justifyItems === "end"
              ? "end"
              : props.justifyItems;
      }

      if (props.gridTemplateColumns) {
        styles["grid-template-columns"] = props.gridTemplateColumns;
      }

      if (props.gridTemplateRows) {
        styles["grid-template-rows"] = props.gridTemplateRows;
      }

      if (props.gridAutoFlow) {
        styles["grid-auto-flow"] = props.gridAutoFlow;
      }
    }

    if (props.gridColumn) {
      styles["grid-column"] = props.gridColumn;
    }

    if (props.gridRow) {
      styles["grid-row"] = props.gridRow;
    }

    return styles;
  }

  /**
   * Auto-generate grid template based on content
   */
  static autoGenerateGridTemplate(
    childCount: number,
    preferredColumns: number = 2,
  ): { gridTemplateColumns: string; gridTemplateRows: string } {
    const columns = Math.min(childCount, preferredColumns);
    const rows = Math.ceil(childCount / columns);

    return {
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, auto)`,
    };
  }
}

/**
 * Position manager
 */
export class ViewPositionManager {
  /**
   * Compute position styles
   */
  static computePositionStyles(props: ViewProps): Record<string, string> {
    const styles: Record<string, string> = {};

    if (props.position) {
      styles["position"] = props.position;
    }

    // Position coordinates
    if (props.top !== undefined) {
      styles["top"] = ViewSpacingManager.normalizeSpacing(props.top);
    }
    if (props.right !== undefined) {
      styles["right"] = ViewSpacingManager.normalizeSpacing(props.right);
    }
    if (props.bottom !== undefined) {
      styles["bottom"] = ViewSpacingManager.normalizeSpacing(props.bottom);
    }
    if (props.left !== undefined) {
      styles["left"] = ViewSpacingManager.normalizeSpacing(props.left);
    }

    // Z-index
    if (props.zIndex !== undefined) {
      styles["z-index"] = props.zIndex.toString();
    }

    return styles;
  }
}

/**
 * Main layout manager class
 */
export class ViewLayoutManager {
  /**
   * Compute all layout styles
   */
  static computeLayoutStyles(props: ViewProps): ViewLayoutResult {
    const flexboxStyles = ViewFlexboxManager.computeFlexboxStyles(props);
    const gridStyles = ViewGridManager.computeGridStyles(props);
    const positionStyles = ViewPositionManager.computePositionStyles(props);

    // Compute spacing
    const computedSpacing = {
      padding: ViewSpacingManager.normalizeSpacing(props.padding),
      margin: ViewSpacingManager.normalizeSpacing(props.margin),
      gap: ViewSpacingManager.normalizeSpacing(props.gap),
    };

    // Combine all layout styles
    const layoutStyles: Record<string, string> = {
      ...flexboxStyles,
      ...gridStyles,
      ...positionStyles,
    };

    // Add display
    if (props.display) {
      layoutStyles["display"] = props.display;
    }

    // Add overflow
    if (props.overflow) {
      layoutStyles["overflow"] = props.overflow;
    }

    return {
      layoutStyles,
      computedSpacing,
      flexboxStyles,
      gridStyles,
      positionStyles,
    };
  }
}

/**
 * Layout optimization utilities
 */
export class ViewLayoutOptimizer {
  private static layoutCache = new Map<string, ViewLayoutResult>();

  /**
   * Generate cache key for layout props
   */
  private static generateCacheKey(props: ViewProps): string {
    const layoutProps = {
      display: props.display,
      flexDirection: props.flexDirection,
      alignItems: props.alignItems,
      justifyContent: props.justifyContent,
      gap: props.gap,
      position: props.position,
      top: props.top,
      right: props.right,
      bottom: props.bottom,
      left: props.left,
      zIndex: props.zIndex,
      overflow: props.overflow,
      padding: props.padding,
      margin: props.margin,
      flex: props.flex,
      gridTemplateColumns: props.gridTemplateColumns,
      gridTemplateRows: props.gridTemplateRows,
      gridAutoFlow: props.gridAutoFlow,
      gridColumn: props.gridColumn,
      gridRow: props.gridRow,
    };

    return JSON.stringify(layoutProps);
  }

  /**
   * Get optimized layout styles with caching
   */
  static getOptimizedLayoutStyles(props: ViewProps): ViewLayoutResult {
    const cacheKey = this.generateCacheKey(props);

    if (this.layoutCache.has(cacheKey)) {
      return this.layoutCache.get(cacheKey)!;
    }

    const result = ViewLayoutManager.computeLayoutStyles(props);
    this.layoutCache.set(cacheKey, result);

    return result;
  }

  /**
   * Clear layout cache
   */
  static clearCache(): void {
    this.layoutCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.layoutCache.size,
      keys: Array.from(this.layoutCache.keys()),
    };
  }
}

/**
 * Responsive layout utilities
 */
export class ViewResponsiveLayoutManager {
  /**
   * Compute responsive layout styles
   */
  static computeResponsiveLayoutStyles(
    props: ViewProps,
    breakpoint?: "sm" | "md" | "lg" | "xl",
  ): ViewLayoutResult {
    const baseResult = ViewLayoutManager.computeLayoutStyles(props);

    if (!breakpoint) return baseResult;

    // Apply responsive spacing
    const responsiveSpacing = {
      padding: ViewSpacingManager.computeResponsiveSpacing(props.padding, breakpoint),
      margin: ViewSpacingManager.computeResponsiveSpacing(props.margin, breakpoint),
      gap: ViewSpacingManager.computeResponsiveSpacing(props.gap, breakpoint),
    };

    return {
      ...baseResult,
      computedSpacing: responsiveSpacing,
    };
  }

  /**
   * Generate responsive CSS rules
   */
  static generateResponsiveCSS(props: ViewProps, componentId: string): string {
    const breakpoints = {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    };

    let css = "";

    for (const [bp, size] of Object.entries(breakpoints)) {
      const styles = this.computeResponsiveLayoutStyles(props, bp as any);

      if (Object.keys(styles.layoutStyles).length > 0) {
        css += `@media (min-width: ${size}) {
          #${componentId} {
            ${Object.entries(styles.layoutStyles)
              .map(([key, value]) => `${key}: ${value};`)
              .join("\n            ")}
          }
        }\n`;
      }
    }

    return css;
  }
}

/**
 * Main layout hook for components
 */
export function useViewLayout(
  getProps: () => ViewProps,
  getComponentId?: () => string | undefined,
) {
  // Compute layout styles with optimization
  const layoutResult = $derived(ViewLayoutOptimizer.getOptimizedLayoutStyles(getProps()));

  // Generate responsive CSS if needed
  const responsiveCSS = $derived(
    getComponentId?.()
      ? ViewResponsiveLayoutManager.generateResponsiveCSS(getProps(), getComponentId()!)
      : "",
  );

  return {
    get layoutStyles() {
      return layoutResult.layoutStyles;
    },
    get computedSpacing() {
      return layoutResult.computedSpacing;
    },
    get flexboxStyles() {
      return layoutResult.flexboxStyles;
    },
    get gridStyles() {
      return layoutResult.gridStyles;
    },
    get positionStyles() {
      return layoutResult.positionStyles;
    },
    get responsiveCSS() {
      return responsiveCSS;
    },
  };
}

/**
 * Utility function to merge layout styles with other styles
 */
export function mergeLayoutStyles(
  layoutStyles: Record<string, string>,
  otherStyles: Record<string, string>,
): Record<string, string> {
  return {
    ...layoutStyles,
    ...otherStyles,
  };
}

/**
 * Predefined layout presets
 */
export const layoutPresets = {
  // Common flexbox layouts
  flexRow: {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: "1rem",
  },
  flexColumn: {
    display: "flex" as const,
    flexDirection: "column" as const,
    alignItems: "stretch" as const,
    gap: "1rem",
  },
  flexCenter: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  flexSpaceBetween: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "between" as const,
  },

  // Grid layouts
  gridAuto: {
    display: "grid" as const,
    gap: "1rem",
  },
  gridTwoColumns: {
    display: "grid" as const,
    gap: "1rem",
    gridTemplateColumns: "repeat(2, 1fr)",
  },
  gridThreeColumns: {
    display: "grid" as const,
    gap: "1rem",
    gridTemplateColumns: "repeat(3, 1fr)",
  },

  // Positioned layouts
  absoluteCenter: {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  },
  fixedTop: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  stickyTop: {
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
} as const;
