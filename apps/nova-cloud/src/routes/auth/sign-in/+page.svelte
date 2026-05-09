<script lang="ts">
  import LoginForm from '$lib/components/login-form.svelte';
  let { data } = $props();
</script>

{#if data?.reset}
  <div class="mx-auto mb-4 w-full max-w-md rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
    Password updated. You can sign in with your new password.
  </div>
{/if}
  <LoginForm />
