# Test Subdomain Release Policy

Status: Active operating rule

Owner: CorpFlowAI delivery control

## Rule

Any site served from a subdomain matching:

```text
*.corpflowai.com
```

is a **test environment** unless Anton has explicitly designated that exact hostname as a production site.

Examples include:

```text
clientname.corpflowai.com
service.corpflowai.com
pilot.corpflowai.com
```

## Delivery process

For these test subdomains:

1. Do not prepare, publish, request approval for, or block delivery on a separate Vercel preview URL.
2. Do not treat a temporary `*.vercel.app` deployment as the acceptance environment.
3. Merge the approved implementation into the normal application delivery path.
4. Deploy the change to the confirmed `*.corpflowai.com` test hostname.
5. Run functional, data, authentication, upload, integration and browser checks directly on that test hostname.
6. Record the tested hostname, deployed commit, expected result, actual result and rollback path.
7. After Anton approves the tested result, publish or promote the approved implementation to the designated production site.
8. Validate the production site after publication.

## Required evidence

A delivery involving a `*.corpflowai.com` test site is not complete until the implementation has been verified on the actual mapped test hostname.

Required evidence:

```text
Test hostname
Deployed commit SHA
Deployment identifier where available
Database/schema state where applicable
Runtime checks performed
Expected versus actual result
Synthetic-data cleanup result where applicable
Rollback path
Anton approval before production publication
Production validation after publication
```

## Prohibited process drift

Do not:

- create an additional preview approval stage for a `*.corpflowai.com` test site;
- ask Anton to test both a Vercel preview and the mapped test subdomain;
- call a Vercel preview successful when its database, authentication, storage or environment differs from the mapped test site;
- delay test deployment solely because a separate preview environment cannot reproduce the required runtime state;
- publish to the production site before Anton approves the tested result.

## Environment interpretation

```text
*.corpflowai.com        = test environment
Temporary *.vercel.app = build/deployment signal only, not acceptance
Designated PROD site    = production publication target after approval
```

A hostname may be treated as production only when Anton explicitly confirms that exact hostname is the production site.

## Standard release sequence

```text
Build
→ tests and CI
→ merge
→ deploy to confirmed *.corpflowai.com test site
→ verify on that test site
→ Anton approval
→ publish/promote to PROD site
→ validate PROD
```
