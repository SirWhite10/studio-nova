UPSERT build_target_profile:web_static CONTENT {
  key: 'web-static',
  displayName: 'Web (Static)',
  platform: 'web',
  architecture: 'x86_64',
  toolchain: 'node-24',
  requiredCapabilities: ['os:linux', 'arch:x86_64', 'toolchain:node-24', 'package:web-bundle', 'target:web'],
  artifactKinds: ['static-bundle', 'provenance'],
  enabled: true,
  metadata: { supportsPwa: false, nativeHostRequired: false },
  createdAt: time::now(),
  updatedAt: time::now()
};

UPSERT build_target_profile:web_pwa CONTENT {
  key: 'web-pwa',
  displayName: 'Web / PWA',
  platform: 'web',
  architecture: 'x86_64',
  toolchain: 'node-24',
  requiredCapabilities: ['os:linux', 'arch:x86_64', 'toolchain:node-24', 'package:web-bundle', 'target:web', 'target:pwa'],
  artifactKinds: ['static-bundle', 'server-bundle'],
  enabled: true,
  metadata: { supportsPwa: true, nativeHostRequired: false },
  createdAt: time::now(),
  updatedAt: time::now()
};

UPSERT build_target_profile:android_flutter CONTENT {
  key: 'android-flutter',
  displayName: 'Android (Flutter)',
  platform: 'android',
  architecture: 'multi',
  toolchain: 'flutter',
  requiredCapabilities: ['os:linux', 'arch:x86_64', 'toolchain:flutter', 'toolchain:android-sdk', 'package:android', 'signing:android', 'target:android'],
  artifactKinds: ['apk', 'aab', 'symbols'],
  enabled: true,
  metadata: { signing: 'secret-reference', signingPurpose: 'android-release' },
  createdAt: time::now(),
  updatedAt: time::now()
};

UPSERT build_target_profile:ios_flutter CONTENT {
  key: 'ios-flutter',
  displayName: 'iOS (Flutter)',
  platform: 'ios',
  architecture: 'arm64',
  toolchain: 'flutter',
  requiredCapabilities: ['os:macos', 'arch:arm64', 'toolchain:flutter', 'toolchain:xcode', 'package:apple', 'signing:apple', 'target:ios'],
  artifactKinds: ['ipa', 'symbols'],
  enabled: true,
  metadata: { signing: 'secret-reference', signingPurpose: 'apple-distribution', nativeHostRequired: true },
  createdAt: time::now(),
  updatedAt: time::now()
};

UPSERT build_target_profile:macos_flutter CONTENT {
  key: 'macos-flutter',
  displayName: 'macOS (Flutter)',
  platform: 'macos',
  architecture: 'universal',
  toolchain: 'flutter',
  requiredCapabilities: ['os:macos', 'arch:arm64', 'toolchain:flutter', 'toolchain:xcode', 'package:apple', 'signing:apple', 'target:macos'],
  artifactKinds: ['app', 'dmg', 'symbols'],
  enabled: true,
  metadata: { signing: 'secret-reference', signingPurpose: 'apple-distribution', nativeHostRequired: true },
  createdAt: time::now(),
  updatedAt: time::now()
};

UPSERT build_target_profile:windows_flutter CONTENT {
  key: 'windows-flutter',
  displayName: 'Windows (Flutter)',
  platform: 'windows',
  architecture: 'x86_64',
  toolchain: 'flutter',
  requiredCapabilities: ['os:windows', 'arch:x86_64', 'toolchain:flutter', 'toolchain:visual-studio', 'package:windows', 'signing:windows', 'target:windows'],
  artifactKinds: ['msix', 'zip', 'symbols'],
  enabled: true,
  metadata: { signing: 'secret-reference', signingPurpose: 'windows-code-signing', nativeHostRequired: true },
  createdAt: time::now(),
  updatedAt: time::now()
};

UPSERT build_target_profile:linux_flutter CONTENT {
  key: 'linux-flutter',
  displayName: 'Linux Desktop (Flutter)',
  platform: 'linux',
  architecture: 'x86_64',
  toolchain: 'flutter',
  requiredCapabilities: ['os:linux', 'arch:x86_64', 'toolchain:flutter', 'package:linux', 'target:linux'],
  artifactKinds: ['appimage', 'tar'],
  enabled: true,
  metadata: { nativeHostRequired: false },
  createdAt: time::now(),
  updatedAt: time::now()
};

UPSERT build_target_profile:server_node CONTENT {
  key: 'server-node',
  displayName: 'Node Server',
  platform: 'server',
  architecture: 'x86_64',
  toolchain: 'node-24',
  requiredCapabilities: ['os:linux', 'arch:x86_64', 'toolchain:node-24', 'runtime:containerd', 'package:oci', 'target:server'],
  artifactKinds: ['oci-image', 'provenance'],
  enabled: true,
  metadata: { nativeHostRequired: false },
  createdAt: time::now(),
  updatedAt: time::now()
};

UPSERT build_target_profile:worker_node CONTENT {
  key: 'worker-node',
  displayName: 'Node Worker',
  platform: 'worker',
  architecture: 'x86_64',
  toolchain: 'node-24',
  requiredCapabilities: ['os:linux', 'arch:x86_64', 'toolchain:node-24', 'package:worker-bundle', 'target:worker'],
  artifactKinds: ['worker-bundle', 'provenance'],
  enabled: true,
  metadata: { nativeHostRequired: false },
  createdAt: time::now(),
  updatedAt: time::now()
};

UPSERT schema_release:constellation_v1 CONTENT {
  key: 'constellation-v1',
  version: 1,
  phase: 'expand',
  compatibleServices: ['nova-cloud', 'nova-runtime-control', 'nova-domain-control', 'nova-edge'],
  notes: 'Additive Constellation lifecycle schema with legacy compatibility.',
  appliedAt: time::now()
};
