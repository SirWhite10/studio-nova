import { runtimeAgentScript } from "../runtime/agent-script.ts";
import { normalizeSystemPackages } from "../runtime/manifests.ts";
import { sanitizeKubernetesName } from "../runtime/names.ts";
import { workbenchResourceNames } from "./names.ts";

export interface WorkbenchManifestInput {
  namespacePrefix: string;
  studioId: string;
  workbenchId: string;
  sourceVolumeKey: string;
  image: string;
  runtimeAgentToken: string;
  systemPackages?: string[];
  storage?: string;
}

function indentBlock(content: string, spaces: number) {
  const indent = " ".repeat(spaces);
  return content
    .trim()
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function labels(input: WorkbenchManifestInput) {
  return `    app.kubernetes.io/name: nova-workbench
    nova.dlxstudios.com/studio-id: ${sanitizeKubernetesName(input.studioId)}
    nova.dlxstudios.com/workbench-id: ${sanitizeKubernetesName(input.workbenchId)}`;
}

export function createWorkbenchPersistentManifest(input: WorkbenchManifestInput) {
  const names = workbenchResourceNames(input.namespacePrefix, input.studioId, input.workbenchId);
  return `apiVersion: v1
kind: Namespace
metadata:
  name: ${names.namespace}
  labels:
    app.kubernetes.io/name: nova-workbench
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${names.sourceClaim}
  namespace: ${names.namespace}
  labels:
${labels(input)}
  annotations:
    nova.dlxstudios.com/source-volume-key: ${JSON.stringify(input.sourceVolumeKey)}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: ${input.storage ?? "2Gi"}
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: workbench-quota
  namespace: ${names.namespace}
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 3Gi
    limits.cpu: "4"
    limits.memory: 4Gi
    persistentvolumeclaims: "1"
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: workbench-default
  namespace: ${names.namespace}
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    - ports:
        - protocol: TCP
          port: 80
        - protocol: TCP
          port: 443
`;
}

export function createWorkbenchComputeManifest(input: WorkbenchManifestInput) {
  const names = workbenchResourceNames(input.namespacePrefix, input.studioId, input.workbenchId);
  const token = Buffer.from(input.runtimeAgentToken, "utf8").toString("base64");
  const packages = normalizeSystemPackages(input.systemPackages);
  return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${names.agentConfig}
  namespace: ${names.namespace}
  labels:
${labels(input)}
data:
  agent.mjs: |
${indentBlock(runtimeAgentScript, 4)}
  system-packages.txt: |
${indentBlock(packages.join("\n") || "# none", 4)}
---
apiVersion: v1
kind: Secret
metadata:
  name: ${names.agentSecret}
  namespace: ${names.namespace}
type: Opaque
data:
  token: ${token}
---
apiVersion: v1
kind: Pod
metadata:
  name: ${names.pod}
  namespace: ${names.namespace}
  labels:
${labels(input)}
spec:
  restartPolicy: Always
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: workbench
      image: ${input.image}
      imagePullPolicy: IfNotPresent
      command: ["node", "/opt/nova-runtime-agent/agent.mjs"]
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      env:
        - name: NOVA_WORKSPACE
          value: /workspace
        - name: NOVA_RUNTIME_AGENT_PORT
          value: "8788"
        - name: NOVA_RUNTIME_AGENT_TOKEN
          valueFrom:
            secretKeyRef:
              name: ${names.agentSecret}
              key: token
      ports:
        - name: agent
          containerPort: 8788
        - name: preview
          containerPort: 4173
      readinessProbe:
        tcpSocket:
          port: agent
        initialDelaySeconds: 2
        periodSeconds: 3
      resources:
        requests:
          cpu: 100m
          memory: 192Mi
        limits:
          cpu: "2"
          memory: 2Gi
      volumeMounts:
        - name: source
          mountPath: /workspace
        - name: agent
          mountPath: /opt/nova-runtime-agent
          readOnly: true
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: source
      persistentVolumeClaim:
        claimName: ${names.sourceClaim}
    - name: agent
      configMap:
        name: ${names.agentConfig}
    - name: tmp
      emptyDir:
        sizeLimit: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: ${names.service}
  namespace: ${names.namespace}
  labels:
${labels(input)}
spec:
  selector:
    app.kubernetes.io/name: nova-workbench
    nova.dlxstudios.com/workbench-id: ${sanitizeKubernetesName(input.workbenchId)}
  ports:
    - name: preview
      port: 4173
      targetPort: 4173
    - name: agent
      port: 8788
      targetPort: 8788
`;
}

export function createWorkbenchManifest(input: WorkbenchManifestInput) {
  return `${createWorkbenchPersistentManifest(input)}---\n${createWorkbenchComputeManifest(input)}`;
}
