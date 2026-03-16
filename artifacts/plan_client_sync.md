# Plan: Client Sync Tool for Baserow Integration

## Overview
Create a new tool `baserow_client_sync.py` to fetch client-specific configurations from the Baserow System_Docs table. This enables the agent to dynamically load client settings (n8n_url, mission_statement) for personalized operations.

## Objectives
- Implement Pydantic-based ClientConfig model
- Create `get_client_config(client_id: str)` tool function
- Enable agent to load client configs on-demand
- Support commands like "Load Client_A and check their latest leads"

## Implementation Steps
1. **Create ClientConfig Model**
   - Use Pydantic BaseModel
   - Fields: client_id (str), n8n_url (str), mission_statement (str)
   - Add validation and defaults

2. **Implement Baserow Query Logic**
   - Use requests to query Baserow API
   - Authenticate with BASEROW_TOKEN from env
   - Filter System_Docs table by client_id
   - Handle errors (client not found, API issues)

3. **Create Tool Function**
   - Function: `get_client_config(client_id: str) -> ClientConfig`
   - Include <thought> blocks for complex logic
   - Return structured data for agent consumption

4. **Agent Integration**
   - Create/update src/agent.py wrapper
   - Parse "Load Client_X" commands
   - Fetch and store client config in agent memory/context
   - Enable subsequent tasks to use client-specific settings

5. **Testing & Validation**
   - Test with existing Client_A setup
   - Verify Baserow API connectivity
   - Ensure tool is auto-loaded by agent

## Dependencies
- requests (already in requirements)
- pydantic (already in requirements)
- Baserow table structure: System_Docs with columns client_id, n8n_url, mission_statement

## Risks & Mitigations
- API key exposure: Use env vars, no hardcoding
- Network failures: Add retries and error handling
- Schema changes: Flexible Pydantic model with optional fields

## Success Criteria
- Tool loads successfully in agent
- `get_client_config("Client_A")` returns valid ClientConfig
- Agent can execute "Load Client_A and check their latest leads" without errors