"""Local onboarding entrypoint (no external spreadsheet sync).

Database-backed tenants are created via the Factory API (Prisma/Postgres), e.g.
``POST /api/provision`` with ``tenantId``, ``slug``, and ``name``. This module
only documents that flow and optionally provisions **filesystem** workspaces via
``onboard_client.setup_client`` when you run it manually.

Returns:
    None
"""

from __future__ import annotations


def main() -> None:
    """Print operator guidance for Postgres-first provisioning."""
    print(
        "External spreadsheet onboarding sync is not used; use Postgres + API.\n"
        "- Postgres tenants: POST /api/provision (see lib/server/provision.js)\n"
        "- Local tenant folder only: python -c \"from core.onboarding.onboard_client "
        'import setup_client; print(setup_client(\'CLIENT_ID\', \'Display Name\'))"'
    )


if __name__ == "__main__":
    main()
