import { randomUUID } from "node:crypto";

import {
  assertTransition,
  RELEASE_TRANSITIONS,
  type ReleaseStatus,
} from "@studio-nova/data-contracts";
import { StringRecordId } from "surrealdb";

import { getSurreal } from "./surreal";
import { appendAuditEvent, type AuditActorType } from "./surreal-audit";
import { getBuildJobForUser, transitionBuildJob, type BuildJobRow } from "./surreal-builds";
import {
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
  tableRecordId,
} from "./surreal-records";

export type ReleaseRow = {
  id: unknown;
  _id: string;
  userId: string;
  studioId: string;
  workbenchId: string;
  buildJobId: string;
  revision: number;
  sourceRevision: string;
  status: ReleaseStatus;
  manifest: Record<string, unknown>;
  legacyDeploymentId?: string | null;
  createdAt: Date | string;
};

export type ReleaseArtifactRow = {
  id: unknown;
  _id: string;
  releaseId: string;
  targetProfileId: string;
  kind: string;
  uri: string;
  sha256: string;
  sizeBytes: number;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
};

export type ReleaseArtifactInput = {
  kind: string;
  uri: string;
  sha256: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
};

export function validateArtifact(input: ReleaseArtifactInput) {
  const kind = input.kind.trim();
  const uri = input.uri.trim();
  if (!kind) throw new Error("Artifact kind is required");
  if (!/^[a-f0-9]{64}$/.test(input.sha256)) {
    throw new Error("Artifact sha256 must be 64 lowercase hexadecimal characters");
  }
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 0) {
    throw new Error("Artifact sizeBytes must be a non-negative safe integer");
  }
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Artifact uri must be an absolute durable URI");
  }
  if (!parsed.protocol || parsed.username || parsed.password) {
    throw new Error("Artifact uri must not contain embedded credentials");
  }
  return { ...input, kind, uri };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

function artifactComparable(artifact: ReleaseArtifactInput | ReleaseArtifactRow) {
  return stableValue({
    kind: artifact.kind,
    uri: artifact.uri,
    sha256: artifact.sha256,
    sizeBytes: artifact.sizeBytes,
    metadata: artifact.metadata ?? {},
  });
}

function sortedArtifacts(artifacts: Array<ReleaseArtifactInput | ReleaseArtifactRow>) {
  return artifacts
    .map((artifact) => JSON.stringify(artifactComparable(artifact)))
    .sort((left, right) => left.localeCompare(right));
}

export function assertReleaseRetryMatches(
  existing: Pick<ReleaseRow, "sourceRevision" | "manifest">,
  existingArtifacts: ReleaseArtifactRow[],
  input: {
    sourceRevision: string;
    manifest: Record<string, unknown>;
    artifacts: ReleaseArtifactInput[];
  },
) {
  const current = JSON.stringify(
    stableValue({
      sourceRevision: existing.sourceRevision,
      manifest: existing.manifest,
      artifacts: sortedArtifacts(existingArtifacts),
    }),
  );
  const requested = JSON.stringify(
    stableValue({
      sourceRevision: input.sourceRevision,
      manifest: input.manifest,
      artifacts: sortedArtifacts(input.artifacts),
    }),
  );
  if (current !== requested) {
    throw new Error("A Release already exists for this Build Job with different immutable data");
  }
}

export async function getReleaseForUser(userId: string, releaseId: string) {
  const db = await getSurreal();
  const rows = await queryRows<ReleaseRow>(
    db,
    "SELECT * FROM release WHERE id = $releaseId LIMIT 1",
    { releaseId: tableRecordId("release", normalizeRouteParam(releaseId)) },
  );
  if (!rows[0] || rows[0].userId !== userId) return null;
  return normalizeSurrealRow<ReleaseRow>(rows[0]);
}

export async function listReleasesForStudio(userId: string, studioId: string) {
  const db = await getSurreal();
  const rows = await queryRows<ReleaseRow>(
    db,
    "SELECT * FROM release WHERE userId = $userId AND studioId = $studioId ORDER BY createdAt DESC",
    { userId, studioId: tableRecordId("studio", normalizeRouteParam(studioId)) },
  );
  return normalizeSurrealRows<ReleaseRow>(rows);
}

export async function listReleaseArtifacts(releaseId: string) {
  const db = await getSurreal();
  const rows = await queryRows<ReleaseArtifactRow>(
    db,
    "SELECT * FROM release_artifact WHERE releaseId = $releaseId ORDER BY kind ASC",
    { releaseId: tableRecordId("release", normalizeRouteParam(releaseId)) },
  );
  return normalizeSurrealRows<ReleaseArtifactRow>(rows);
}

async function releaseForBuildJob(buildJobId: string) {
  const db = await getSurreal();
  const rows = await queryRows<ReleaseRow>(
    db,
    "SELECT * FROM release WHERE buildJobId = $buildJobId LIMIT 1",
    { buildJobId: tableRecordId("build_job", normalizeRouteParam(buildJobId)) },
  );
  return rows[0] ? normalizeSurrealRow<ReleaseRow>(rows[0]) : null;
}

async function nextWorkbenchRevision(workbenchId: string) {
  const db = await getSurreal();
  const rows = await queryRows<Pick<ReleaseRow, "revision">>(
    db,
    "SELECT revision FROM release WHERE workbenchId = $workbenchId ORDER BY revision DESC LIMIT 1",
    { workbenchId: tableRecordId("workbench", normalizeRouteParam(workbenchId)) },
  );
  return Number(rows[0]?.revision ?? 0) + 1;
}

