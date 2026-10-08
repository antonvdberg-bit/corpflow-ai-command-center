# ADR: preserve the running Forge worker across host boot

Source: Anton's 8 October instruction to drive the whole-server maintenance closeout to completion. Separate from the read-only collector ADR. Current `corpflow-local-llm` is running with restart=no, so Docker startup alone would not restart it after host boot.

Bounded action: change only that existing container's restart policy to unless-stopped using docker update. Before/after formatted inspection must prove running=true, identical container ID/image, existing 4 GiB/3 CPU limit and unchanged restart count. Do not recreate/restart the container, pull/change/load a model, increase resources, change environment/ports or reboot. Intentional stops remain stopped. Persist the named policy in the recovery runbook; protected container metadata records it on the next existing backup.

Rollback: docker update --restart=no corpflow-local-llm, only if current image/container ID/resource cage match the recorded before-state. No application restart. This proves the configured boot policy only; a whole-host boot exercise still requires console/fallback and its own authorized window.
