<script lang="ts">
  import BeakerIcon from "@lucide/svelte/icons/beaker";
  import PlayIcon from "@lucide/svelte/icons/play";
  import RotateCcwIcon from "@lucide/svelte/icons/rotate-cw";
  import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { toast } from "svelte-sonner";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";

  type RuntimeLabPayload = {
    configured: boolean;
    controlStudioId: string;
    health: unknown;
    status: unknown;
  };

  let { data }: { data: RuntimeLabPayload & { studio?: any; studioId: string } } = $props();

  let health = $state.raw(data.health);
  let status = $state.raw(data.status);
  let lastResult = $state.raw<unknown>(null);
  let systemPackages = $state("ffmpeg, imagemagick");
  let command = $state("ffmpeg -version | head -1 && magick -version | head -1");
  let isMutating = $state(false);

  const healthOk = $derived(Boolean((health as { ok?: boolean } | null)?.ok));
  const statusOk = $derived(Boolean((status as { ok?: boolean } | null)?.ok));
  const packageList = $derived(
    systemPackages
      .split(",")
      .map((pkg) => pkg.trim())
      .filter(Boolean),
  );

  function formatJson(value: unknown) {
    return JSON.stringify(value, null, 2);
  }

  async function refreshLab(showToast = false) {
    const response = await fetch(`/api/studios/${data.studioId}/runtime-lab`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to refresh runtime lab");
    health = payload.health;
    status = payload.status;
    if (showToast) toast.success("Runtime lab refreshed");
  }

  async function runAction(action: "start" | "delete" | "status" | "exec") {
    isMutating = true;
    try {
      const response = await fetch(`/api/studios/${data.studioId}/runtime-lab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          systemPackages: action === "start" ? packageList : undefined,
          command: action === "exec" ? command : undefined,
          timeoutMs: action === "exec" ? 60_000 : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Failed to ${action}`);
      lastResult = payload;
      toast.success(action === "delete" ? "Runtime deleted" : "Runtime lab action completed");
      await refreshLab(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      isMutating = false;
    }
  }
</script>

<div class="min-h-[calc(100vh-4rem)] bg-[linear-gradient(135deg,_rgba(15,118,110,0.08),transparent_34%),linear-gradient(45deg,_rgba(245,158,11,0.08),transparent_38%)] px-6 py-8 sm:px-10">
  <div class="mx-auto max-w-6xl space-y-6">
    <section class="border border-border/70 bg-background/90 p-6 shadow-sm backdrop-blur sm:p-8">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <Badge class="bg-teal-600 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white">Runtime lab</Badge>
            <Badge variant="outline" class="text-[11px] uppercase tracking-[0.18em]">{healthOk ? "Control online" : "Control offline"}</Badge>
            <Badge variant="outline" class="text-[11px] uppercase tracking-[0.18em]">{statusOk ? "Runtime found" : "Runtime uncreated"}</Badge>
          </div>
          <h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? "Studio"} runtime lab</h1>
          <p class="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Test the K3s runtime control plane, persisted APK packages, and AI execution path before wiring it into production runtime tools.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <Button variant="outline" disabled={isMutating} onclick={() => refreshLab(true)}>
            <RotateCcwIcon class="size-4" />
            Refresh
          </Button>
          <Button disabled={isMutating} onclick={() => runAction("start")}>
            <PlayIcon class="size-4" />
            Start runtime
          </Button>
          <Button variant="destructive" disabled={isMutating} onclick={() => runAction("delete")}>
            <Trash2Icon class="size-4" />
            Delete runtime
          </Button>
        </div>
      </div>
      <p class="mt-4 break-all text-xs text-muted-foreground">Control id: {data.controlStudioId}</p>
    </section>

    <div class="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section class="space-y-5">
        <div class="border border-border/70 bg-background/90 p-5 shadow-sm">
          <div class="mb-4 flex items-center gap-3">
            <div class="bg-teal-500/10 p-3 text-teal-700">
              <BeakerIcon class="size-5" />
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Packages</p>
              <h2 class="text-lg font-semibold">APK package set</h2>
            </div>
          </div>
          <Input bind:value={systemPackages} placeholder="ffmpeg, imagemagick" />
          <p class="mt-3 text-xs leading-6 text-muted-foreground">
            Re-starting with a changed list recreates only the runtime pod and keeps the workspace and APK PVCs.
          </p>
        </div>

        <div class="border border-border/70 bg-background/90 p-5 shadow-sm">
          <div class="mb-4 flex items-center gap-3">
            <div class="bg-amber-500/10 p-3 text-amber-700">
              <SquareTerminalIcon class="size-5" />
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Execution</p>
              <h2 class="text-lg font-semibold">Runtime command</h2>
            </div>
          </div>
          <Textarea class="min-h-32 font-mono text-sm" bind:value={command} />
          <div class="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" disabled={isMutating} onclick={() => runAction("exec")}>
              <SquareTerminalIcon class="size-4" />
              Run command
            </Button>
            <Button variant="outline" disabled={isMutating} onclick={() => runAction("status")}>
              <RotateCcwIcon class="size-4" />
              Pull status
            </Button>
          </div>
        </div>
      </section>

      <section class="grid gap-5">
        <div class="border border-border/70 bg-background/90 p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold">Control plane</h2>
            <Badge variant={healthOk ? "default" : "outline"}>{healthOk ? "online" : "check config"}</Badge>
          </div>
          <pre class="max-h-64 overflow-auto bg-muted p-4 text-xs leading-6">{formatJson(health)}</pre>
        </div>

        <div class="border border-border/70 bg-background/90 p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold">Runtime status</h2>
            <Badge variant={statusOk ? "default" : "outline"}>{statusOk ? "ready" : "not created"}</Badge>
          </div>
          <pre class="max-h-80 overflow-auto bg-muted p-4 text-xs leading-6">{formatJson(status)}</pre>
        </div>

        <div class="border border-border/70 bg-background/90 p-5 shadow-sm">
          <h2 class="mb-3 text-lg font-semibold">Last action result</h2>
          <pre class="max-h-96 overflow-auto bg-muted p-4 text-xs leading-6">{formatJson(lastResult ?? { idle: true })}</pre>
        </div>
      </section>
    </div>
  </div>
</div>
