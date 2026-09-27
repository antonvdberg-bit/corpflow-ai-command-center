# Browser Verification Readiness Gate

Status: required for WMA production-quality visual/runtime evidence; current execution sandbox remains blocked for public rendered browsing.

## Purpose
Provide deterministic evidence for claims that cannot be safely inferred from text extraction.

## Required capabilities
- desktop viewport render
- mobile viewport render
- screenshot capture
- navigation/click verification
- CTA destination verification
- form-control rendering inspection
- safe validation/error-state testing where authorised
- trace/evidence retention

## Preferred tool
Playwright or equivalent deterministic browser automation.

Agentic browser tooling may assist exploratory review, but it must not replace deterministic acceptance checks.

## Preconditions
- [ ] browser-capable environment has outbound public DNS/network access
- [ ] no client login/private-data requirement
- [ ] target is approved public site or preview URL
- [ ] no live form submission unless separately approved
- [ ] screenshots/traces contain no private credentials/data
- [ ] desktop and mobile viewport definitions are recorded

## Minimum evidence
For each production-quality audit or preview verification:
- [ ] desktop full-page or representative screenshots
- [ ] mobile full-page or representative screenshots
- [ ] primary navigation exercised
- [ ] primary CTA destination confirmed
- [ ] material forms visibly checked
- [ ] overflow/clipping check
- [ ] result recorded PASS / PARTIAL / BLOCKED

## Current blocker
The previously available local Chromium runtime could not resolve public DNS from its sandbox. This is an environment limitation, not a WMA product failure.

## Pass condition
A browser-capable environment can reproduce the checklist on an approved public site or preview URL and retain evidence without production mutation.

No production deploy, package change in the CorpFlowAI repo, or client credential use is authorised by this document.
