CREATE studio:studio_one CONTENT {
  userId: 'fixture-user',
  name: 'Migration fixture',
  createdAt: 1700000000000,
  updatedAt: 1700000100000,
  lastOpenedAt: 1700000100000
};

CREATE workspace:legacy_one CONTENT {
  activeDeploymentId: 'workspace_deployment:legacy_deploy',
  buildCommand: 'vp build',
  buildPath: '/workspace',
  contentPath: '/workspace',
  createdAt: 1700000000000,
  defaultHost: 'fixture.example.test',
  framework: 'sveltekit',
  healthCheckPath: '/',
  installCommand: 'vp install',
  lifecycleMode: 'persistent',
  name: 'Legacy fixture',
  outputDir: 'build',
  publicHost: 'fixture.example.test',
  rootPath: '/workspace',
  runCommand: 'vp preview',
  runtimeImage: 'node:22',
  runtimeKind: 'node',
  sandboxId: 'legacy-sandbox-provider',
  scaffoldCommand: '',
  serveCommand: 'vp preview',
  slug: 'legacy-fixture',
  sourcePath: '/workspace',
  statePath: '/state/legacy-one',
  status: 'ready',
  studioId: 'studio:studio_one',
  templateKind: 'sveltekit',
  updatedAt: 1700000100000,
  userId: 'fixture-user'
};

CREATE sandbox:legacy_sandbox CONTENT {
  createdAt: 1700000000000,
  expiresAt: 1700003600000,
  lastUsedAt: 1700000100000,
  sandboxId: 'legacy-sandbox-provider',
  status: 'running',
  studioId: 'studio:studio_one',
  templateId: 'base',
  updatedAt: 1700000100000,
  userId: 'fixture-user',
  workspaceId: 'workspace:legacy_one'
};

CREATE workspace_deployment:legacy_deploy CONTENT {
  activatedAt: 1700000100000,
  artifactPath: '/artifacts/legacy-one',
  buildCommand: 'vp build',
  createdAt: 1700000000000,
  healthCheckPath: '/',
  lifecycleMode: 'persistent',
  metadata: { fixture: true },
  outputDir: 'build',
  publicHost: 'fixture.example.test',
  revision: 1,
  runCommand: 'vp preview',
  runtimeImage: 'node:22',
  runtimeKind: 'node',
  serveCommand: 'vp preview',
  statePath: '/state/deployments/legacy-one',
  status: 'active',
  studioId: 'studio:studio_one',
  updatedAt: 1700000100000,
  userId: 'fixture-user',
  workspaceId: 'workspace:legacy_one'
};

CREATE runtime_process:legacy_runtime CONTENT {
  command: 'vp preview',
  createdAt: 1700000000000,
  cwd: '/workspace',
  healthCheckPath: '/',
  label: 'web',
  lifecycleMode: 'persistent',
  logSummary: 'fixture runtime',
  metadata: { fixture: true },
  pid: 42,
  port: 3000,
  previewUrl: 'http://127.0.0.1:3000',
  publicHost: 'fixture.example.test',
  runCommand: 'vp preview',
  runtimeImage: 'node:22',
  runtimeKind: 'node',
  sandboxId: 'legacy-sandbox-provider',
  statePath: '/state/runtime',
  status: 'running',
  studioId: 'studio:studio_one',
  updatedAt: 1700000100000,
  userId: 'fixture-user',
  workspaceId: 'workspace:legacy_one'
};

CREATE frp_client:legacy_frp CONTENT {
  clientId: 'fixture-frp',
  clusterId: 'fixture',
  lastHeartbeatAt: 1700000100000,
  metadata: { fixture: true },
  status: 'online'
};

CREATE workspace_proxy:legacy_proxy CONTENT {
  createdAt: 1700000000000,
  enabled: true,
  frpcClientId: 'fixture-frp',
  localIP: '127.0.0.1',
  localPort: 3000,
  proxyName: 'fixture-proxy',
  proxyType: 'http',
  remotePort: NONE,
  runtimeId: 'runtime_process:legacy_runtime',
  studioId: 'studio:studio_one',
  updatedAt: 1700000100000,
  userId: 'fixture-user'
};

CREATE proxy_domain:legacy_domain CONTENT {
  createdAt: 1700000000000,
  host: 'fixture.example.test',
  kind: 'custom',
  proxyId: 'workspace_proxy:legacy_proxy',
  status: 'active',
  updatedAt: 1700000100000,
  verificationToken: 'fixture-token'
};
