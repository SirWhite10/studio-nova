import { runtimeNamespace, sanitizeKubernetesName } from "./names.ts";
import { runtimeAgentScript } from "./agent-script.ts";

export type SmokeRuntimeManifestInput = {
  namespacePrefix: string;
  studioId: string;
  image: string;
  runtimeAgentToken: string;
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
kind: Pod
metadata:
  name: runtime
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
spec:
  restartPolicy: Always
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
      ports:
        - name: agent
          containerPort: 8788
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
  volumes:
    - name: workspace
      persistentVolumeClaim:
        claimName: workspace
    - name: runtime-agent
      configMap:
        name: runtime-agent
`;
}

export const createSmokeRuntimeManifest = createRuntimeManifest;
