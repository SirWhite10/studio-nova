import { getContext, setContext } from "svelte";

const SIDEBAR_STATE_KEY = "canvas-dashboard-sidebar-state";

export type DashboardSidebarState = {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  closeMobile: () => void;
};

export function setDashboardSidebarState(state: DashboardSidebarState) {
  setContext(SIDEBAR_STATE_KEY, state);
  return state;
}

export function getDashboardSidebarState(): DashboardSidebarState {
  return getContext<DashboardSidebarState>(SIDEBAR_STATE_KEY);
}
