# E2B Integration Guide for Nova Cloud

**Document Name:** `e2b-integration.md`
**Version:** 1.0 (March 2026)
**Related Documents:**

- [NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md](../NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md)
- [agents.md](../agents.md)

This file provides detailed integration instructions and code examples for using **E2B** as the sandbox/execution engine in Nova Cloud.

E2B was selected because:

- It offers a clean, modern **JavaScript/TypeScript SDK** that works natively in Vercel API routes and backend actions
- Purpose-built for AI agents (code execution, filesystem ops, process management)
- Fast cold starts (~150–300ms)
- Strong microVM isolation (Firecracker)
- Startup-friendly pricing with free credits and low per-hour rates

## 1. Setup & Authentication

1. Sign up at https://e2b.dev and get your API key.
2. Store it securely in Vercel environment variables: `E2B_API_KEY`.
3. Install the SDK in your project:

````bash
bun install e2b


2. Core Concepts in Nova Cloud

Each agent gets its own E2B sandbox instance (identified by userId + agentId).
Sandboxes are on-demand: created when needed, auto-close after inactivity.
Persistence: Use E2B Filesystem + optional bucket storage (files survive across sessions).
PTC pattern: Grok generates one script → execute in sandbox → stream output back to UI.

3. Example: Full Agent Execution Flow (PTC + Dev Server + Preview)
// src/lib/e2b-agent-executor.ts
import { Sandbox } from 'e2b';
import type { SandboxProcess } from 'e2b';

interface ExecuteOptions {
  userId: string;
  agentId: string;
  ptcScript: string;         // Grok-generated one-lump-sum script
  repoUrl?: string;          // Optional GitHub repo to clone
  devCommand?: string;       // e.g., 'npm run dev'
  port?: number;             // e.g., 3000 for preview
}

export async function executeAgentTask(options: ExecuteOptions) {
  const { userId, agentId, ptcScript, repoUrl, devCommand = 'npm run dev', port = 3000 } = options;

  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY!,
    template: 'base', // or your custom template with pre-installed tools
    metadata: { userId, agentId },
    onStart: async (sb) => {
      if (repoUrl) {
        await sb.process.startAndWait(`git clone ${repoUrl} /home/user/workspace/project`);
      }
    }
  });

  try {
    // Write the PTC script
    await sandbox.filesystem.write('/home/user/workspace/task.ts', ptcScript);

    // Run the main PTC task
    const taskProcess = await sandbox.process.start({
      cmd: 'bun run /home/user/workspace/task.ts',
      cwd: '/home/user/workspace/project',
      onStdout: (data) => {
        // Stream to the app backend or Vercel SSE for realtime UI
        console.log('[STDOUT]', data.line);
      },
      onStderr: (data) => console.error('[STDERR]', data.line)
    });

    await taskProcess.wait(); // Wait for completion (or timeout)

    // Start long-running dev server
    const devProcess: SandboxProcess = await sandbox.process.start({
      cmd: devCommand,
      cwd: '/home/user/workspace/project',
      env: { PORT: port.toString() },
      onStdout: (data) => console.log('[DEV]', data.line)
    });

    // Get public preview URL (E2B proxy)
    const previewUrl = await sandbox.getPreviewUrl(port);

    // Optional: Keep sandbox alive for interactive sessions
    // await sandbox.keepAlive(); // or use keepAlive option in create()

    return {
      sandboxId: sandbox.id,
      previewUrl,
      devProcessId: devProcess.pid,
      taskOutput: taskProcess.stdout
    };
  } catch (error) {
    console.error('E2B execution failed:', error);
    throw error;
  } finally {
    // Sandbox auto-closes after inactivity; can force close if needed
    // await sandbox.close();
  }
}

4. Additional Examples
4.1 – Simple File Write & Read (for agent memory or config)

async function saveAgentMemory(sandbox: Sandbox, memory: string) {
  await sandbox.filesystem.write('/home/user/workspace/memory.json', JSON.stringify({ data: memory }, null, 2));
}

