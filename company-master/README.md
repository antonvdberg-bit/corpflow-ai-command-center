# Company Master (repository foundation)

Controller: GitHub issue **#765** · Draft PR **#770**

Governed company identity, facts, assets and document-reference hub for CorpFlowAI and client companies. This package is **schemas, vocabularies, synthetic fixtures, deterministic validate/resolve libraries and tests only**.

## Layout

```text
company-master/
├── README.md
├── config/vocabularies.json
├── schemas/company-master-record.schema.json
├── examples/
│   ├── corpflowai.synthetic.json
│   └── client-onboarding.synthetic.json
├── lib/
│   ├── paths.js
│   ├── load.js
│   ├── validate.js
│   ├── resolve.js
│   └── security.js
├── tests/company-master.test.mjs
└── operations/REPOSITORY_STORAGE_REUSE_AUDIT.md
```

Companion plan: `docs/company-master/COMPANY_MASTER_V1_BUILD_PLAN.md`

## Commands

```bash
node --test node-tests/company-master.test.mjs
# or
node --test company-master/tests/company-master.test.mjs
```

`npm test` includes the `node-tests` entry.

## Non-actions

- No production Postgres / schema / data mutation
- No ERPNext write, Drive permission change, deploy, or secrets
- No binary files or real restricted document contents in GitHub
- No second app or second database
