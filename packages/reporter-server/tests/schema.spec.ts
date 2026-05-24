import { describe, it, expect } from 'vitest';
import { runs, tests, artifacts } from '../src/schema';
import { TraceAction } from '../src/trace-parser';

describe('Schema definitions', () => {
  it('runs table has required columns', () => {
    expect(runs.id.name).toBe('id');
    expect(runs.title.name).toBe('title');
    expect(runs.startedAt.name).toBe('started_at');
    expect(runs.endedAt.name).toBe('ended_at');
    expect(runs.project.name).toBe('project');
    expect(runs.totalTests.name).toBe('total_tests');
    expect(runs.passed.name).toBe('passed');
    expect(runs.failed.name).toBe('failed');
  });

  it('tests table has required columns', () => {
    expect(tests.id.name).toBe('id');
    expect(tests.runId.name).toBe('run_id');
    expect(tests.title.name).toBe('title');
    expect(tests.file.name).toBe('file');
    expect(tests.status.name).toBe('status');
    expect(tests.durationMs.name).toBe('duration_ms');
    expect(tests.errorText.name).toBe('error_text');
  });

  it('artifacts table has required columns', () => {
    expect(artifacts.id.name).toBe('id');
    expect(artifacts.testId.name).toBe('test_id');
    expect(artifacts.type.name).toBe('type');
    expect(artifacts.storagePath.name).toBe('storage_path');
    expect(artifacts.sizeBytes.name).toBe('size_bytes');
  });

  it('status enum contains expected values', () => {
    const enumValues = (tests.status.enumValues as string[]);
    expect(enumValues).toContain('passed');
    expect(enumValues).toContain('failed');
    expect(enumValues).toContain('skipped');
    expect(enumValues).toContain('flaky');
    expect(enumValues).toContain('timedout');
  });

  it('artifact type enum contains expected values', () => {
    const enumValues = (artifacts.type.enumValues as string[]);
    expect(enumValues).toContain('video');
    expect(enumValues).toContain('screenshot');
    expect(enumValues).toContain('trace');
  });
});

describe('TraceAction interface', () => {
  it('allows creating a valid TraceAction', () => {
    const action: TraceAction = {
      actionType: 'click',
      selector: '#button',
      actionIndex: 0,
      wallTime: Date.now(),
    };
    expect(action.actionType).toBe('click');
    expect(action.actionIndex).toBe(0);
  });
});
