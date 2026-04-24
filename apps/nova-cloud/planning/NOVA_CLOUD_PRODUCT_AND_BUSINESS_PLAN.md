Here's the updated version of NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md with E2B as the chosen sandbox/execution provider.
All Cloudflare Sandbox references have been replaced with E2B. I've included:

realistic E2B pricing & cost impact
pros/cons alignment
updated architecture section
fresh TypeScript example using the official E2B JavaScript SDK (latest as of March 2026)
minor tweaks to COGS/profit numbers to reflect E2B's structure (still very favorable)

# Nova Cloud – Product & Business Plan

**Document Type:** Product & Business Plan
**Version:** 1.1 (March 2026) – Updated to use E2B as execution provider
**Product Name:** Nova Cloud
**Status:** Final Draft

## 1. Executive Summary

**User-facing terminology note:** Nova now uses `Studio` as the primary product noun in the app shell and UI. Technical runtime concepts like `sandbox` and literal filesystem paths like `/workspace` remain valid internal terminology where precise infrastructure language is needed.

Nova Cloud is a fully managed, cloud-native AI agent platform that delivers a persistent personal sandbox — your own “Mac Mini in the cloud” — without any hardware purchase or server management.

Unlike OpenClaw (which requires users to buy and maintain a Mac Mini/Studio or run a local Docker container), Nova Cloud gives every user an isolated, always-available sandbox with full filesystem access, GitHub cloning in any language, dev-server execution, hot reload, and instant public preview URLs — all through a simple guided web interface.

Key advantages over OpenClaw-style local hardware setups:

- No $1,000+ Mac Mini/Studio purchase required
- No maintenance, updates, or power bills
- True persistence across sessions (files survive even when sandbox sleeps)
- On-demand scaling with automatic sleep (pay only for active time)
- Multiple independent agents / Studios per user
- Enterprise-grade security (per-user isolated microVMs, scoped storage, audit logging)

The platform is **paid-only at launch** to generate immediate revenue with minimal startup capital. Pricing can be lowered later once we have strong cash flow and user data.

From a product UX standpoint, Nova should be described as a Studio-first platform: users create and switch between Studios, and each Studio can expose chats, runtime state, skills, and dynamic Integrations.

## 2. Pricing Tiers (Paid-Only from Day 1)

| Tier          | Monthly Price | Annual Price (20% discount) | Agents / Studios           | Sandbox Type                | Key Limits & Benefits                                                                                           | Target User                  |
| ------------- | ------------- | --------------------------- | -------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Starter**   | **$20**       | $192/year                   | 1 agent, 1 Studio          | Ephemeral (short tasks)     | Guided UI, basic agent, limited Integrations, ~400 interactions/mo or ~15 sandbox hours                         | Beginners testing the waters |
| **Pro**       | **$49**       | $470/year                   | 3 agents, 3 Studios        | Persistent personal sandbox | Full GitHub clone, any language, dev servers with hot reload, live previews, email/calendar/Notion integrations | Most daily users             |
| **Unlimited** | **$99**       | $950/year                   | Unlimited agents & Studios | Persistent + priority       | Everything in Pro + priority Grok 4.2 beta access, custom tools, team sharing, dedicated support                | Power users & small teams    |

**Bring Your Own Key (BYOK) Option** (available on all tiers for +$0): Users can optionally input their own xAI Grok API key for higher rate limits or added privacy.

**Fair-use policy** applies (soft throttling only for extreme abuse). No visible hour counters — marketed as “unlimited sandbox time (fair use)”.

## 3. Technical Architecture (Fully Managed Cloud)

- **Frontend**: Svelte 5 + SvelteKit hosted on Vercel (all components use **Svelte 5 runes mode exclusively** — no legacy Svelte 4 syntax, no options API, no $: reactivity).
- **Backend & State**: Fully managed Convex (reactive queries, crons, auth, Stripe billing, Studio state, agent memory, usage tracking).
- **Execution Engine**: **E2B** (agent-first sandbox platform using Firecracker microVMs)
- **Persistent Storage**: E2B Filesystem + integrated bucket storage (persistent across sessions)
- **LLM**: xAI Grok API (Grok 4.2 beta with PTC “one-lump-sum script” pattern for efficiency).
- **Deployment**: Vercel (frontend + API routes)

**Important Note on Svelte**: Every Svelte component in Nova Cloud uses **runes mode only** (`$state`, `$derived`, `$effect`, etc.). Legacy Svelte 4 syntax is explicitly forbidden in the codebase.

## 4. Why E2B as Execution Provider

**E2B** was chosen over Cloudflare Sandbox because:

