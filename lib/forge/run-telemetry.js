import { buildForgeCompletionReceipt } from './task-contracts.js';

function text(value) {
  return value == null ? '' : String(value).trim();
}

export function buildForgeRunTelemetry(input) {
  const startedAt = new Date(input.startedAt);
  const completedAt = new Date(input.completedAt);
  const elapsedMs = Math.max(0, completedAt.getTime() - startedAt.getTime());

  const receipt = input.completionReceipt || buildForgeCompletionReceipt({
    sourceIssue: input.sourceIssue,
    executorRunId: input.executorRunId || input.runId || input.workItem,
    contractName: input.taskContract,
    allowedFiles: input.allowedFiles,
    verifier: input.verifier,
    result: input.result,
    evidenceSummary: input.evidenceSummary,
    artifactRef: input.artifactRef,
    blocker: input.blocker,
    transportStatus: input.transportStatus,
    protectedActionsNotTaken: input.protectedActionsNotTaken,
  });
  return {
    workItem: text(input.workItem),
    taskContract: text(input.taskContract),
    agent: text(input.agent || 'Forge'),
    modelRuntime: text(input.modelRuntime) || null,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    elapsedMs,
    result: text(input.result),
    verifier: text(input.verifier),
    verifierPassed: input.verifierPassed === true,
    inputTokens: Number.isFinite(input.inputTokens) ? input.inputTokens : null,
    outputTokens: Number.isFinite(input.outputTokens) ? input.outputTokens : null,
    cpuMs: Number.isFinite(input.cpuMs) ? input.cpuMs : null,
    peakRamMb: Number.isFinite(input.peakRamMb) ? input.peakRamMb : null,
    escalatedToCursor: input.escalatedToCursor === true,
    artifactRef: text(input.artifactRef) || null,
    issueOrPrRef: text(input.issueOrPrRef) || null,
    completionReceipt: receipt,
  };
}
