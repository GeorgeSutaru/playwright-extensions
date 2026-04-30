import { createHash } from 'crypto';

export interface ActionFingerprint {
  actionType: string;
  selector: string;
  sourceLocation: string;
  actionIndex: number;
}

export function computeFingerprint(action: ActionFingerprint): string {
  const raw = `${action.actionType}|${action.selector}|${action.sourceLocation}|${action.actionIndex}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}
