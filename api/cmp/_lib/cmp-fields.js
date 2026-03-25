/**
 * Baserow "user field names" for the CMP Change Requests table.
 * Override via env to match your workspace schema.
 */

export function getCmpFieldMap() {
  return {
    description: process.env.BASEROW_CMP_DESCRIPTION_FIELD || 'Description',
    status: process.env.BASEROW_CMP_STATUS_FIELD || 'Status',
    stage: process.env.BASEROW_CMP_STAGE_FIELD || 'Stage',
  };
}

export function initialTicketPayload(description) {
  const f = getCmpFieldMap();
  return {
    [f.description]: description,
    [f.status]: process.env.BASEROW_CMP_INITIAL_STATUS || 'Open',
    [f.stage]: process.env.BASEROW_CMP_INITIAL_STAGE || 'Intake',
  };
}

export function approveBuildPayload() {
  const f = getCmpFieldMap();
  return {
    [f.stage]: process.env.BASEROW_CMP_BUILD_STAGE_VALUE || 'Build',
    [f.status]: process.env.BASEROW_CMP_BUILD_STATUS_VALUE || 'Approved',
  };
}
