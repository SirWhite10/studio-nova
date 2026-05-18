import { getContext, setContext } from "svelte";
import { IsMobile } from "$lib/hooks/is-mobile.svelte.js";
import { SIDEBAR_KEYBOARD_SHORTCUT } from "./constants.js";

type Getter<T> = () => T;

export type SidebarStateProps = {
  open: Getter<boolean>;
  setOpen: (open: boolean) => void;
};

export type SidebarRootConfig = {
  side: "left" | "right";
  variant: "sidebar" | "floating" | "inset";
  collapsible: "offcanvas" | "icon" | "none";
};

class SidebarState {
  readonly props: SidebarStateProps;
  open = $derived.by(() => this.props.open());
  openMobile = $state(false);
  setOpen: SidebarStateProps["setOpen"];
  #isMobile: IsMobile;
  state = $derived.by(() => (this.open ? "expanded" : "collapsed"));
  rootConfig = $state<SidebarRootConfig>({
    side: "left",
    variant: "sidebar",
    collapsible: "offcanvas",
  });

  constructor(props: SidebarStateProps) {
    this.setOpen = props.setOpen;
    this.#isMobile = new IsMobile();
    this.props = props;
  }

  get isMobile() {
    return this.#isMobile.current;
  }

  get isCollapsedToIcon() {
    return !this.isMobile && this.state === "collapsed" && this.rootConfig.collapsible === "icon";
  }

  configureRoot(config: SidebarRootConfig) {
    this.rootConfig = config;
  }

  handleShortcutKeydown = (event: KeyboardEvent) => {
    if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.toggle();
    }
  };

  setOpenMobile = (value: boolean) => {
    this.openMobile = value;
  };

  toggle = () => {
    if (this.isMobile) {
      this.openMobile = !this.openMobile;
      return;
    }

    this.setOpen(!this.open);
  };
}

const SYMBOL_KEY = "canvas-sidebar";

export function setSidebar(props: SidebarStateProps): SidebarState {
  return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}

export function useSidebar(): SidebarState {
  return getContext(Symbol.for(SYMBOL_KEY));
}