- Official JavaScript/TypeScript SDK is clean and works natively in Vercel API routes / Convex actions
- Built specifically for AI agents (PTC scripts, code execution, filesystem ops)
- Fast cold starts (~150–300ms)
- Strong isolation (Firecracker microVMs)
- Easy persistence via filesystem + buckets
- Startup-friendly pricing with generous free credits

**E2B Pricing (March 2026)**:

- Hobby: Free tier + $100 one-time credits
- Pro: $150/mo base + usage
  - CPU: ~$0.000014/vCPU-second (~$0.05/hour)
  - Memory: ~$0.0000045/GiB-second
  - Storage: low additional cost
- Typical heavy Pro user (~50 active hours/mo, low utilization): **$1–$4/mo**

This keeps sandbox cost **<10% of total COGS** — LLM remains dominant.

## 5. Core Workflow Example (PTC + E2B Sandbox)

A typical user request (“Clone my GitHub repo and run the dev server with live preview”):

1. User prompt → SvelteKit route → Convex action.
2. Grok generates one complete PTC script via the API.
3. Convex action → calls E2B SDK to create/run sandbox.

**Example TypeScript code** (using latest E2B JS SDK):

```ts
// src/lib/e2b-agent.ts (used in Vercel API route or Convex action)
import { Sandbox } from 'e2b';

export async function runPtcInE2BSandbox(
  userId: string,
  agentId: string,
  ptcScript: string,
  repoUrl: string,
  apiKey: string // E2B API key from env
) {S
  const sandbox = await Sandbox.create({
    apiKey,
    template: 'base', // or custom template with pre-installed tools
    metadata: { userId, agentId },
    onStart: async (sb) => {
      // Clone repo
      await sb.process.startAndWait(`git clone ${repoUrl} /workspace/project`);
    }
  });

  try {
    // Write PTC script (one-lump-sum)
    await sandbox.filesystem.write('/workspace/task.ts', ptcScript);

    // Execute the full plan
    const execution = await sandbox.process.start({
      cmd: 'bun run /workspace/task.ts',
      cwd: '/workspace/project',
      onStdout: (data) => console.log(data) // stream to UI via Convex
    });

    await execution.wait();

    // Start dev server (long-running process)
    const devProcess = await sandbox.process.start({
      cmd: 'bun run dev',
      cwd: '/workspace/project',
      env: { PORT: '3000' }
    });

    // Get live preview URL (E2B exposes via proxy)
    const previewUrl = await sandbox.getPreviewUrl(3000);

    return {
      sandboxId: sandbox.id,
      previewUrl,
      logs: execution.stdout
    };
  } finally {
    // Sandbox auto-closes after inactivity or explicit close
    // await sandbox.close(); // optional - auto-handled
  }
}

This integration is clean, native to Node.js/Vercel, and avoids all Cloudflare Worker compatibility issues.
6. Security Features (Rivaling or Exceeding OpenClaw)
Nova Cloud uses per-user isolated microVMs with:

Full sandbox isolation (Firecracker microVMs)
Scoped filesystem & bucket storage (each agent sees only its own data)
Audit logging of every command and file operation
Permissioned execution (no root, no unauthorized network egress)
Automatic timeout & resource limits per sandbox
Bring-Your-Own-Key option for complete key isolation

Security is at least as strong as OpenClaw’s local model, with the added benefit of E2B’s agent-focused hardening and automatic updates.
7. Revenue Projections (at 1,000 Paying Users)
Conservative early mix (60% Starter $20, 35% Pro $49, 5% Unlimited $99):
MRR ≈ $32,000 | ARR ≈ $384,000
Optimistic mix (40% Starter, 50% Pro, 10% Unlimited):
MRR ≈ $42,000 | ARR ≈ $504,000
Updated COGS estimate (with E2B):

LLM (Grok): $5,000–$8,000/mo
E2B sandbox + storage: $1,000–$4,000/mo
Convex + Vercel: $200–$600/mo
Total COGS ≈ $6,200–$12,600/mo
Gross margin: 60–80%+ — strong runway from launch.

8. Go-to-Market & Differentiation vs OpenClaw

Vs OpenClaw: No hardware purchase, no maintenance, true cloud persistence, multiple agents / Studios, live previews, automatic scaling.
Launch strategy: Paid-only with strong landing-page messaging (“Real value from day one — your cloud agent is ready instantly”).
14-day money-back guarantee + annual discount to reduce friction.

From the product surface, Nova should present these capabilities through Studios. Each Studio becomes the user's persistent environment, with runtime, chats, skills, and Integrations such as Stripe, GitHub, or Notion appearing in a Studio-scoped navigation model when enabled.

9. Next Milestones

Finalize Svelte 5 runes frontend
Implement E2B SDK integration (using example code above)
Build multiple agents/Studios in Convex
Integrate Stripe + BYOK option
Launch Nova Cloud paid tiers

refer to e2b-integration.md for more examples
```
