# Vercel Coding Agent Plugin (CorpFlow policy)

Purpose: speed up delivery **without** increasing production risk.

This doc is about the **Vercel plugin for AI coding agents** (Vercel “agent resources” plugin), not our application code.

## What it is (in plain terms)

- It makes the coding agent “Vercel-aware” (deployments, env, logs, cron behavior, etc.).
- It does **not** automatically grant Vercel permissions by itself.
- Safety depends on the **Vercel credentials / role** you pair with it.

## Where to install

Install wherever the agent runs:

- **Your laptop (Cursor)**: helps when you’re driving manually.
- **Cloud agent environment**: helps when your laptop is off.

Command (run in the repo directory):

```bash
npx plugins add vercel/vercel-plugin
```

Vercel reference: `https://vercel.com/docs/agent-resources/vercel-plugin`

## Safe constraints (required)

We want **speed** (triage + preview) with **control** (production gated).

- **Allowed**
  - Read deployments / build logs / runtime logs
  - Preview deploys / redeploy previews
  - Read env var *names* and “missing env” diagnostics

- **Gated (human approval required)**
  - Promote to **Production**
  - Edit **Production** env vars
  - Domains / DNS / certificates
  - Delete deployments / projects

If Vercel permissions are coarse-grained, prefer a role like **Developer** over **Admin/Owner**.

## Operating rule (non-negotiable)

The agent can propose production changes, but **production promotion remains a PR + approval step**.
This matches our broader “Brain vs Hands” model (`docs/EXECUTION_BRAIN_VS_HANDS.md`).

