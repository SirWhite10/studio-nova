import { runtimeNamespace, sanitizeKubernetesName } from "./names.ts";
import { runtimeAgentScript } from "./agent-script.ts";

export type SmokeRuntimeManifestInput = {
  namespacePrefix: string;
  studioId: string;
  image: string;
  runtimeAgentToken: string;
  systemPackages?: string[];
};

function indentBlock(content: string, spaces: number) {
  const indent = " ".repeat(spaces);
  return content
    .trim()
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}

export function createRuntimeManifest(input: SmokeRuntimeManifestInput) {
  const namespace = runtimeNamespace(input.namespacePrefix, input.studioId);
  const safeStudioId = sanitizeKubernetesName(input.studioId);
  const tokenBase64 = Buffer.from(input.runtimeAgentToken, "utf8").toString("base64");
  const systemPackages = normalizeSystemPackages(input.systemPackages);
  const packageCommand =
    systemPackages.length > 0
      ? [
          "mkdir -p /apk-root/etc/apk /apk-root/lib/apk/db /var/cache/apk",
          "cp /etc/apk/repositories /apk-root/etc/apk/repositories",
          "cp -R /etc/apk/keys /apk-root/etc/apk/keys",
          "if [ -f /apk-root/lib/apk/db/installed ]; then",
          `  apk add --update-cache --cache-dir /var/cache/apk --root /apk-root --no-scripts ${systemPackages.join(" ")}`,
          "else",
          `  apk add --update-cache --cache-dir /var/cache/apk --root /apk-root --initdb --no-scripts ${systemPackages.join(" ")}`,
          "fi",
        ].join("\n          ")
      : ":";

  return `apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: runtime-agent
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
data:
  agent.mjs: |
${indentBlock(runtimeAgentScript, 4)}
  system-packages.txt: |
${indentBlock(systemPackages.join("\n") || "# none", 4)}
---
apiVersion: v1
kind: Secret
metadata:
  name: runtime-agent-token
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
type: Opaque
data:
  token: ${tokenBase64}
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: workspace
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 256Mi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: apk-cache
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 512Mi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: apk-root
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: runtime
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
spec:
  restartPolicy: Always
  initContainers:
    - name: install-system-packages
      image: ${input.image}
      command:
        - sh
        - -c
        - |
          set -eu
          mkdir -p /apk-root /var/cache/apk
          ${packageCommand}
      resources:
        requests:
          cpu: 50m
          memory: 96Mi
        limits:
          cpu: 750m
          memory: 512Mi
      volumeMounts:
        - name: apk-cache
          mountPath: /var/cache/apk
        - name: apk-root
          mountPath: /apk-root
  containers:
    - name: runtime
      image: ${input.image}
      command: ["node", "/opt/nova-runtime-agent/agent.mjs"]
      env:
        - name: NOVA_WORKSPACE
          value: /workspace
        - name: NOVA_RUNTIME_AGENT_PORT
          value: "8788"
        - name: NOVA_RUNTIME_AGENT_TOKEN
          valueFrom:
            secretKeyRef:
              name: runtime-agent-token
              key: token
        - name: PATH
          value: /apk-root/bin:/apk-root/usr/bin:/apk-root/sbin:/apk-root/usr/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
        - name: LD_LIBRARY_PATH
          value: /apk-root/lib:/apk-root/usr/lib:/apk-root/usr/lib/pulseaudio:/usr/local/lib:/usr/lib:/lib
        - name: MAGICK_CONFIGURE_PATH
          value: /apk-root/etc/ImageMagick-7:/apk-root/usr/lib/ImageMagick-7.1.2/config-Q16HDRI:/apk-root/usr/share/ImageMagick-7
        - name: MAGICK_CODER_MODULE_PATH
          value: /apk-root/usr/lib/ImageMagick-7.1.2/modules-Q16HDRI/coders
        - name: MAGICK_FILTER_MODULE_PATH
          value: /apk-root/usr/lib/ImageMagick-7.1.2/modules-Q16HDRI/filters
      ports:
        - name: agent
          containerPort: 8788
        - name: preview
          containerPort: 4173
      resources:
        requests:
          cpu: 50m
          memory: 96Mi
        limits:
          cpu: 500m
          memory: 384Mi
      volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: runtime-agent
          mountPath: /opt/nova-runtime-agent
          readOnly: true
        - name: apk-root
          mountPath: /apk-root
          readOnly: true
        - name: apk-cache
          mountPath: /var/cache/apk
  volumes:
    - name: workspace
      persistentVolumeClaim:
        claimName: workspace
    - name: runtime-agent
      configMap:
        name: runtime-agent
    - name: apk-cache
      persistentVolumeClaim:
        claimName: apk-cache
    - name: apk-root
      persistentVolumeClaim:
        claimName: apk-root
---
apiVersion: v1
kind: Service
metadata:
  name: runtime-preview
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
spec:
  selector:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
  ports:
    - name: preview
      port: 4173
      targetPort: 4173
      protocol: TCP
`;
}

export const createSmokeRuntimeManifest = createRuntimeManifest;

export function normalizeSystemPackages(packages: string[] | undefined) {
  return [...new Set(packages ?? [])]
    .map((pkg) => pkg.trim().toLowerCase())
    .filter(Boolean)
    .filter((pkg) => /^[a-z0-9][a-z0-9+._-]*$/.test(pkg))
    .sort();
}
