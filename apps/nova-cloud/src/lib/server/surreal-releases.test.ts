import { describe, expect, it } from "vite-plus/test";

import {
  assertReleaseRetryMatches,
  validateArtifact,
  type ReleaseArtifactRow,
} from "./surreal-releases";

const sha256 = "a".repeat(64);

describe("Release integrity", () => {
  it("accepts durable checksummed artifacts", () => {
    expect(
      validateArtifact({
        kind: "static-bundle",
        uri: "s3://nova-releases/studio/release.tar.gz",
        sha256,
        sizeBytes: 42,
      }),
    ).toMatchObject({ kind: "static-bundle", sha256, sizeBytes: 42 });
  });

  it("rejects malformed checksums, sizes, and credential-bearing URIs", () => {
    expect(() =>
      validateArtifact({ kind: "bundle", uri: "relative.tgz", sha256, sizeBytes: 1 }),
    ).toThrow("absolute durable URI");
    expect(() =>
      validateArtifact({
        kind: "bundle",
        uri: "https://user:password@example.test/bundle.tgz",
        sha256,
        sizeBytes: 1,
      }),
    ).toThrow("embedded credentials");
    expect(() =>
      validateArtifact({ kind: "bundle", uri: "s3://bucket/key", sha256: "ABC", sizeBytes: -1 }),
    ).toThrow("sha256");
  });

  it("allows idempotent retries but rejects Release mutation", () => {
    const artifact = {
      id: "release_artifact:one",
      _id: "one",
      releaseId: "release:one",
      targetProfileId: "build_target_profile:web_pwa",
      kind: "static-bundle",
      uri: "s3://nova-releases/one.tgz",
      sha256,
      sizeBytes: 10,
      metadata: { format: "tar.gz" },
      createdAt: new Date(),
    } satisfies ReleaseArtifactRow;
    const existing = { sourceRevision: "git:abc", manifest: { command: "serve" } };
    const input = {
      sourceRevision: "git:abc",
      manifest: { command: "serve" },
      artifacts: [artifact],
    };
    expect(() => assertReleaseRetryMatches(existing, [artifact], input)).not.toThrow();
    expect(() =>
      assertReleaseRetryMatches(existing, [artifact], {
        ...input,
        manifest: { command: "different" },
      }),
    ).toThrow("different immutable data");
  });
});
