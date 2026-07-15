import { sanitizeKubernetesName } from "../runtime/names.ts";
import { deploymentResourceNames } from "./names.ts";

export type DeploymentArtifact = {
  kind: string;
  uri: string;
  sha256: string;
  sizeBytes: number;
};

export interface DeploymentManifestInput {
  namespacePrefix: string;
  studioId: string;
  deploymentId: string;
  releaseId: string;
  artifact: DeploymentArtifact;
  runtimeImage: string;
  port?: number;
  healthPath?: string;
}

const staticServer = String.raw`import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = "/release/content";
const port = Number(process.env.PORT || 4173);
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml" };

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || "/", "http://runtime").pathname);
  const relative = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
  let file = join(root, relative || "index.html");
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) file = join(root, "index.html");
  if (!existsSync(file)) {
    response.writeHead(404);
    response.end("Release artifact not found");
    return;
  }
  response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(port, "0.0.0.0");`;

function indentBlock(content: string, spaces: number) {
  const indent = " ".repeat(spaces);
  return content
    .trim()
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function labelBlock(input: DeploymentManifestInput) {
  return `    app.kubernetes.io/name: nova-release-runtime
    nova.dlxstudios.com/studio-id: ${sanitizeKubernetesName(input.studioId)}
    nova.dlxstudios.com/deployment-id: ${sanitizeKubernetesName(input.deploymentId)}
    nova.dlxstudios.com/release-id: ${sanitizeKubernetesName(input.releaseId)}`;
}

export function createDeploymentManifest(input: DeploymentManifestInput) {
  const names = deploymentResourceNames(input.namespacePrefix, input.studioId, input.deploymentId);
  const port = input.port ?? 4173;
  const healthPath = input.healthPath?.startsWith("/") ? input.healthPath : "/";
  return `apiVersion: v1
kind: Namespace
metadata:
  name: ${names.namespace}
  labels:
    app.kubernetes.io/name: nova-release-runtime
    nova.dlxstudios.com/runtime-boundary: deployment
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${names.serviceAccount}
  namespace: ${names.namespace}
automountServiceAccountToken: false
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: release-runtime-quota
  namespace: ${names.namespace}
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 1Gi
    limits.cpu: "2"
    limits.memory: 2Gi
    pods: "4"
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: release-runtime-default
  namespace: ${names.namespace}
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              nova.dlxstudios.com/edge-connector: "true"
      ports:
        - protocol: TCP
          port: ${port}
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
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${names.releaseConfig}
  namespace: ${names.namespace}
  labels:
${labelBlock(input)}
data:
  server.mjs: |
${indentBlock(staticServer, 4)}
  release.json: |
${indentBlock(
  JSON.stringify(
    {
      deploymentId: input.deploymentId,
      releaseId: input.releaseId,
      artifact: input.artifact,
    },
    null,
    2,
  ),
  4,
)}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${names.deployment}
  namespace: ${names.namespace}
  labels:
${labelBlock(input)}
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: nova-release-runtime
      nova.dlxstudios.com/deployment-id: ${sanitizeKubernetesName(input.deploymentId)}
  template:
    metadata:
      labels:
${labelBlock(input)}
    spec:
      serviceAccountName: ${names.serviceAccount}
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      initContainers:
        - name: verify-release
          image: alpine:3.21
          imagePullPolicy: IfNotPresent
          command: ["/bin/sh", "-ec"]
          args:
            - |
              wget -q -O /release/artifact "$ARTIFACT_URI"
              echo "$ARTIFACT_SHA256  /release/artifact" | sha256sum -c -
              mkdir -p /release/content
              if tar -tzf /release/artifact >/dev/null 2>&1; then
                tar -xzf /release/artifact -C /release/content
              else
                cp /release/artifact /release/content/index.html
              fi
          env:
            - name: ARTIFACT_URI
              value: ${JSON.stringify(input.artifact.uri)}
            - name: ARTIFACT_SHA256
              value: ${JSON.stringify(input.artifact.sha256)}
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              cpu: 25m
              memory: 32Mi
            limits:
              cpu: 250m
              memory: 128Mi
          volumeMounts:
            - name: release
              mountPath: /release
            - name: tmp
              mountPath: /tmp
      containers:
        - name: runtime
          image: ${input.runtimeImage}
          imagePullPolicy: IfNotPresent
          command: ["node", "/opt/nova-release/server.mjs"]
          env:
            - name: PORT
              value: ${JSON.stringify(String(port))}
          ports:
            - name: http
              containerPort: ${port}
          readinessProbe:
            httpGet:
              path: ${JSON.stringify(healthPath)}
              port: http
            initialDelaySeconds: 2
            periodSeconds: 3
            failureThreshold: 10
          livenessProbe:
            httpGet:
              path: ${JSON.stringify(healthPath)}
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: "1"
              memory: 512Mi
          volumeMounts:
            - name: release
              mountPath: /release
              readOnly: true
            - name: release-config
              mountPath: /opt/nova-release
              readOnly: true
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: release
          emptyDir:
            sizeLimit: 1Gi
        - name: release-config
          configMap:
            name: ${names.releaseConfig}
        - name: tmp
          emptyDir:
            sizeLimit: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: ${names.service}
  namespace: ${names.namespace}
  labels:
${labelBlock(input)}
spec:
  selector:
    app.kubernetes.io/name: nova-release-runtime
    nova.dlxstudios.com/deployment-id: ${sanitizeKubernetesName(input.deploymentId)}
  ports:
    - name: http
      port: ${port}
      targetPort: http
`;
}