async function transitionRelease(
  release: ReleaseRow,
  status: ReleaseStatus,
  actor: { type: AuditActorType; id: string } = {
    type: "service",
    id: "nova-build-control",
  },
) {
  assertTransition(RELEASE_TRANSITIONS, release.status, status);
  const db = await getSurreal();
  const updated = await db.update(tableRecordId("release", release._id)).merge({ status });
  const updatedRelease = normalizeSurrealRow<ReleaseRow>(updated);
  await appendAuditEvent({
    actorType: actor.type,
    actorId: actor.id,
    action: "release.transitioned",
    targetType: "release",
    targetId: release._id,
    studioId: release.studioId,
    outcome: status === "failed" ? "failed" : "succeeded",
    details: { previousStatus: release.status, status },
  });
  return updatedRelease;
}

async function createReleaseRecord(job: BuildJobRow, manifest: Record<string, unknown>) {
  const db = await getSurreal();
  const key = randomUUID().replaceAll("-", "");
  const created = (await db.create(new StringRecordId(`release:${key}`)).content({
    userId: job.userId,
    studioId: tableRecordId("studio", job.studioId),
    workbenchId: tableRecordId("workbench", job.workbenchId),
    buildJobId: tableRecordId("build_job", job._id),
    revision: await nextWorkbenchRevision(job.workbenchId),
    sourceRevision: job.sourceRevision,
    status: "assembling",
    manifest,
    createdAt: new Date(),
  })) as unknown as ReleaseRow;
  const release = normalizeSurrealRow<ReleaseRow>(created);
  await appendAuditEvent({
    actorType: "service",
    actorId: "nova-build-control",
    action: "release.created",
    targetType: "release",
    targetId: release._id,
    studioId: job.studioId,
    outcome: "succeeded",
    details: {
      buildJobId: job._id,
      workbenchId: job.workbenchId,
      revision: release.revision,
      sourceRevision: job.sourceRevision,
      status: release.status,
    },
  });
  return release;
}

async function createArtifact(release: ReleaseRow, job: BuildJobRow, input: ReleaseArtifactInput) {
  const db = await getSurreal();
  const key = randomUUID().replaceAll("-", "");
  const created = (await db.create(new StringRecordId(`release_artifact:${key}`)).content({
    releaseId: tableRecordId("release", release._id),
    targetProfileId: tableRecordId("build_target_profile", job.targetProfileId),
    ...input,
    metadata: input.metadata ?? {},
    createdAt: new Date(),
  })) as unknown as ReleaseArtifactRow;
  const artifact = normalizeSurrealRow<ReleaseArtifactRow>(created);
  await appendAuditEvent({
    actorType: "service",
    actorId: "nova-build-control",
    action: "release_artifact.created",
    targetType: "release_artifact",
    targetId: artifact._id,
    studioId: release.studioId,
    outcome: "succeeded",
    details: {
      releaseId: release._id,
      targetProfileId: job.targetProfileId,
      kind: artifact.kind,
      uri: artifact.uri,
      sha256: artifact.sha256,
      sizeBytes: artifact.sizeBytes,
    },
  });
  return artifact;
}

export async function createReleaseForBuild(input: {
  userId: string;
  buildJobId: string;
  manifest: Record<string, unknown>;
  artifacts: ReleaseArtifactInput[];
}) {
  if (input.artifacts.length === 0) throw new Error("At least one Release artifact is required");
  const artifacts = input.artifacts.map(validateArtifact);
  const job = await getBuildJobForUser(input.userId, input.buildJobId);
  if (!job) throw new Error("Build Job not found");

  const existing = await releaseForBuildJob(job._id);
  if (existing) {
    const existingArtifacts = await listReleaseArtifacts(existing._id);
    assertReleaseRetryMatches(existing, existingArtifacts, {
      sourceRevision: job.sourceRevision,
      manifest: input.manifest,
      artifacts,
    });
    return { release: existing, artifacts: existingArtifacts, created: false };
  }
  if (job.status !== "uploading") {
    throw new Error(`Build Job must be uploading before Release assembly; received ${job.status}`);
  }

  let release: ReleaseRow | null = null;
  try {
    release = await createReleaseRecord(job, input.manifest);
    const createdArtifacts: ReleaseArtifactRow[] = [];
    for (const artifact of artifacts) {
      createdArtifacts.push(await createArtifact(release, job, artifact));
    }
    release = await transitionRelease(release, "ready");
    await transitionBuildJob(job, "succeeded", { releaseId: release._id });
    return { release, artifacts: createdArtifacts, created: true };
  } catch (error) {
    if (release?.status === "assembling")
      await transitionRelease(release, "failed").catch(() => {});
    await transitionBuildJob(job, "failed", {
      failure: {
        code: "release_assembly_failed",
        message: error instanceof Error ? error.message : "Release assembly failed",
      },
    }).catch(() => {});
    throw error;
  }
}

export async function revokeRelease(userId: string, releaseId: string) {
  const release = await getReleaseForUser(userId, releaseId);
  if (!release) throw new Error("Release not found");
  return transitionRelease(release, "revoked", { type: "user", id: userId });
}
