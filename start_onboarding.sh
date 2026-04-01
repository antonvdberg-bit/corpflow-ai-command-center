#!/bin/bash
export $(cat .env | xargs)
python3 -m core.onboarding.tenant_onboarding
