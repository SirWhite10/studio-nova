import { Template } from "e2b";

export const novaBunTemplate = Template()
  .fromUbuntuImage("24.04")

  // ── Phase 1: System-level (root) ──
  .setUser("root")
  .aptInstall([
    "curl",
    "unzip",
    "git",
    "ca-certificates",
    "s3fs",
    "fuse3",
    "jq",
    "openssl",
    "openssh-client",
    "rsync",
    "postgresql-client",
    "sqlite3",
    "python3",
    "python3-pip",
    "python3-venv",
    "build-essential",
    "pkg-config",
    "libssl-dev",
  ])
  .runCmd("curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs")
  .runCmd("curl -fsSL https://go.dev/dl/go1.24.1.linux-amd64.tar.gz -o go.tar.gz")
  .runCmd("tar -C /usr/local -xzf go.tar.gz && rm go.tar.gz")
  .runCmd("curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash")
  .runCmd("bun install -g typescript sv")

  // ── Phase 2: User-level tools ──
  .setUser("user")
  .runCmd("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y")
  .runCmd("echo 'source $HOME/.cargo/env' >> /home/user/.bashrc")
  .runCmd("curl -fsSL https://deno.land/install.sh | sh")
  .runCmd("mkdir -p /home/user/.npm-global /home/user/.local/bin /home/user/go")
  .runCmd("npm config set prefix /home/user/.npm-global")
  .bunInstall(["typescript", "tsx", "@biomejs/biome"], { g: true })
  .npmInstall(
    [
      "typescript",
      "tsx",
      "serve",
      "pnpm",
      "agent-browser",
      "firecrawl-cli",
      "@upstash/context7-mcp",
    ],
    { g: true },
  )
  .runCmd("curl -fsSL https://vite.plus | bash")
  .runCmd(
    "python3 -m venv /home/user/.pyenv && /home/user/.pyenv/bin/pip install pandas numpy matplotlib requests fastapi uvicorn",
  )
  .runCmd(
    "bash -c 'source /home/user/.cargo/env && rustup default stable && rustup component add rustfmt clippy'",
  )
  .runCmd(
    "GOPATH=/home/user/go GOBIN=/home/user/.local/bin /usr/local/go/bin/go install golang.org/x/tools/gopls@latest",
  )
  .runCmd(
    "GOPATH=/home/user/go GOBIN=/home/user/.local/bin /usr/local/go/bin/go install github.com/air-verse/air@latest",
  )

  // ── Phase 3: Symlink user-space tools into /usr/local/bin ──
  .setUser("root")
  .runCmd("ln -sf /home/user/.deno/bin/deno /usr/local/bin/deno")
  .runCmd("ln -sf /home/user/.vite-plus/bin/vp /usr/local/bin/vp")
  .runCmd("ln -sf /home/user/.npm-global/bin/pnpm /usr/local/bin/pnpm")
  .runCmd("ln -sf /home/user/.npm-global/bin/firecrawl /usr/local/bin/firecrawl")
  .runCmd("ln -sf /home/user/.npm-global/bin/context7-mcp /usr/local/bin/context7-mcp")
  .runCmd("ln -sf /home/user/.cargo/bin/cargo /usr/local/bin/cargo")
  .runCmd("ln -sf /home/user/.cargo/bin/rustc /usr/local/bin/rustc")
  .runCmd("ln -sf /home/user/.cargo/bin/rustup /usr/local/bin/rustup")
  .runCmd("ln -sf /home/user/.cargo/bin/rustfmt /usr/local/bin/rustfmt")
  .runCmd("ln -sf /home/user/.cargo/bin/clippy-driver /usr/local/bin/clippy-driver")
  .runCmd("ln -sf /home/user/.local/bin/gopls /usr/local/bin/gopls")
  .runCmd("ln -sf /home/user/.local/bin/air /usr/local/bin/air")

  // ── Phase 4: Build-time envs (does NOT persist to runtime) ──
  .setEnvs({
    PATH: "/home/user/.npm-global/bin:/home/user/.bun/bin:/home/user/.cargo/bin:/home/user/.local/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    GOPATH: "/home/user/go",
    GOBIN: "/home/user/.local/bin",
    CARGO_HOME: "/home/user/.cargo",
  })
  .setWorkdir("/home/user");

export const templateId = "nova-bun-agent";
