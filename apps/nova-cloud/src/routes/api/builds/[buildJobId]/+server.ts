import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { BUILD_JOB_STATUSES, type BuildJobStatus } from "@studio-nova/data-contracts";
import { getBuildJobForUser, transitionBuildJob } from "$lib/server/surreal-builds";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import {
  createReleaseForBuild,
  getReleaseForUser,
  listReleaseArtifacts,
  type ReleaseArtifactInput,
} from "$lib/server/surreal-releases";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const job = await getBuildJobForUser(userId, normalizeRouteParam(event.params.buildJobId));
  if (!job) return json({ error: "Build Job not found" }, { status: 404 });
  const release = job.releaseId ? await getReleaseForUser(userId, job.releaseId) : null;
  const artifacts = release ? await listReleaseArtifacts(release._id) : [];
  return json({ job, release, artifacts });
};

export const PATCH: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const job = await getBuildJobForUser(userId, normalizeRouteParam(event.params.buildJobId));
  if (!job) return json({ error: "Build Job not found" }, { status: 404 });
  const body = (await event.request.json().catch(() => ({}))) as {
    status?: string;
    manifest?: Record<string, unknown>;
    artifacts?: ReleaseArtifactInput[];
    failure?: Record<string, unknown>;
  };

  if (body.status === "succeeded") {
    if (!body.manifest || !Array.isArray(body.artifacts)) {
      return json(
        { error: "manifest and artifacts are required to complete a build" },
        { status: 400 },
      );
    }
    return json(
      await createReleaseForBuild({
        userId,
        buildJobId: job._id,
        manifest: body.manifest,
        artifacts: body.artifacts,
      }),
    );
  }

  if (!body.status || !BUILD_JOB_STATUSES.includes(body.status as BuildJobStatus)) {
    return json({ error: "A valid Build Job status is required" }, { status: 400 });
  }
  const updated = await transitionBuildJob(job, body.status as BuildJobStatus, {
    failure: body.failure,
  });
  return json({ job: updated });
};
