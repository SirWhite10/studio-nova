DEFINE TABLE build_target_profile TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;
DEFINE FIELD key ON build_target_profile TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD displayName ON build_target_profile TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD platform ON build_target_profile TYPE string ASSERT $value IN ['web', 'android', 'ios', 'windows', 'macos', 'linux', 'server', 'worker'];
DEFINE FIELD architecture ON build_target_profile TYPE none | string;
DEFINE FIELD toolchain ON build_target_profile TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD requiredCapabilities ON build_target_profile TYPE array<string> DEFAULT [];
DEFINE FIELD artifactKinds ON build_target_profile TYPE array<string> DEFAULT [];
DEFINE FIELD enabled ON build_target_profile TYPE bool DEFAULT true;
DEFINE FIELD metadata ON build_target_profile TYPE none | object FLEXIBLE;
DEFINE FIELD createdAt ON build_target_profile TYPE datetime DEFAULT time::now();
DEFINE FIELD updatedAt ON build_target_profile TYPE datetime DEFAULT time::now();
DEFINE INDEX build_target_profile_key_idx ON build_target_profile FIELDS key UNIQUE;
DEFINE INDEX build_target_profile_platform_idx ON build_target_profile FIELDS platform, enabled;

DEFINE TABLE build_job TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;
DEFINE FIELD userId ON build_job TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD studioId ON build_job TYPE record<studio>;
DEFINE FIELD workbenchId ON build_job TYPE record<workbench>;
DEFINE FIELD targetProfileId ON build_job TYPE record<build_target_profile>;
DEFINE FIELD nodeId ON build_job TYPE none | record<infrastructure_node>;
DEFINE FIELD status ON build_job TYPE string ASSERT $value IN ['queued', 'assigned', 'preparing', 'building', 'uploading', 'succeeded', 'failed', 'canceled'];
DEFINE FIELD sourceRevision ON build_job TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD releaseId ON build_job TYPE none | record<release>;
DEFINE FIELD queuedAt ON build_job TYPE datetime DEFAULT time::now();
DEFINE FIELD startedAt ON build_job TYPE none | datetime;
DEFINE FIELD endedAt ON build_job TYPE none | datetime;
DEFINE FIELD failure ON build_job TYPE none | object FLEXIBLE;
DEFINE FIELD metadata ON build_job TYPE none | object FLEXIBLE;
DEFINE FIELD createdAt ON build_job TYPE datetime DEFAULT time::now();
DEFINE FIELD updatedAt ON build_job TYPE datetime DEFAULT time::now();
DEFINE INDEX build_job_studio_idx ON build_job FIELDS studioId;
DEFINE INDEX build_job_workbench_idx ON build_job FIELDS workbenchId;
DEFINE INDEX build_job_node_status_idx ON build_job FIELDS nodeId, status;
DEFINE INDEX build_job_status_queued_idx ON build_job FIELDS status, queuedAt;

DEFINE TABLE release TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;
DEFINE FIELD userId ON release TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD studioId ON release TYPE record<studio>;
DEFINE FIELD workbenchId ON release TYPE record<workbench>;
DEFINE FIELD buildJobId ON release TYPE record<build_job>;
DEFINE FIELD revision ON release TYPE int ASSERT $value > 0;
DEFINE FIELD sourceRevision ON release TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD status ON release TYPE string ASSERT $value IN ['assembling', 'ready', 'failed', 'revoked'];
DEFINE FIELD manifest ON release TYPE object FLEXIBLE;
DEFINE FIELD legacyDeploymentId ON release TYPE none | record<workspace_deployment>;
DEFINE FIELD createdAt ON release TYPE datetime DEFAULT time::now();
DEFINE INDEX release_workbench_revision_idx ON release FIELDS workbenchId, revision UNIQUE;
DEFINE INDEX release_build_job_idx ON release FIELDS buildJobId UNIQUE;
DEFINE INDEX release_legacy_deployment_idx ON release FIELDS legacyDeploymentId UNIQUE;

DEFINE EVENT OVERWRITE release_immutable ON TABLE release
WHEN $event = 'DELETE' OR
  $event = 'UPDATE' AND
  $before.status IN ['ready', 'revoked'] AND (
    $before.userId != $after.userId OR
    $before.studioId != $after.studioId OR
    $before.workbenchId != $after.workbenchId OR
    $before.buildJobId != $after.buildJobId OR
    $before.revision != $after.revision OR
    $before.sourceRevision != $after.sourceRevision OR
    $before.manifest != $after.manifest OR
    $before.status = 'ready' AND $after.status NOT IN ['ready', 'revoked'] OR
    $before.status = 'revoked' AND $after.status != 'revoked'
  )
THEN {
  THROW 'ready Release content is immutable';
};

DEFINE TABLE release_artifact TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;
DEFINE FIELD releaseId ON release_artifact TYPE record<release>;
DEFINE FIELD targetProfileId ON release_artifact TYPE record<build_target_profile>;
DEFINE FIELD kind ON release_artifact TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD uri ON release_artifact TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD sha256 ON release_artifact TYPE string ASSERT string::len($value) = 64;
DEFINE FIELD sizeBytes ON release_artifact TYPE int ASSERT $value >= 0;
DEFINE FIELD metadata ON release_artifact TYPE none | object FLEXIBLE;
DEFINE FIELD createdAt ON release_artifact TYPE datetime DEFAULT time::now();
DEFINE INDEX release_artifact_identity_idx ON release_artifact FIELDS releaseId, targetProfileId, kind UNIQUE;
DEFINE INDEX release_artifact_release_idx ON release_artifact FIELDS releaseId;

DEFINE EVENT OVERWRITE release_artifact_immutable ON TABLE release_artifact
WHEN $event IN ['UPDATE', 'DELETE']
THEN {
  THROW 'Release artifacts are immutable';
};
