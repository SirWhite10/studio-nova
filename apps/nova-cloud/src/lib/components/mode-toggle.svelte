<script lang="ts">
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MonitorIcon from "@lucide/svelte/icons/monitor";
  import { setMode, resetMode } from "mode-watcher";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger class={buttonVariants({ variant: "outline", size: "icon" })}>
    <SunIcon
      class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
    />
    <MoonIcon
      class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
    />
    <span class="sr-only">Toggle theme</span>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onclick={() => setMode("light")}>
      <SunIcon class="mr-2 h-4 w-4" /> Light
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => setMode("dark")}>
      <MoonIcon class="mr-2 h-4 w-4" /> Dark
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => resetMode()}>
      <MonitorIcon class="mr-2 h-4 w-4" /> System
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
