/**
 * NDJSON utilities for VS Code integration
 */

export interface NDJSONEvent {
  event: 'token' | 'patch' | 'complete' | 'error' | 'plan' | 'approval';
  data: any;
}

export function emitEvent(event: NDJSONEvent): void {
  console.log(JSON.stringify(event));
}

export function emitToken(content: string): void {
  emitEvent({ event: 'token', data: content });
}

export function emitPatch(file: string, diff: string): void {
  emitEvent({ event: 'patch', data: { file, diff } });
}

export function emitComplete(status: string, meta?: any): void {
  emitEvent({ event: 'complete', data: { status, ...meta } });
}

export function emitError(error: string): void {
  emitEvent({ event: 'error', data: error });
}

export function emitPlan(steps: any[]): void {
  emitEvent({ event: 'plan', data: { steps } });
}

export function emitApprovalRequest(step: any): void {
  emitEvent({ event: 'approval', data: step });
}
