# Architecture & trust-boundary decisions (ADR-lite)

**Purpose:** Short, dated records when we change **tenancy, security boundaries, automation trust, billing, or cross-system contracts**. Keeps “why we did X” in-repo instead of only in chat.

## When to add an entry

- New bypass, secret, or auth path (factory vs tenant vs ingest).  
- Hostname / apex / DNS policy change affecting clients.  
- New external dependency that holds or processes client data (subprocessor).  
- Breaking API or CMP behavior visible to tenants.

## Filename convention

`YYYYMMDD-short-title.md` (e.g. `20260404-tenant-hostname-onboarding-policy.md`)

## Suggested template (copy into new file)

```markdown
# Title

**Date:** YYYY-MM-DD  
**Status:** proposed | accepted | superseded-by-LINK

## Context
What problem or constraint triggered this?

## Decision
What we chose (one paragraph).

## Consequences
- Positive: …
- Negative / follow-ups: …

## Links
- Related code paths: …
- Docs updated: …
```

## Index

| Date | Topic | File |
|------|--------|------|
| — | *(add rows as you create files)* | — |
