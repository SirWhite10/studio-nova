import { afterAll, describe, expect, it } from "vite-plus/test";

import { closeSurreal, getSurreal } from "./surreal";
import { createBuildJob, transitionBuildJob } from "./surreal-builds";
import {
  activateDeployment,
  createDeployment,
  deploymentHealthGate,
  getDeploymentForUser,
  markDeploymentRuntimeHealthy,
  prepareRollbackDeployment,
  registerDeploymentRuntime,
  selectRollbackRelease,
} from "./surreal-deployments";
import { createReleaseForBuild, getReleaseForUser } from "./surreal-releases";
import { createWorkbenchForStudio, stopWorkbenchInstance } from "./surreal-workbenches";

describe("Deployment activation", () => {
  const deployment = {
    _id: "deployment-one",
    status: "ready" as const,
    releaseId: "release:new",
    previousReleaseId: "release:old",
  };

  it("requires a healthy Runtime Instance owned by the Deployment", () => {
    expect(deploymentHealthGate(deployment, null)).toMatchObject({ allowed: false });
    expect(
      deploymentHealthGate(deployment, {
        deploymentId: "deployment:deployment-one",
        status: "unhealthy",
      }),
    ).toMatchObject({ allowed: false, reason: "Runtime Instance is unhealthy" });
    expect(
      deploymentHealthGate(deployment, {
        deploymentId: "deployment:another",
        status: "healthy",
      }),
    ).toMatchObject({
      allowed: false,
      reason: "Runtime Instance belongs to a different Deployment",
    });
    expect(
      deploymentHealthGate(deployment, {
        deploymentId: "deployment:deployment-one",
        status: "healthy",
      }),
    ).toEqual({ allowed: true, reason: null });
  });

  it("selects the previous immutable Release without rebuilding", () => {
    expect(selectRollbackRelease(deployment)).toBe("old");
    expect(selectRollbackRelease(deployment, "release:selected")).toBe("selected");
    expect(() => selectRollbackRelease(deployment, "release:new")).toThrow("must differ");
  });
});

const integration = process.env.DEPLOYMENT_INTEGRATION === "1" ? describe : describe.skip;

