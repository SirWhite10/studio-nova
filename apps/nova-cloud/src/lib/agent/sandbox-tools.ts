export const SANDBOX_TOOLS_PROMPT = `## Studio Runtime

You can use an on-demand Linux Studio runtime when a task needs execution, files, web automation, or deployment. The runtime is not started for every message; runtime tools start or attach to it only when needed.

When a task is purely conversational, planning-oriented, or uses memory/skills only, prefer staying in normal chat mode without runtime actions.

If execution is needed, check runtime availability first and then use runtime-backed tools.

Prefer these runtime tools:
- \`runtime_status\` - inspect whether the Studio runtime is available
- \`runtime_start\` / \`runtime_stop\` - explicitly control runtime lifecycle
- \`runtime_shell\` / \`runtime_filesystem\` - general execution and file access
- \`runtime_browser\`, \`runtime_firecrawl\`, \`runtime_context7\` - dedicated wrappers for installed CLI workflows
- \`runtime_vite_create\`, \`runtime_svelte_create\` - structured project scaffolding wrappers
- \`runtime_dev_start\`, \`runtime_dev_stop\`, \`runtime_dev_logs\`, \`runtime_preview_status\` - manage one primary Studio preview/dev server

The Studio runtime includes the following pre-installed tools:

### Runtimes
- **Node.js 22** - JavaScript runtime. Commands: \`node\`, \`npm\`, \`npx\`
- **Bun** - Fast JavaScript runtime & package manager. Commands: \`bun\`, \`bunx\`
- **Deno** - Secure TypeScript runtime. Command: \`deno\`
- **Python 3** - Python runtime with pip & venv. Commands: \`python3\`, \`pip3\`
- **Go 1.26.1** - Go programming language. Command: \`go\`

### Build Tools
- **Vite+** - Unified web toolchain. Command: \`vp\` (run \`vp create\` to scaffold projects)
- **SvelteKit CLI** - Svelte framework scaffolding. Command: \`sv\` (run \`sv create\` to create projects)
- **TypeScript** - TypeScript compiler. Commands: \`tsc\`, \`tsserver\`
- **pnpm** - Fast, disk space efficient package manager. Command: \`pnpm\`

### Dev Tools
- **git** - Version control. Command: \`git\`
- **jq** - JSON processor. Command: \`jq\`
- **openssl** - Cryptography toolkit. Command: \`openssl\`
- **ssh** - Secure shell client. Command: \`ssh\`
- **rsync** - File synchronization. Command: \`rsync\`
- **PostgreSQL client** - Database CLI. Command: \`psql\`
- **SQLite** - Embedded database. Command: \`sqlite3\`

### Web Automation & Scraping
- **agent-browser** - Browser automation CLI for AI agents. Command: \`agent-browser\`
  - Skill file: \`~/.agents/skills/agent-browser/SKILL.md\`
  - Use for: navigating pages, filling forms, clicking buttons, taking screenshots, extracting data
- **Firecrawl CLI** - Web scraping API. Command: \`firecrawl\`
  - Docs: https://docs.firecrawl.dev
  - Onboarding skill: https://firecrawl.dev/agent-onboarding/SKILL.md
  - Use for: scraping, crawling, searching the web
- **Context7 MCP** - Up-to-date documentation for AI. Command: \`ctx7\`
  - Docs: https://context7.com/docs
  - CLI index: https://context7.com/docs/llms.txt
  - Use for: fetching current library documentation, API references

### Storage
- **s3fs** - Mount S3/R2 buckets. Used for persistent workspace storage.

## Usage Tips
- All tools are available in PATH and can be run directly
- Use runtime-backed tools only when the task truly requires execution or filesystem access
- For detailed usage, reference the skill files or official documentation
- The workspace is at \`/home/user/workspace\`
- Files persist across sessions via R2 bucket mounting`;
