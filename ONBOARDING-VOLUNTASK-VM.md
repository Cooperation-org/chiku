# voluntask VM — onboarding

Landing page for new developers working on the voluntask fork of Marten.
This file describes the VM we develop on; it is **not** upstream Marten
documentation and should stay in our fork only.

## Reaching the VM

voluntask lives on Proxmox as VM 513 with internal IP `10.0.0.163`.

- Inside the 10.0.0.0/24 net: `ssh <you>@10.0.0.163`
- From outside via the Proxmox host: `ssh -p 2513 <you>@<proxmox-host>`
  (cobox SSH-forward convention: `2<VMID>` → VM:22)

Future domain once DNS lands: `vols.cooperation.org` (Caddy on the
Proxmox host terminates TLS; this VM's nginx is plain HTTP only).

## First time on the box

1. Read `~/CLAUDE.md` — symlink to `/opt/shared/CLAUDE.md`, the team's
   shared context. Hard rules, paths, workflow.
2. Scribble personal preferences into `~/my-claude.md` — that file stays
   yours; the shared one is shared.
3. `claude` is on `$PATH` (via `/opt/shared/tools`). Uses the
   claude-slots wrapper for concurrent-session management.

## Infrastructure snapshot

- **Postgres**: remote at `10.0.0.100:5432`, DB `voluntask`. **Never**
  install postgres locally. **Never** ssh to VM 100 directly.
- **RabbitMQ + Redis**: local, for Taiga events and Celery.
- **App code**: `/opt/apps/` (group-writable by `voluntask`):
  - `marten/` — the fork. This is our main work.
  - `taiga-back/` — Django backend (Python 3.10 venv at `.venv/`).
  - `taiga-events/` — Node events service.
  - `taiga-protected/` — protected-media service.
- **Taiga services**: `taiga-back`, `taiga-back-celery`, `taiga-events`,
  `taiga-protected` — systemd units. `systemctl status <unit>`,
  `journalctl -u <unit> -f`.
- **nginx** listens on `:80`. `/` serves Marten, `/api` `/admin`
  `/static` go to taiga-back, `/events` to taiga-events websocket,
  `/media` to taiga-protected.

## The mission

Marten today mimics Linear — great for engineers, not ideal for human
rights volunteers. We add a **volunteer-friendly view** as an *option*
(toggle, per-board, or per-instance), defaulting on for volunteer
contexts, **never** replacing the engineer UI. When stable and
verifiably safe, we merge back upstream.

## Development workflow

Authoritative steps live in `/opt/shared/CLAUDE.md`. Quick pointers:

```bash
cd /opt/apps/marten
git checkout -b feat/<your-feature>
npm install                               # if package.json changed
npm run dev -- --host 0.0.0.0 --port 3001
```

Port 3001 is the house pick; anything in 3000–3099 is fine. Always
check: `ss -tlnp | grep <port>`.

To deploy a Marten build to nginx:

```bash
npm run build
sudo rsync -a --delete build/ /var/www/marten/
sudo chown -R www-data:voluntask /var/www/marten
sudo nginx -t && sudo systemctl reload nginx
```

After a backend change:

```bash
sudo systemctl restart taiga-back taiga-back-celery
journalctl -u taiga-back -f
```

## GitHub

Each user generates their own github key:

```bash
ssh-keygen -t ed25519 -C "<you>@..." -f ~/.ssh/id_rsa_github
cat ~/.ssh/id_rsa_github.pub       # paste into github → settings → ssh keys
```

In `~/.ssh/config`:

```
Host github.com
  IdentityFile ~/.ssh/id_rsa_github
  IdentitiesOnly yes
```

Never push directly to `main` on the Marten fork. Feature branch → PR
in `Cooperation-org/marten`.

## Hard rules (from `/opt/shared/CLAUDE.md`)

- **No Docker**, ever. We're already in a VM.
- **Do not break the engineer-facing UI**. Volunteer view is an
  alternative mode, never a replacement.
- **Be conservative about modifying Taiga itself**. Prefer frontend
  changes or plugins so the backend stays upgradeable.
- **Postgres is remote** — don't install it locally.
- **Stop and ask** if something fails or looks off.

## Who has sudo

Humans who operate the VM: golda, peter, sia, marwan, aya.
`voluntask` group membership gives you app-dir access but **not** sudo —
sudo is granted deliberately, per-user.

## Adding another developer

Sudoers run:

```bash
sudo add-app-user <username>
# or with explicit key:
sudo add-app-user <username> "ssh-ed25519 AAAA... user@host"
```

Granting sudo is a separate step — don't bundle it.

## When in doubt

Read `/opt/shared/NOTES.md` for the running log of infra changes. Ask
in the team chat. Don't hack around surprises.