integration("Build, Release, and Deployment repository integration", () => {
  afterAll(async () => closeSurreal());

  it("preserves active traffic across a failed replacement and rolls back without rebuilding", async () => {
    const key = `${Date.now()}`;
    const db = await getSurreal();
    await db.query(`
      UPSERT constellation:integration CONTENT {
        key: 'integration', name: 'Integration', status: 'active',
        metadata: {}, createdAt: time::now(), updatedAt: time::now()
      };
      UPSERT infrastructure_node:integration_forge CONTENT {
        constellationId: constellation:integration, nodeKey: 'integration-forge',
        role: 'forge', displayName: 'Integration Forge', hostname: 'forge.integration',
        status: 'online', capabilities: {
          operatingSystems: ['linux'], architectures: ['x86_64'],
          toolchains: ['node-24'], runtimes: ['containerd'],
          features: ['package:web-bundle', 'target:web', 'target:pwa']
        }, lastHeartbeatAt: time::now(), metadata: {},
        createdAt: time::now(), updatedAt: time::now()
      };
      UPSERT infrastructure_node:integration_habitat CONTENT {
        constellationId: constellation:integration, nodeKey: 'integration-habitat',
        role: 'habitat', displayName: 'Integration Habitat', hostname: 'habitat.integration',
        status: 'online', capabilities: { runtimes: ['containerd'], features: ['k3s'] },
        lastHeartbeatAt: time::now(), metadata: {},
        createdAt: time::now(), updatedAt: time::now()
      };
    `);

    const { workbench } = await createWorkbenchForStudio({
      userId: "fixture-user",
      studioId: "studio_one",
      name: `Deployment integration ${key}`,
    });

    async function readyRelease(sourceRevision: string, artifactByte: string) {
      const created = await createBuildJob({
        userId: "fixture-user",
        studioId: "studio_one",
        workbenchId: workbench._id,
        targetProfileId: "web-pwa",
        sourceRevision,
      });
      expect(created.job.status).toBe("assigned");
      let job = await transitionBuildJob(created.job, "preparing");
      job = await transitionBuildJob(job, "building");
      job = await transitionBuildJob(job, "uploading");
      const input = {
        userId: "fixture-user",
        buildJobId: job._id,
        manifest: { runtimeImage: "node:24-alpine", port: 4173, healthPath: "/" },
        artifacts: [
          {
            kind: "static-bundle",
            uri: `https://artifacts.example.test/${sourceRevision}.tar.gz`,
            sha256: artifactByte.repeat(64),
            sizeBytes: 100,
          },
        ],
      };
      const release = await createReleaseForBuild(input);
      expect(release.release.status).toBe("ready");
      expect((await createReleaseForBuild(input)).created).toBe(false);
      return release.release;
    }

    async function makeHealthy(
      deployment: Awaited<ReturnType<typeof createDeployment>>["deployment"],
    ) {
      const registered = await registerDeploymentRuntime({
        deployment,
        nodeId: "integration_habitat",
        provider: "integration",
        providerInstanceId: `runtime-${deployment._id}-${key}`,
        serviceKey: `service-${deployment._id}-${key}`,
        healthCheck: { path: "/" },
      });
      return markDeploymentRuntimeHealthy(registered.deployment);
    }

    const releaseOne = await readyRelease(`source-one-${key}`, "a");
    await expect(
      db.query(
        "UPDATE type::record('release', $releaseId) SET sourceRevision = 'mutated-directly'",
        { releaseId: releaseOne._id },
      ),
    ).rejects.toThrow("ready Release content is immutable");
    await expect(
      db.query(
        "UPDATE release_artifact SET sizeBytes = 999 WHERE releaseId = type::record('release', $releaseId)",
        { releaseId: releaseOne._id },
      ),
    ).rejects.toThrow("Release artifacts are immutable");
    const first = await createDeployment({
      userId: "fixture-user",
      studioId: "studio_one",
      releaseId: releaseOne._id,
      environment: "production",
    });
    const firstHealthy = await makeHealthy(first.deployment);
    const firstActive = await activateDeployment(firstHealthy.deployment);
    expect(firstActive.deployment.status).toBe("active");

    const releaseTwo = await readyRelease(`source-two-${key}`, "b");
    expect(releaseTwo.revision).toBe(releaseOne.revision + 1);
    const second = await createDeployment({
      userId: "fixture-user",
      studioId: "studio_one",
      releaseId: releaseTwo._id,
      environment: "production",
    });
    await expect(activateDeployment(second.deployment)).rejects.toThrow("no Runtime Instance");
    expect((await getDeploymentForUser("fixture-user", firstActive.deployment._id))?.status).toBe(
      "active",
    );

    const secondHealthy = await makeHealthy(second.deployment);
    const secondActive = await activateDeployment(secondHealthy.deployment);
    expect(secondActive.deployment.status).toBe("active");
    expect(secondActive.superseded?._id).toBe(firstActive.deployment._id);

    const rollback = await prepareRollbackDeployment({
      userId: "fixture-user",
      deployment: secondActive.deployment,
    });
    expect(rollback.release._id).toBe(releaseOne._id);
    const rollbackHealthy = await makeHealthy(rollback.deployment);
    const rollbackActive = await activateDeployment(rollbackHealthy.deployment);
    expect(rollbackActive.deployment.releaseId).toBe(releaseOne._id);
    expect(rollbackActive.deployment.status).toBe("active");

    const stoppedWorkbench = await stopWorkbenchInstance(workbench);
    expect(stoppedWorkbench.workbench.status).toBe("paused");
    expect((await getReleaseForUser("fixture-user", releaseOne._id))?.status).toBe("ready");
  });
});
