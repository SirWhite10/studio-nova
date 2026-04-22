import { runtimeNamespace, sanitizeKubernetesName } from "./names.ts";

export type SmokeRuntimeManifestInput = {
  namespacePrefix: string;
  studioId: string;
  image: string;
};

export function createSmokeRuntimeManifest(input: SmokeRuntimeManifestInput) {
  const namespace = runtimeNamespace(input.namespacePrefix, input.studioId);
  const safeStudioId = sanitizeKubernetesName(input.studioId);

  return `apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
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
  name: smoke-runtime
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: nova-runtime
    nova.dlxstudios.com/studio-id: ${safeStudioId}
spec:
  restartPolicy: Always
  containers:
    - name: runtime
      image: ${input.image}
      command:
        - sh
        - -c
        - |
          echo "nova-runtime-ready ${safeStudioId}" > /workspace/READY.txt
          trap "exit 0" TERM INT
          while true; do sleep 3600; done
      resources:
        requests:
          cpu: 25m
          memory: 32Mi
        limits:
          cpu: 250m
          memory: 128Mi
      volumeMounts:
        - name: workspace
          mountPath: /workspace
  volumes:
    - name: workspace
      persistentVolumeClaim:
        claimName: workspace
`;
}
