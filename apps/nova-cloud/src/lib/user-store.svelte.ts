import { toast } from "svelte-sonner";
import { browser } from "$app/environment";

const AUTH_BASE = "/api/surreal-auth";

async function authFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${AUTH_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (!res.ok && res.status !== 200) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

class UserStore {
  user = $state<any>(null);
  isLoading = $state(false);
  error = $state<string | null>(null);
  initialized = $state(false);

  async load(force = false) {
    if ((!force && this.initialized) || !browser) return;
    try {
      const session = await authFetch("/get-session");
      this.user = session?.user || null;
    } catch {
      this.user = null;
    } finally {
      this.initialized = true;
    }
  }

  async signUp(email: string, password: string) {
    this.isLoading = true;
    this.error = null;
    try {
      const data = await authFetch("/sign-up/email", {
        method: "POST",
        body: JSON.stringify({ email, password, name: email.split("@")[0] }),
      });
      this.user = data?.user || null;
      toast.success("Account created successfully");
      window.location.href = "/app";
    } catch (err: any) {
      const message = err.message || "Failed to create account";
      this.error = message;
      toast.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  async signIn(email: string, password: string) {
    this.isLoading = true;
    this.error = null;
    try {
      const data = await authFetch("/sign-in/email", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      this.user = data?.user || null;
      toast.success("Signed in successfully");
      window.location.href = "/app";
    } catch (err: any) {
      const message = err.message?.includes("Invalid")
        ? "Invalid email or password"
        : err.message || "Failed to sign in";
      this.error = message;
      toast.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  async logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      this.user = null;
      this.initialized = false;
      toast.success("Signed out successfully");
      window.location.href = "/auth/sign-in";
    } catch (e) {
      console.error("Logout error", e);
      this.user = null;
      this.initialized = false;
      window.location.href = "/auth/sign-in";
    }
  }

  isLoggedIn = $derived(!!this.user);
}

export const userStore = new UserStore();
