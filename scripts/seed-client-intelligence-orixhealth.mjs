import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const issueUrl = 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1304';

const sources = [
  ['issue-1304', 'github_issue', 'OrixHealth discovery evidence · issue #1304', issueUrl],
  ['session-plan', 'operator_note', 'OrixHealth 2 October session plan', 'docs/execution/OPERATING_REVIEW_2026-09-27.md'],
];

const records = [
  ['operational-priority', 'FACT', 'Operational priority is control across stock, imports, banking and customer follow-up', 'The useful outcome is less administration, stronger stock control, faster reconciliation and better customer follow-up.', ['operations', 'priority'], 'high', 'verified', 'issue-1304'],
  ['catalogue-size', 'FACT', 'The catalogue is approximately 440 SKUs', 'The current working estimate is approximately 440 SKUs; verify the exact active catalogue during the session.', ['inventory', 'sku'], 'medium', 'stated', 'issue-1304'],
  ['import-flow', 'FACT', 'Import costing is calculated in Excel and Bills are created by Johan', 'Stock updates automatically after the bill, while freight, duty and other landed costs are recorded manually.', ['imports', 'landed-cost'], 'high', 'stated', 'issue-1304'],
  ['books-plan', 'FACT', 'Zoho Books Premium is active', 'Zoho Books Premium is the current plan identified in the pre-session questionnaire.', ['zoho', 'entitlement'], 'high', 'stated', 'issue-1304'],
  ['inventory-not-integrated', 'FACT', 'Zoho Inventory is not currently integrated', 'Products and stock are maintained in Zoho, but the Inventory product is not currently integrated with Books.', ['zoho', 'inventory'], 'high', 'stated', 'issue-1304'],
  ['batch-gap', 'FACT', 'Batch and lot tracking is not enabled', 'The current setup does not capture batch or lot information.', ['inventory', 'batch'], 'high', 'stated', 'issue-1304'],
  ['expiry-gap', 'FACT', 'Expiry tracking is unavailable in the current setup', 'Expiry dates are not currently available to the team.', ['inventory', 'expiry'], 'high', 'stated', 'issue-1304'],
  ['landed-cost-manual', 'FACT', 'Landed cost is currently manual', 'Freight, duty and import charges are recorded manually; native landed-cost entitlement must be checked live.', ['imports', 'landed-cost'], 'high', 'stated', 'issue-1304'],
  ['bank-mcb-csv', 'FACT', 'MCB reconciliation uses CSV import and manual reconciliation', 'MCB is not directly connected to Zoho Books; the current flow is CSV import followed by manual reconciliation in Banking.', ['banking', 'mcb'], 'high', 'stated', 'issue-1304'],
  ['bank-rules-unknown', 'UNKNOWN', 'MCB direct-feed support and transaction rules are unverified', 'Direct-feed support is not publicly verified for this organisation and the team is not sure whether bank transaction rules are configured.', ['banking', 'unknown'], 'high', 'open', 'issue-1304'],
  ['customer-master', 'FACT', 'Zoho Books is the customer master', 'Customer records are currently held in Zoho Books.', ['customers', 'source-of-truth'], 'high', 'stated', 'issue-1304'],
  ['customer-intelligence-gap', 'FACT', 'Buying-pattern and dormant-customer reporting is not in use', 'No current reporting identifies dormant customers or buying patterns.', ['customers', 'growth'], 'high', 'stated', 'issue-1304'],
  ['marketing-gap', 'FACT', 'No Zoho marketing applications are currently in use', 'Marketing applications are not currently enabled or operating in the identified workflow.', ['marketing'], 'high', 'stated', 'issue-1304'],
  ['whatsapp-unknown', 'UNKNOWN', 'Zoho WhatsApp use exists but the exact integration is unknown', 'Invoices, receipts and SOAs are reportedly sent through WhatsApp; identify the exact mechanism and ownership during the session.', ['whatsapp', 'verification'], 'high', 'open', 'issue-1304'],
  ['valerie-role', 'FACT', 'Valérie has administrator access and is central to configuration review', 'Valérie provided the questionnaire responses and should walk through organisation, inventory and reporting configuration.', ['stakeholder', 'valerie'], 'high', 'stated', 'issue-1304'],
  ['johan-role', 'FACT', 'Johan creates Bills and is important for banking and import workflow verification', 'Use a recent import and MCB CSV cycle to validate his operational hand-offs and reconciliation evidence.', ['stakeholder', 'johan'], 'high', 'inferred', 'session-plan'],
  ['nova-role', 'OBSERVATION', 'Nova is an existing local Zoho support option', 'Nova may hold historical setup knowledge. Do not assume replacement; use Nova for a verified specialist gap if appropriate.', ['partner', 'nova'], 'medium', 'operator_interpretation', 'issue-1304'],
  ['native-batch', 'RESEARCH_FINDING', 'Zoho Inventory natively supports batch and expiry fields', 'Research indicates batch number, manufacturer batch number, manufacturing date and expiry date are native Inventory capabilities; verify entitlement and workflow live.', ['zoho', 'inventory', 'batch'], 'medium', 'research', 'issue-1304'],
  ['batch-extension', 'RESEARCH_FINDING', 'A Zoho Batch Expiry Management extension may be a low/no-cost alternative', 'Investigate the extension before custom development. Cost and current compatibility must be verified before recommendation.', ['zoho', 'extension', 'expiry'], 'medium', 'research', 'issue-1304'],
  ['books-inventory-integration', 'RESEARCH_FINDING', 'Books and Inventory have a native integration path', 'Core items, contacts, bills, invoices, sales orders and purchase orders can synchronise when the products and entitlements support it.', ['zoho', 'integration'], 'medium', 'research', 'issue-1304'],
  ['native-landed-cost', 'RESEARCH_FINDING', 'Zoho Books may support native landed-cost allocation', 'Native landed-cost allocation depends on inventory tracking and plan entitlement; verify in the live organisation before quoting custom work.', ['zoho', 'landed-cost'], 'medium', 'research', 'issue-1304'],
  ['transaction-rules', 'RESEARCH_FINDING', 'Transaction Rules and matching may reduce manual reconciliation', 'Zoho Banking capabilities may reduce categorisation and matching effort without bank/API development.', ['zoho', 'banking'], 'medium', 'research', 'issue-1304'],
  ['crm-rfm', 'RESEARCH_FINDING', 'CRM segmentation and analytics are candidate native paths', 'CRM/Books integration, RFM segmentation and Analytics may expose dormant customers and purchase patterns, but edition and cost must not be assumed.', ['crm', 'analytics'], 'medium', 'research', 'issue-1304'],
  ['decision-path', 'DECISION', 'Use NATIVE → CONFIGURE → EXTENSION → PARTNER → CUSTOM', 'Classify every material requirement in this order. Custom work is last resort after native, configuration, extension and partner routes are disproved.', ['commercial', 'decision'], 'high', 'approved_strategy', 'session-plan'],
  ['phase-one', 'OPTION', 'Start with configuring what OrixHealth already owns', 'Prioritise item/customer structure, transaction rules, reconciliation process, landed-cost configuration if entitled, and simple reports before new software.', ['commercial', 'quick-wins'], 'high', 'approved_strategy', 'session-plan'],
  ['phase-two', 'OPTION', 'Add only one missing native capability if the gap is proven', 'Zoho Inventory is a candidate only if batch/lot/expiry is mandatory and cannot be satisfied in the current Books entitlement. Use trial/entitlement verification first.', ['commercial', 'inventory'], 'high', 'approved_strategy', 'session-plan'],
  ['session-outcome', 'COMMITMENT', 'The 2 October session must produce a verified gap matrix', 'For each material requirement record current capability, evidence, NATIVE/CONFIGURE/EXTENSION/PARTNER/CUSTOM/UNKNOWN classification, owner and quoted next step.', ['session', '2-october'], 'high', 'planned', 'session-plan'],
  ['session-question-entitlement', 'UNKNOWN', 'Verify subscriptions, modules, users, roles and existing integrations', 'Confirm exact Books entitlement, Inventory availability, Marketplace extensions, WhatsApp mechanism and Nova responsibilities before quotation.', ['session', 'verification'], 'high', 'open', 'session-plan'],
  ['session-question-inventory', 'UNKNOWN', 'Walk one real import from purchase through sale', 'Verify SKU discipline, receipts, batch/expiry, locations, landed cost, adjustments, reorder thresholds and reports actually used.', ['session', 'inventory'], 'high', 'open', 'session-plan'],
  ['session-question-banking', 'UNKNOWN', 'Walk one recent MCB CSV cycle with the reconciliation owner', 'Verify matching behaviour, transaction rules, recurring descriptions, unmatched exceptions and close evidence.', ['session', 'banking'], 'high', 'open', 'session-plan'],
  ['do-not-build', 'CONCERN', 'Do not build a replacement ERP, bank API, broad CRM or custom inventory system yet', 'The lowest-cost credible path is to improve Zoho first. Do not sell custom development until the verified gap matrix disproves native/configure/extension/partner routes.', ['scope', 'commercial'], 'high', 'approved_strategy', 'session-plan'],
];

