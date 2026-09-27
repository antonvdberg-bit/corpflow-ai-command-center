# WMA Quality & Source-Attribution Gates

## 1. Evidence first
Every material finding must cite a source URL, crawl result, rendered screenshot, runtime trace, or repository evidence.

## 2. Observation vs inference
Use only these states:
- VERIFIED: directly observed
- PARTIAL: some evidence, incomplete coverage
- BLOCKED: required evidence unavailable
- INFERRED: reasoned conclusion from indirect evidence

Never present INFERRED as VERIFIED.

## 3. No invented migration facts
AI must not invent prices, certifications, client names, legal claims, staff, locations, guarantees, dates, service availability, or product capabilities. Missing/contradictory facts become VERIFY.

## 4. Visual claims require rendered evidence
Do not mark responsive/mobile, clipping, hierarchy, typography, or image-cropping claims PASS without a rendered browser at the tested viewport.

## 5. Lead-path safety
Default behaviour: discover forms, inspect fields/consent, map destinations, and do not submit. Submission requires separate explicit approval if it can create a lead, booking, message, payment, or workflow event.

## 6. Deletion is never automatic
REMOVE is a recommendation until operator/client approval. Potential SEO, commercial, contractual, or legal value must be checked first.

## 7. Scoring is secondary
Scores summarise evidence and never override material findings.

## 8. Contradictions become VERIFY
When old and new pages disagree, record both. Do not silently reconcile them.

## 9. Client output is business-facing
Do not expose raw crawler noise. Explain business impact, evidence, and the smallest safe next step.

## 10. Production is a separate gate
Audit, planning, preview, and verification do not authorise deployment, DNS, messaging runtime, ERPNext writes, ElevenLabs activation, env/secrets changes, or DB/schema changes.
