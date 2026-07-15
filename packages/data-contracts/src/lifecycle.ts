export const NODE_ROLES = ["forge", "horizon", "habitat"] as const;
export type NodeRole = (typeof NODE_ROLES)[number];

export const NODE_STATUSES = [
  "registering",
  "online",
  "degraded",
  "offline",
  "draining",
  "retired",
] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

export const WORKBENCH_STATUSES = [
  "creating",
  "ready",
  "busy",
  "paused",
  "expired",
  "failed",
  "archived",
] as const;
export type WorkbenchStatus = (typeof WORKBENCH_STATUSES)[number];

export const WORKBENCH_INSTANCE_STATUSES = [
  "allocating",
  "starting",
  "ready",
  "busy",
  "pausing",
  "paused",
  "stopping",
  "stopped",
  "expired",
  "unhealthy",
  "failed",
] as const;
export type WorkbenchInstanceStatus = (typeof WORKBENCH_INSTANCE_STATUSES)[number];

export const BUILD_JOB_STATUSES = [
  "queued",
  "assigned",
  "preparing",
  "building",
  "uploading",
  "succeeded",
  "failed",
  "canceled",
] as const;
export type BuildJobStatus = (typeof BUILD_JOB_STATUSES)[number];

export const RELEASE_STATUSES = ["assembling", "ready", "failed", "revoked"] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const DEPLOYMENT_STATUSES = [
  "pending",
  "provisioning",
  "verifying",
  "ready",
  "activating",
  "active",
  "degraded",
  "failed",
  "stopped",
  "superseded",
] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export const RUNTIME_INSTANCE_STATUSES = [
  "provisioning",
  "starting",
  "healthy",
  "unhealthy",
  "draining",
  "stopped",
  "failed",
] as const;
export type RuntimeInstanceStatus = (typeof RUNTIME_INSTANCE_STATUSES)[number];

export const ROUTE_STATUSES = [
  "pending",
  "validating",
  "active",
  "degraded",
  "disabled",
  "failed",
] as const;
export type RouteStatus = (typeof ROUTE_STATUSES)[number];

type TransitionMap<State extends string> = Readonly<Record<State, readonly State[]>>;

export const WORKBENCH_TRANSITIONS: TransitionMap<WorkbenchStatus> = {
  creating: ["ready", "failed", "archived"],
  ready: ["busy", "paused", "expired", "failed", "archived"],
  busy: ["ready", "paused", "failed", "archived"],
  paused: ["ready", "expired", "failed", "archived"],
  expired: ["ready", "archived"],
  failed: ["creating", "ready", "archived"],
  archived: [],
};

export const WORKBENCH_INSTANCE_TRANSITIONS: TransitionMap<WorkbenchInstanceStatus> = {
  allocating: ["starting", "stopping", "failed"],
  starting: ["ready", "stopping", "unhealthy", "failed"],
  ready: ["busy", "pausing", "stopping", "unhealthy", "failed"],
  busy: ["ready", "pausing", "stopping", "unhealthy", "failed"],
  pausing: ["paused", "stopping", "failed"],
  paused: ["starting", "stopping", "expired", "failed"],
  stopping: ["stopped", "failed"],
  stopped: [],
  expired: [],
  unhealthy: ["starting", "stopping", "failed"],
  failed: [],
};

export const BUILD_JOB_TRANSITIONS: TransitionMap<BuildJobStatus> = {
  queued: ["assigned", "canceled", "failed"],
  assigned: ["preparing", "canceled", "failed"],
  preparing: ["building", "canceled", "failed"],
  building: ["uploading", "canceled", "failed"],
  uploading: ["succeeded", "failed"],
  succeeded: [],
  failed: [],
  canceled: [],
};

export const RELEASE_TRANSITIONS: TransitionMap<ReleaseStatus> = {
  assembling: ["ready", "failed"],
  ready: ["revoked"],
  failed: [],
  revoked: [],
};

export const DEPLOYMENT_TRANSITIONS: TransitionMap<DeploymentStatus> = {
  pending: ["provisioning", "failed", "stopped"],
  provisioning: ["verifying", "failed", "stopped"],
  verifying: ["ready", "failed", "stopped"],
  ready: ["activating", "stopped", "failed"],
  activating: ["active", "failed"],
  active: ["degraded", "stopped", "superseded"],
  degraded: ["active", "stopped", "superseded", "failed"],
  failed: ["provisioning", "stopped"],
  stopped: ["provisioning", "superseded"],
  superseded: [],
};

export const RUNTIME_INSTANCE_TRANSITIONS: TransitionMap<RuntimeInstanceStatus> = {
  provisioning: ["starting", "stopped", "failed"],
  starting: ["healthy", "unhealthy", "draining", "stopped", "failed"],
  healthy: ["unhealthy", "draining", "stopped", "failed"],
  unhealthy: ["starting", "healthy", "draining", "stopped", "failed"],
  draining: ["stopped", "failed"],
  stopped: [],
  failed: [],
};

export const ROUTE_TRANSITIONS: TransitionMap<RouteStatus> = {
  pending: ["validating", "disabled", "failed"],
  validating: ["active", "disabled", "failed"],
  active: ["degraded", "disabled", "failed"],
  degraded: ["active", "disabled", "failed"],
  disabled: ["validating"],
  failed: ["validating", "disabled"],
};

export function canTransition<State extends string>(
  transitions: TransitionMap<State>,
  from: State,
  to: State,
): boolean {
  return from === to || transitions[from].includes(to);
}

export function assertTransition<State extends string>(
  transitions: TransitionMap<State>,
  from: State,
  to: State,
): void {
  if (!canTransition(transitions, from, to)) {
    throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
  }
}