async function readAgentMemory(sandbox: Sandbox) {
  return await sandbox.filesystem.read('/home/user/workspace/memory.json');
}

  4.2 – Running Tests or Builds
  TypeScript

  async function runTests(sandbox: Sandbox) {
    const testProcess = await sandbox.process.startAndWait('bun test', {
      cwd: '/home/user/workspace/project'
    });
    return testProcess.stdout;
  }

  4.3 – Streaming Logs to UI (backend or SSE)
  TypeScript

  // In Vercel API route
  const sandbox = await Sandbox.create({ ... });
  sandbox.process.start({
    cmd: 'npm run dev',
    onStdout: (data) => {
      // Send to a backend mutation or SSE stream
      backendMutation('streamLog', { agentId, log: data.line });
    }
  });

  5. Error Handling & Best Practices

  Always wrap in try/finally to handle sandbox cleanup.
  Use sandbox.close() only when explicitly terminating an agent.
  Monitor usage via the E2B dashboard or custom backend logging.
  For long-running dev servers: Use keepAlive option or periodic heartbeats.
  Rate-limit sandbox creations per user to prevent abuse.

  6. Cost Monitoring
  Track per-agent sandbox runtime in the backend (via E2B usage events or your own timers).
  Typical Pro user (~50 active hours/mo): $1–$4 — keeps infra <10% of COGS.

  Cross-reference: See NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md for full pricing, architecture, and revenue projections.


### 2. Updated agents.md (reflecting E2B)

```markdown
# Nova Cloud Agents

**Document Name:** `agents.md`
**Version:** 1.1 (March 2026) – Updated to use E2B
**Related Documents:**
- [NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md](../NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md)
- [e2b-integration.md](../e2b-integration.md)

This file explains the agent architecture, multi-agent support, workspaces, and technical implementation in Nova Cloud using **E2B** as the execution provider.

## 1. What is a Nova Cloud Agent?

A **Nova Cloud Agent** is your personal, persistent AI assistant running inside an isolated E2B microVM sandbox.
Key capabilities:
- Full Linux filesystem access (`/home/user/workspace`)
- Real Git, package managers, and dev servers
- Hot reload + live public preview URLs via E2B proxy
- Persistent storage (filesystem + buckets — survives sandbox close)
- Grok 4.2 beta brain via the PTC (one-lump-sum script) pattern

Every agent is **fully isolated** from other users and from your other agents.

## 2. Multiple Agents & Workspaces

Nova Cloud supports **multiple independent agents** and **workspaces** as a core differentiator.

| Tier       | Max Agents | Max Workspaces | Use Case Example |
|------------|------------|----------------|------------------|
| Starter   | 1          | 1              | Personal assistant only |
| Pro       | 3          | 3              | One for coding, one for content, one for email/calendar |
| Unlimited | Unlimited  | Unlimited      | Separate agents per client, project, or life area |

**Technical implementation:**
- Each agent has its own:
  - backend record (`agents` table)
  - E2B sandbox instance (identified by `nova-agent-${userId}-${agentId}`)
  - Isolated filesystem/bucket mount
  - Independent memory thread and conversation history
- UI switcher (Svelte 5 runes) lets users change agents instantly.

## 3. Agent Lifecycle & E2B Sandbox Behavior

1. User creates/selects an agent.
2. Prompt sent → Grok generates PTC script.
3. Backend action → calls E2B SDK → creates/uses sandbox.
4. Sandbox spins up on-demand (cold start ~150–300ms).
5. Executes task (clone repo, run `npm run dev`, etc.).
6. Exposes live preview URL via E2B proxy.
7. Sandbox auto-closes after inactivity (or explicit close).
8. Files persist in E2B filesystem/bucket — next call resumes instantly.

**Security note**: Each sandbox is isolated via Firecracker microVMs. Security rivals or exceeds local OpenClaw while adding cloud-native controls.

## 4. Bring Your Own Key (BYOK)

Attach your own xAI Grok API key per agent:
- Higher rate limits
- Complete privacy
- Still uses Nova’s E2B sandbox and PTC flow

## 5. Example: Running a PTC Script in an Agent’s Sandbox (E2B)

See full detailed examples in **[e2b-integration.md](../e2b-integration.md)**.

Basic snippet:

```ts
import { Sandbox } from 'e2b';

const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY! });
await sandbox.filesystem.write('/home/user/workspace/task.ts', ptcScript);
const execution = await sandbox.process.start({ cmd: 'bun run /home/user/workspace/task.ts' });
const previewUrl = await sandbox.getPreviewUrl(3000);

Cross-reference: Full business strategy, pricing, and E2B cost details are in NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md.

These two files are now fully consistent with the E2B switch. Let me know if you'd like:
- A `README.md` snippet linking all docs
- More advanced E2B examples (e.g., streaming, error recovery, custom templates)
- Or a quick cost calculator table for E2B in different usage scenarios

Ready to proceed!
````
