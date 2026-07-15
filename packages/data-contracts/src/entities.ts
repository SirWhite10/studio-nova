import type {
  BuildJobStatus,
  DeploymentStatus,
  NodeRole,
  NodeStatus,
  ReleaseStatus,
  RouteStatus,
  RuntimeInstanceStatus,
  WorkbenchInstanceStatus,
  WorkbenchStatus,
} from "./lifecycle.js";
import type { RecordId } from "./ids.js";

export type IsoDateTime = string;
export type SecretReference = `secret://${string}`;

export interface SecretBinding {
  name: string;
  reference: SecretReference;
  injectAs: "environment" | "file" | "signing-material";
}

export interface FailureDetail {
  code: string;
  message: string;
}

export interface NodeCapabilities {
  operatingSystems: string[];
  architectures: string[];
  toolchains: string[];
  runtimes: string[];
  features: string[];
  capacity?: Record<string, number>;
}

export interface Constellation {
  id: RecordId<"constellation">;
  key: string;
  name: string;
  status: "provisioning" | "active" | "degraded" | "offline" | "retired";
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InfrastructureNode {
  id: RecordId<"infrastructure_node">;
  constellationId: RecordId<"constellation">;
  nodeKey: string;
  role: NodeRole;
  displayName: string;
  hostname: string;
  region?: string;
  status: NodeStatus;
  capabilities: NodeCapabilities;
  lastHeartbeatAt?: IsoDateTime;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Workbench {
  id: RecordId<"workbench">;
  userId: string;
  studioId: RecordId<"studio">;
  name: string;
  slug: string;
  status: WorkbenchStatus;
  sourceVolumeKey: string;
  activeInstanceId?: RecordId<"workbench_instance">;
  defaultTargetProfileId?: RecordId<"build_target_profile">;
  legacyWorkspaceId?: RecordId<"workspace">;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface WorkbenchInstance {
  id: RecordId<"workbench_instance">;
  workbenchId: RecordId<"workbench">;
  nodeId: RecordId<"infrastructure_node">;
  provider: string;
  providerInstanceId: string;
  status: WorkbenchInstanceStatus;
  sourceMountPath: string;
  previewEndpoint?: string;
  expiresAt?: IsoDateTime;
  lastHeartbeatAt?: IsoDateTime;
  failure?: FailureDetail;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BuildTargetProfile {
  id: RecordId<"build_target_profile">;
  key: string;
  displayName: string;
  platform: "web" | "android" | "ios" | "windows" | "macos" | "linux" | "server" | "worker";
  architecture?: string;
  toolchain: string;
  requiredCapabilities: string[];
  artifactKinds: string[];
  enabled: boolean;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BuildJob {
  id: RecordId<"build_job">;
  userId: string;
  studioId: RecordId<"studio">;
  workbenchId: RecordId<"workbench">;
  targetProfileId: RecordId<"build_target_profile">;
  nodeId?: RecordId<"infrastructure_node">;
  status: BuildJobStatus;
  sourceRevision: string;
  releaseId?: RecordId<"release">;
  queuedAt: IsoDateTime;
  startedAt?: IsoDateTime;
  endedAt?: IsoDateTime;
  failure?: FailureDetail;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Release {
  id: RecordId<"release">;
  userId: string;
  studioId: RecordId<"studio">;
  workbenchId: RecordId<"workbench">;
  buildJobId: RecordId<"build_job">;
  revision: number;
  sourceRevision: string;
  status: ReleaseStatus;
  manifest: Record<string, unknown>;
  createdAt: IsoDateTime;
}

export interface ReleaseArtifact {
  id: RecordId<"release_artifact">;
  releaseId: RecordId<"release">;
  targetProfileId: RecordId<"build_target_profile">;
  kind: string;
  uri: string;
  sha256: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
}

export interface Deployment {
  id: RecordId<"deployment">;
  userId: string;
  studioId: RecordId<"studio">;
  environment: "preview" | "staging" | "production";
  releaseId: RecordId<"release">;
  previousReleaseId?: RecordId<"release">;
  status: DeploymentStatus;
  activeRuntimeInstanceId?: RecordId<"runtime_instance">;
  activatedAt?: IsoDateTime;
  failure?: FailureDetail;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface RuntimeInstance {
  id: RecordId<"runtime_instance">;
  deploymentId: RecordId<"deployment">;
  nodeId: RecordId<"infrastructure_node">;
  provider: string;
  providerInstanceId: string;
  status: RuntimeInstanceStatus;
  serviceKey: string;
  healthCheck: Record<string, unknown>;
  startedAt?: IsoDateTime;
  stoppedAt?: IsoDateTime;
  failure?: FailureDetail;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DomainBinding {
  id: RecordId<"domain_binding">;
  userId: string;
  studioId: RecordId<"studio">;
  host: string;
  kind: "platform" | "custom";
  ownershipStatus: "pending" | "verified" | "failed" | "revoked";
  certificateStatus: "pending" | "issuing" | "active" | "renewal_due" | "failed" | "revoked";
  verificationToken?: string;
  verifiedAt?: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DeploymentRoute {
  id: RecordId<"deployment_route">;
  domainBindingId: RecordId<"domain_binding">;
  deploymentId: RecordId<"deployment">;
  horizonNodeId: RecordId<"infrastructure_node">;
  tunnelConnectorId: RecordId<"tunnel_connector">;
  status: RouteStatus;
  activatedAt?: IsoDateTime;
  failure?: FailureDetail;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export function missingCapabilities(
  required: readonly string[],
  available: readonly string[],
): string[] {
  const provided = new Set(available.map((value) => value.trim().toLowerCase()));
  return [...new Set(required.map((value) => value.trim().toLowerCase()))]
    .filter((value) => value && !provided.has(value))
    .sort();
}

const SECRET_REFERENCE_PATTERN =
  /^secret:\/\/[a-z0-9](?:[a-z0-9._-]{0,127})(?:\/[a-z0-9](?:[a-z0-9._-]{0,127}))*$/;
const SENSITIVE_FIELD_PATTERN =
  /(?:authorization|cookie|credential|password|privatekey|secret|signingkey|token|apikey)/;

export function isSecretReference(value: unknown): value is SecretReference {
  return typeof value === "string" && SECRET_REFERENCE_PATTERN.test(value);
}

export function assertSecretReference(value: unknown, label = "secret reference") {
  if (!isSecretReference(value)) {
    throw new Error(`${label} must be an opaque secret:// reference`);
  }
  return value;
}

function sensitiveFieldName(value: string) {
  return SENSITIVE_FIELD_PATTERN.test(value.replace(/[^a-z0-9]/gi, "").toLowerCase());
}

export function assertOpaqueSecretReferences(value: unknown, path = "payload"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertOpaqueSecretReferences(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (entry !== null && entry !== undefined && sensitiveFieldName(key)) {
      if (typeof entry === "string") {
        if (!isSecretReference(entry)) {
          throw new Error(`${childPath} contains inline secret material`);
        }
        continue;
      }
      if (Array.isArray(entry) && entry.every((candidate) => typeof candidate === "string")) {
        if (!entry.every((candidate) => isSecretReference(candidate))) {
          throw new Error(`${childPath} contains inline secret material`);
        }
        continue;
      }
      if (typeof entry !== "object") {
        throw new Error(`${childPath} contains inline secret material`);
      }
    }
    assertOpaqueSecretReferences(entry, childPath);
  }
}
