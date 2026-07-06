# LuxeMaurice AI handoff corpus (Groq ticket refinement)

**Source (operator sync):** [luxemaurice-ai-handoff on Google Drive](https://drive.google.com/drive/folders/1CdKzjZApEn1ztChkDVxtfHkXp9dkpFkJ?usp=drive_link)

## Purpose

When a Lux operator creates a change ticket on `https://lux.corpflowai.com/change`, the governed Groq refiner may include **text excerpts from this folder** as programme context (Lux tenant only).

## How to sync

1. Download or mirror the full Drive folder locally.
2. Copy **all** project files into this directory (`artifacts/luxe-maurice-ai-handoff/`), preserving relative paths where practical.
3. Do **not** commit secrets (`.env`, credentials, API keys). Use `.env.example` only.
4. After sync, create a ticket on Lux `/change` preview or production and confirm `groq.change_refiner` telemetry shows `handoff_loaded: true` when files are present.

## Scope note

This folder is **evaluation / refinement context**, not runtime application code. Production behaviour stays in the CorpFlow AI Command Center repo unless separately authorised.
