<script lang="ts">
	import CardRoot from "../card/card.svelte";
	import CardHeader from "../card/card-header.svelte";
	import CardTitle from "../card/card-title.svelte";
	import CardDescription from "../card/card-description.svelte";
	import CardContent from "../card/card-content.svelte";
	import CardFooter from "../card/card-footer.svelte";
	import { View } from "$lib/base/view/index.js";

	type SocialProvider = {
		id: string;
		label: string;
		icon?: string;
	};

	let {
		title = "Login to your account",
		description = "Enter your email below to login to your account",
		emailLabel = "Email",
		emailPlaceholder = "m@example.com",
		passwordLabel = "Password",
		passwordPlaceholder = "",
		forgotPasswordLabel = "Forgot your password?",
		submitLabel = "Login",
		secondaryLabel = "Login with Google",
		socialProviders = [],
		onsubmit,
		style = "",
		...restProps
	}: {
		title?: string;
		description?: string;
		emailLabel?: string;
		emailPlaceholder?: string;
		passwordLabel?: string;
		passwordPlaceholder?: string;
		forgotPasswordLabel?: string;
		submitLabel?: string;
		secondaryLabel?: string;
		socialProviders?: SocialProvider[];
		onsubmit?: (event: SubmitEvent) => void;
		style?: string;
		[key: string]: unknown;
	} = $props();

	const emailInputId = "auth-form-email";
	const passwordInputId = "auth-form-password";
</script>

<CardRoot size="sm" style={`width: 100%; max-width: 22rem; max-height: 100%; ${style}`} {...restProps}>
	<CardHeader>
		<CardTitle text={title} />
		<CardDescription text={description} />
	</CardHeader>

	<form onsubmit={onsubmit}>
		<CardContent>
			<View display="grid" gap={4}>
				<View display="grid" gap={2}>
					<label for={emailInputId}>{emailLabel}</label>
					<input id={emailInputId} type="email" placeholder={emailPlaceholder} required />
				</View>
				<View display="grid" gap={2}>
					<View display="flex" justifyContent="between" alignItems="center">
						<label for={passwordInputId}>{passwordLabel}</label>
						<a href="##">{forgotPasswordLabel}</a>
					</View>
					<input id={passwordInputId} type="password" placeholder={passwordPlaceholder} required />
				</View>
			</View>
		</CardContent>

		<CardFooter style="flex-direction: column; gap: 0.5rem;">
			<button type="submit" class="auth-form-button auth-form-button-primary">
				{submitLabel}
			</button>

			{#if socialProviders.length > 0}
				<View display="grid" gap={2} style="width: 100%;">
					{#each socialProviders as provider}
						<button type="button" class="auth-form-button auth-form-button-secondary">
							{provider.label}
						</button>
					{/each}
				</View>
			{:else}
				<button type="button" class="auth-form-button auth-form-button-secondary">
					{secondaryLabel}
				</button>
			{/if}
		</CardFooter>
	</form>
</CardRoot>

<style>
	label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	input,
	a,
	button {
		font: inherit;
	}

	input {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 0.75rem;
		padding: 0.625rem 0.75rem;
	}

	a {
		font-size: 0.875rem;
		color: inherit;
		text-decoration: none;
	}

	.auth-form-button {
		width: 100%;
		border-radius: 0.75rem;
		padding: 0.625rem 0.875rem;
		border: 1px solid rgba(15, 23, 42, 0.12);
		cursor: pointer;
	}

	.auth-form-button-primary {
		background: #111827;
		color: #ffffff;
		border-color: #111827;
	}

	.auth-form-button-secondary {
		background: #ffffff;
		color: #111827;
	}
</style>
