<script lang="ts">
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription,
		FieldSeparator,
	} from "$lib/components/ui/field/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";
	import { userStore } from "$lib/user-store.svelte";
	import { toast } from "svelte-sonner";
	import type { HTMLAttributes } from "svelte/elements";

	let { class: className = "", ...restProps } = $props();

	const id = $props.id();

	let email = $state("");
	let password = $state("");
	let isCheckingEmail = $state(false);
	let passwordStep = $state(false);
	let emailExists = $state<boolean | null>(null);
	let emailMessage = $state("");

	async function checkEmail() {
		const normalizedEmail = email.trim().toLowerCase();
		if (!normalizedEmail) {
			toast.error("Enter your email first");
			return;
		}

		isCheckingEmail = true;
		emailMessage = "";

		try {
			const params = new URLSearchParams({ email: normalizedEmail });
			const res = await fetch(`/api/surreal-auth/email-status?${params}`);
			const payload = await res.json().catch(() => ({ exists: false }));

			if (!res.ok) {
				toast.error(payload.error || "Unable to check email");
				return;
			}

			emailExists = !!payload.exists;
			if (payload.exists) {
				passwordStep = true;
				emailMessage = "Account found. Enter your password to continue.";
				queueMicrotask(() => {
					const passwordInput = document.getElementById(`password-${id}`) as
						| HTMLInputElement
						| null;
					passwordInput?.focus();
				});
				return;
			}

			passwordStep = false;
			emailMessage = "No account exists for this email.";
			toast.error("No account found for that email");
		} catch {
			toast.error("Unable to check email right now");
		} finally {
			isCheckingEmail = false;
		}
	}

	function resetEmailStep() {
		passwordStep = false;
		emailExists = null;
		password = "";
		emailMessage = "";
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!passwordStep) {
			await checkEmail();
			return;
		}

		if (!password) {
			toast.error("Enter your password");
			return;
		}

		await userStore.signIn(email.trim().toLowerCase(), password);
	}

	function handleEmailInput() {
		if (passwordStep || emailExists !== null || emailMessage) {
			resetEmailStep();
		}
	}
</script>

<div class={cn("w-full max-w-sm", className)} {...restProps}>
	<form onsubmit={handleSubmit}>
				<FieldGroup>
					<div class="flex flex-col items-center gap-2 text-center">
						<h1 class="text-2xl font-bold">Sign in to Nova Cloud</h1>
						<p class="text-muted-foreground text-balance">
							Enter your email to continue with your account.
						</p>
					</div>

					<Field>
						<FieldLabel for="email-{id}">Email</FieldLabel>
						<Input
							id="email-{id}"
							type="email"
							bind:value={email}
							placeholder="you@example.com"
							required
							autocomplete="email"
							oninput={handleEmailInput}
						/>
						{#if emailMessage}
							<FieldDescription>{emailMessage}</FieldDescription>
						{/if}
					</Field>

					{#if passwordStep}
						<Field>
							<div class="flex items-center justify-between gap-4">
								<FieldLabel for="password-{id}">Password</FieldLabel>
								<a
									href="/auth/forgot-password"
									class="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
								>
									Forgot password?
								</a>
							</div>
							<Input
								id="password-{id}"
								type="password"
								bind:value={password}
								required
								autocomplete="current-password"
							/>
						</Field>
					{/if}

					<Field class="flex gap-3">
						<Button
							type="submit"
							disabled={isCheckingEmail || userStore.isLoading}
							class="w-full"
						>
							{#if isCheckingEmail}
								Checking email...
							{:else if userStore.isLoading}
								Signing in...
							{:else if passwordStep}
								Sign in
							{:else}
								Continue
							{/if}
						</Button>
						{#if passwordStep}
							<Button
								type="button"
								variant="outline"
								class="px-4"
								onclick={resetEmailStep}
							>
								Back
							</Button>
						{/if}
					</Field>

					<FieldSeparator class="*:data-[slot=field-separator-content]:bg-card">
						Or continue with
					</FieldSeparator>

					<Field class="grid grid-cols-2 gap-4">
						<Button variant="outline" type="button" class="w-full">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
								<path
									d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
									fill="currentColor"
								/>
							</svg>
							Continue with Apple
						</Button>
						<Button variant="outline" type="button" class="w-full">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
								<path
									d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
									fill="currentColor"
								/>
							</svg>
							Continue with Google
						</Button>
					</Field>

					<FieldDescription class="text-center">
						Don't have an account?
						<a href="/auth/sign-up" class="underline-offset-2 hover:underline">Sign up</a>
					</FieldDescription>
				</FieldGroup>
			</form>
	<FieldDescription class="px-6 text-center">
		By clicking continue, you agree to our <a href="/terms">Terms of Service</a> and
		<a href="/privacy">Privacy Policy</a>.
	</FieldDescription>
</div>