async function main() {
  const space = await prisma.clientContextSpace.upsert({
    where: { contextKey: 'orixhealth' },
    update: { displayName: 'OrixHealth', primaryGithubIssue: 1304, lifecycle: 'prospect', status: 'active' },
    create: { contextKey: 'orixhealth', displayName: 'OrixHealth', primaryGithubIssue: 1304, lifecycle: 'prospect', status: 'active' },
  });
  await prisma.clientContextRecord.deleteMany({ where: { spaceId: space.id } });
  await prisma.clientContextSource.deleteMany({ where: { spaceId: space.id } });
  const sourceRows = {};
  for (const [key, sourceType, label, location] of sources) {
    sourceRows[key] = await prisma.clientContextSource.create({ data: { spaceId: space.id, sourceType, label, location } });
  }
  const recordRows = {};
  for (const [key, category, title, body, tags, confidence, verification, sourceKey] of records) {
    const record = await prisma.clientContextRecord.create({
      data: { spaceId: space.id, recordKey: key, category, title, body, tagsJson: tags, confidence, verification, state: 'current', sensitivity: 'internal' },
    });
    recordRows[key] = record;
    await prisma.clientContextRecordSource.create({
      data: { recordId: record.id, sourceId: sourceRows[sourceKey].id, claim: body },
    });
  }
  const relations = [
    ['native-batch', 'batch-extension', 'alternative_to', 'Compare native Inventory capability with the low/no-cost extension.'],
    ['decision-path', 'native-batch', 'supports', 'The decision order starts with native capability.'],
    ['decision-path', 'do-not-build', 'constrains', 'Custom work remains last resort.'],
    ['valerie-role', 'batch-gap', 'owns_verification', 'Administrator-led configuration review.'],
    ['johan-role', 'bank-mcb-csv', 'owns_verification', 'Walk the reconciliation cycle with the operational owner.'],
    ['nova-role', 'decision-path', 'informs', 'Existing specialist knowledge is a bounded partner option.'],
    ['session-question-banking', 'bank-rules-unknown', 'resolves', 'The session should turn this unknown into evidence.'],
    ['session-question-inventory', 'batch-gap', 'resolves', 'The session should verify the operational gap.'],
  ];
  for (const [fromKey, toKey, relationType, label] of relations) {
    await prisma.clientContextRelation.create({
      data: { spaceId: space.id, fromRecordId: recordRows[fromKey].id, toRecordId: recordRows[toKey].id, relationType, label },
    });
  }
  console.log(JSON.stringify({ ok: true, contextKey: space.contextKey, recordCount: records.length, sourceCount: sources.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
