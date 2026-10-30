## ADDED Requirements

### Requirement: Synthetic batch allocation

The prototype SHALL plan positive item quantities against validated synthetic
batches using available balance (`balanceQuantity - reservedQuantity`), FEFO
ordering, and deterministic received-date and batch-ID tie breakers.

#### Scenario: FEFO split

- **WHEN** an item requests eight units and the earliest lot has six available
- **THEN** the plan allocates six from the earliest lot and two from the next
  eligible lot

#### Scenario: Shortage

- **WHEN** eligible stock is less than the request
- **THEN** the plan reports the unallocated quantity and does not mutate state

### Requirement: Safe local ledger mutation

The prototype SHALL validate dates, units, quantities, identities, versions,
and complete allocation splits before atomically committing a receipt or
allocation. State-changing requests SHALL support idempotent replay and reject
conflicting payloads.

#### Scenario: Stale plan

- **WHEN** a second plan uses a batch version changed by a prior commit
- **THEN** the second commit is rejected without partially applying its split

#### Scenario: Reversal

- **WHEN** a committed allocation is reversed for the first time
- **THEN** the allocation quantities are returned to the current lot balances,
  later receipts and sales are preserved, and a second reversal is rejected

### Requirement: Honest offline demonstration

The prototype SHALL provide a responsive static demonstration labelled as
synthetic and disconnected from Zoho, and SHALL document unproven Books
integration paths and local-only rollback.

#### Scenario: Review flow

- **WHEN** an operator opens the local demo
- **THEN** they can receive stock, review and confirm a suggested split, see
  history, undo the last allocation, and reset the in-memory state

### Requirement: Synthetic read-only register adapter

The prototype SHALL adapt synthetic paginated register and movement records
through an injected read-only transport and explicit field map. It MUST
require verified openings, preserve exact quantities, replay supported
movements, and reject malformed or conflicting evidence without mutating
fetched records.

#### Scenario: Paginated synthetic preview

- **WHEN** a mapped synthetic register has two lots with six and ten units
  and the request is eight units
- **THEN** all pages are read and the result proposes six from the earliest
  expiry and two from the next lot without any write operation

#### Scenario: Missing baseline

- **WHEN** a requested lot has no explicitly verified opening baseline
- **THEN** the adapter blocks the preview rather than resetting or guessing
  the opening quantity

#### Scenario: Reversal replay

- **WHEN** an allocation of two follows an opening ten and later receipt of
  five, then its valid full reversal is read
- **THEN** the derived balance is fifteen and the later receipt remains
  represented

### Requirement: Explicit item expiry policy and daily review

The prototype MUST normalize one canonical item policy to `required`,
`not_applicable`, or `review`. Missing, blank, unknown, or conflicting policy
MUST fail closed as `review` and MUST NOT infer exemption. Required stock MUST
use FEFO and valid future expiry; exempt stock MUST use receipt date and stable
batch ID without requiring or fabricating expiry; review stock MUST block
allocation. Plans and commits MUST carry and recheck policy.

#### Scenario: Exempt undated stock

- **WHEN** a classified exempt item has positive available undated lots
- **THEN** the planner allocates by receipt order and preserves all stock
  controls and legacy expiry values

#### Scenario: Classification blocker

- **WHEN** an item policy is missing or unknown
- **THEN** allocation is blocked and the item appears in the classification
  review bucket

#### Scenario: Daily review

- **WHEN** a pure report receives normalized items, replayed lot balances, and
  an explicit Gregorian as-of date
- **THEN** it returns deterministic excluded, classification, missing/invalid,
  and mutually exclusive expiry-age buckets without sending or scheduling

### Requirement: Native-shaped Books page bridge

The prototype SHALL expose a transport-injected bridge that validates
synthetic native `items` and `module_records` page envelopes, maps records
through explicit source callbacks, and returns only the normalized pages
consumed by the existing preview adapter. It MUST reject provenance,
organization, module, page, cursor, collection, lookup, baseline, unit, and
movement-encoding failures without fallback or raw-response disclosure.

#### Scenario: Native pages feed the preview

- **WHEN** multi-page synthetic item, lot-register, and movement envelopes are
  read through the bridge
- **THEN** the existing preview adapter consumes every page and produces the
  same exact FEFO split as direct normalized records without any write method

#### Scenario: Native evidence is incomplete

- **WHEN** a native page lacks verified opening, reservation, canonical lookup,
  unit, or supported movement evidence
- **THEN** the bridge or existing adapter blocks the preview rather than
  guessing a zero, conversion, identity, date, sequence, or movement meaning

#### Scenario: Native envelope is malformed or out of order

- **WHEN** code, page context, collection, organization, module, page, cursor,
  record shape, or mapping output is invalid
- **THEN** the bridge rejects the page safely and never returns a successful
  partial report

### Requirement: Disabled native identity readback diagnostic

The prototype SHALL provide a disabled, dependency-free CommonJS diagnostic
that uses only an explicitly reviewed private configuration and a native
GET-only callback connector to read complete register, movement, and item
pages. It MUST reject a mismatched or malformed organization attestation,
record an absent attestation as unknown, and keep account scope unverified;
it MUST also require exact
configured collection keys, bounded pages and bodies, scalar identity
lookups, exact opening metadata, register status/date, and canonical item
unit. Reports MUST remain read-only, non-operational, allocation-unready,
and redacted.

#### Scenario: Exact later-page identity chain

- **WHEN** the selected movement, register, and item occur on later pages and
  the movement lot and register item are exact scalar IDs
- **THEN** the diagnostic returns an `ok` identity readback with the selected
  values while claiming no stock-control or allocation readiness

#### Scenario: Ambiguous native evidence

- **WHEN** a lookup is missing, blank, object-shaped, mismatched, duplicated,
  or the exact collection/pagination envelope is invalid
- **THEN** the complete diagnostic fails with only bounded category/stage/source
  details and no raw response or private marker

#### Scenario: No activation by construction

- **WHEN** the module is required or the factory is constructed
- **THEN** no request is made; network access occurs only after explicit native
  invocation with a private reviewed binding
