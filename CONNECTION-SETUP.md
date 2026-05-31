# Temporary VPS → Hermes SSH Setup

Use this to let the current machine (`/home/nova` on Hermes) SSH directly into your VPS.

Delete this file after setup if you want.

## Goal

Create a new SSH keypair **on the VPS**, then authorize that public key on the machine Hermes is running on so Hermes can SSH into the VPS directly.

## Important direction

You do **not** need a Cloudflare Tunnel for SSH in this workflow.

The connection direction is:

- Hermes machine → VPS

So the VPS just needs:

- reachable SSH (`22` or your chosen SSH port)
- a user account Hermes can log into
- Hermes public key authorized in that VPS user's `~/.ssh/authorized_keys`

---

## Option A — easiest and recommended

Do this **on the Hermes machine** first, because it already has an SSH keypair.

### 1) Show Hermes public key

On the Hermes machine, run:

```bash
cat ~/.ssh/id_ed25519.pub
```

Current key fingerprint on Hermes:

```text
SHA256:CqtKXtfeEfZGavH70L9bCmy55WpZw9p1OvedSk6wPuw
```

Current key comment:

```text
cloud@dlxstudios.com
```

### 2) On the VPS, create the target user's SSH directory

Replace `nova` below if you want a different login user.

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

### 3) Append the Hermes public key to `authorized_keys`

On the VPS:

```bash
nano ~/.ssh/authorized_keys
```

Paste the full output from:

```bash
cat ~/.ssh/id_ed25519.pub
```

Then set permissions:

```bash
chmod 600 ~/.ssh/authorized_keys
```

### 4) Confirm SSH is reachable on the VPS

On the VPS:

```bash
sudo ss -ltnp | grep :22
```

If you use a non-default SSH port, note it.

### 5) Confirm firewall allows SSH

If using `ufw` on the VPS:

```bash
sudo ufw status
```

If needed:

```bash
sudo ufw allow 22/tcp
```

If SSH uses a custom port, allow that instead.

### 6) Give Hermes the connection target

When setup is done, give Hermes one of these:

```text
nova@<vps-ip>
```

or

```text
nova@<dns-name>
```

If SSH is on a custom port, also say the port.

Example:

```text
nova@domains.dlxstudios.com port 22
```

---

## Option B — create a brand new key specifically for VPS access

Only do this if you want a dedicated throwaway key instead of reusing Hermes's existing `~/.ssh/id_ed25519`.

### 1) On the Hermes machine, generate a dedicated key

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_vps -C "hermes-vps-temp"
```

### 2) Show the new public key

```bash
cat ~/.ssh/id_ed25519_vps.pub
```

### 3) On the VPS, add it to `authorized_keys`

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Paste the public key into `authorized_keys`.

### 4) Tell Hermes to use that key explicitly

Hermes can then connect with:

```bash
ssh -i ~/.ssh/id_ed25519_vps nova@<vps-ip>
```

---

## If you prefer creating the key on the VPS instead

That is **not** the normal SSH direction for this use case.

If you create a key on the VPS, that key would mainly help the VPS SSH **outward** to somewhere else. It does not by itself let Hermes SSH **into** the VPS.

For Hermes to connect into the VPS, the VPS must trust a **Hermes-side public key** in `authorized_keys`.

So the correct trust relationship is:

- private key stays on Hermes machine
- matching public key goes into VPS `authorized_keys`

---

## Minimal verification checklist

After you finish VPS setup, Hermes should be able to test with:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 nova@<host> 'hostname && whoami'
```

Expected result:

- prints VPS hostname
- prints the SSH user
- exits without password prompt

---

## Troubleshooting on the VPS

### Check SSH service

```bash
sudo systemctl status ssh
```

or on some distros:

```bash
sudo systemctl status sshd
```

### Check listener

```bash
sudo ss -ltnp | grep ssh
```

### Check permissions

```bash
ls -ld ~/.ssh
ls -l ~/.ssh/authorized_keys
```

Expected:

- `~/.ssh` → `700`
- `authorized_keys` → `600`

### Check auth logs

Debian/Ubuntu:

```bash
sudo journalctl -u ssh -n 50 --no-pager
```

or

```bash
sudo tail -n 50 /var/log/auth.log
```

---

## What to send Hermes when complete

Send exactly:

```text
Host: <hostname-or-ip>
User: <ssh-user>
Port: <ssh-port>
Key: default Hermes key
```

Example:

```text
Host: domains.dlxstudios.com
User: nova
Port: 22
Key: default Hermes key
```
