# Change: Prepare complete-history native Books statements without sending

## Why

The native Zoho Books statement workflow can prepare outstanding statements but does not
yet provide a reviewed, complete-history preparation function for old and partially paid
invoices. A bounded offline planner and disabled Deluge draft reduce implementation risk
without touching client data or creating a send path.

## What Changes

- Add a pure, dependency-free planner that validates paginated invoice evidence and derives
  a complete unpaid-statement period.
- Add a disabled native Deluge preparation draft using the Books-supplied customer and
  organization context and a configurable named connection.
- Add synthetic focused tests and operator installation/verification documentation.

## Non-Goals and Safety

- No runtime service, database, dependency, schedule, credential, live API call, statement
  creation, customer mutation, email, or external send.
- Native compilation and live/read-only verification remain explicit follow-up gates.

## Impact

- Affected capability: `customer-statements`
- Allowed implementation files are limited to the three preparation files, one focused
  test, and this OpenSpec change directory.
- Parent issue: #1304. This is separate from #1486 / PR1487.
