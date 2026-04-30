import { describe, it, expect } from 'vitest';
import { computeFingerprint, ActionFingerprint } from '../src/fingerprint';

describe('computeFingerprint', () => {
  it('produces a 16-character hex string', () => {
    const action: ActionFingerprint = {
      actionType: 'click',
      selector: 'text=Submit',
      sourceLocation: 'tests/checkout.spec.ts:42',
      actionIndex: 0,
    };
    const fp = computeFingerprint(action);
    expect(fp).toHaveLength(16);
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic for the same input', () => {
    const action: ActionFingerprint = {
      actionType: 'fill',
      selector: 'css=input[name=email]',
      sourceLocation: 'tests/login.spec.ts:15',
      actionIndex: 1,
    };
    expect(computeFingerprint(action)).toBe(computeFingerprint(action));
  });

  it('produces different fingerprints for different actions', () => {
    const a1: ActionFingerprint = {
      actionType: 'click',
      selector: 'text=Submit',
      sourceLocation: 'tests/checkout.spec.ts:42',
      actionIndex: 0,
    };
    const a2: ActionFingerprint = {
      actionType: 'click',
      selector: 'text=Cancel',
      sourceLocation: 'tests/checkout.spec.ts:42',
      actionIndex: 0,
    };
    expect(computeFingerprint(a1)).not.toBe(computeFingerprint(a2));
  });

  it('produces different fingerprints for different action indices', () => {
    const a1: ActionFingerprint = {
      actionType: 'click',
      selector: 'text=Submit',
      sourceLocation: 'tests/checkout.spec.ts:42',
      actionIndex: 0,
    };
    const a2: ActionFingerprint = {
      actionType: 'click',
      selector: 'text=Submit',
      sourceLocation: 'tests/checkout.spec.ts:42',
      actionIndex: 1,
    };
    expect(computeFingerprint(a1)).not.toBe(computeFingerprint(a2));
  });

  it('produces different fingerprints for different source locations', () => {
    const a1: ActionFingerprint = {
      actionType: 'click',
      selector: 'text=Submit',
      sourceLocation: 'tests/checkout.spec.ts:42',
      actionIndex: 0,
    };
    const a2: ActionFingerprint = {
      actionType: 'click',
      selector: 'text=Submit',
      sourceLocation: 'tests/login.spec.ts:10',
      actionIndex: 0,
    };
    expect(computeFingerprint(a1)).not.toBe(computeFingerprint(a2));
  });
});
