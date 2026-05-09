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

  type PageData = { token: string; error: string };

  let { data, form, ...restProps }: { data: PageData; form?: { error?: string } } & HTMLAttributes<HTMLDivElement> =
    $props();

  let newPassword = $state("");
  let confirmPassword = $state("");
  let isSubmitting = $state(false);
</script>

<svelte:head>
  <title>Reset Password</title>
</svelte:head>

<div class={cn("w-full max-w-md mx-auto flex flex-col gap-6", "px-6")} {...restProps}>
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
            <h1 class="text-2xl font-bold">Choose a new password</h1>
            <p class="text-muted-foreground text-balance">
              Create a new password for your Nova Cloud account.
            </p>
          </div>

          {#if !data.token}
            <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              The password reset link is missing a valid token. Request a new reset email.
            </div>
          {/if}

          {#if data.error === "INVALID_TOKEN"}
            <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              This reset link is invalid or expired. Request a new reset email.
            </div>
          {/if}

          {#if form?.error}
            <div class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {form.error}
            </div>
          {/if}

          <input type="hidden" name="token" value={data.token} />

          <Field>
            <FieldLabel for="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              bind:value={newPassword}
              autocomplete="new-password"
              required
            />
          </Field>

          <Field>
            <FieldLabel for="confirm-password">Confirm password</FieldLabel>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              bind:value={confirmPassword}
              autocomplete="new-password"
              required
            />
          </Field>

          <Field>
            <Button type="submit" class="w-full" disabled={isSubmitting || !data.token}>
              {#if isSubmitting}
                Updating password...
              {:else}
                Reset password
              {/if}
            </Button>
          </Field>

          <FieldDescription class="text-center">
            <a href="/auth/sign-in" class="underline-offset-2 hover:underline">Back to sign in</a>
          </FieldDescription>
        </FieldGroup>
      </form>
    </Card.Content>
  </Card.Root>
</div>
