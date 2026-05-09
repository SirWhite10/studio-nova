<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import {
    FieldGroup,
    Field,
    FieldLabel,
    FieldDescription,
  } from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";
  import { enhance } from "$app/forms";

  let { form, ...restProps }: { form?: { error?: string; sent?: boolean } } & HTMLAttributes<HTMLDivElement> =
    $props();

  let email = $state("");
  let isSubmitting = $state(false);
</script>

<svelte:head>
  <title>Forgot Password</title>
</svelte:head>

<div class={cn("w-full max-w-md mx-auto flex flex-col gap-6", "px-6",)} {...restProps}>
  <Card.Root class="w-full overflow-hidden p-0">
    <Card.Content class="p-0">
      <form
        class="p-6 md:p-8"
        method="POST"
        use:enhance={() => {
          isSubmitting = true;

          return async ({ update }) => {
            await update();
            isSubmitting = false;
          };
        }}
      >
        <FieldGroup>
          <div class="flex flex-col items-center gap-2 text-center">
            <h1 class="text-2xl font-bold">Reset your password</h1>
            <p class="text-muted-foreground text-balance">
              Enter the email address tied to your account and we’ll send a reset link.
            </p>
          </div>

          {#if form?.sent}
            <div class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              If an account exists for that email, reset instructions have been sent.
            </div>
          {/if}

          {#if form?.error}
            <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {form.error}
            </div>
          {/if}

          <Field>
            <FieldLabel for="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              bind:value={email}
              placeholder="m@example.com"
              autocomplete="email"
              required
            />
          </Field>

          <Field>
            <Button type="submit" class="w-full" disabled={isSubmitting}>
              {#if isSubmitting}
                Sending reset link...
              {:else}
                Send reset link
              {/if}
            </Button>
          </Field>

          <FieldDescription class="text-center">
            Remembered it? <a href="/auth/sign-in" class="underline-offset-2 hover:underline">Back to sign in</a>
          </FieldDescription>
        </FieldGroup>
      </form>
    </Card.Content>
  </Card.Root>
</div>
