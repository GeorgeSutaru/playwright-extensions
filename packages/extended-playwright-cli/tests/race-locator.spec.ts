import { describe, it, expect } from 'vitest';
import { parseArgs, buildScript } from '../src/commands/race-locator';

describe('race-locator argument parsing', () => {
  describe('parseArgs', () => {
    it('parses basic selectors', () => {
      const result = parseArgs(['#a', '#b']);
      expect(result.selectors).toEqual(['#a', '#b']);
      expect(result.timeout).toBe(0);
      expect(result.visibilityMode).toBe('default');
    });

    it('parses selectors with timeout', () => {
      const result = parseArgs(['#a', '#b', '--timeout', '5000']);
      expect(result.selectors).toEqual(['#a', '#b']);
      expect(result.timeout).toBe(5000);
    });

    it('parses selectors with visibility mode', () => {
      const result = parseArgs(['#a', '#b', '--visibility', 'presence']);
      expect(result.visibilityMode).toBe('presence');
    });

    it('parses selectors with session name', () => {
      const result = parseArgs(['#a', '#b', '--session', 'custom']);
      expect(result.session).toBe('custom');
    });

    it('parses selectors with -s shorthand', () => {
      const result = parseArgs(['#a', '#b', '-s', 'custom']);
      expect(result.session).toBe('custom');
    });

    it('parses all options together', () => {
      const result = parseArgs(['#a', '#b', '--timeout', '5000', '--visibility', 'visible', '--session', 'custom']);
      expect(result.selectors).toEqual(['#a', '#b']);
      expect(result.timeout).toBe(5000);
      expect(result.visibilityMode).toBe('visible');
      expect(result.session).toBe('custom');
    });

    it('handles selectors with unknown options', () => {
      const result = parseArgs(['#a', '--unknown', '#b']);
      expect(result.selectors).toEqual(['#a', '#b']);
    });

    it('handles single selector', () => {
      const result = parseArgs(['#only']);
      expect(result.selectors).toEqual(['#only']);
    });

    it('handles selectors with special characters', () => {
      const result = parseArgs(["div.class:has-text('hello')"]);
      expect(result.selectors).toEqual(["div.class:has-text('hello')"]);
    });
  });

  describe('buildScript', () => {
    it('generates valid script for single selector', () => {
      const script = buildScript(['#a'], 0, 'default');
      expect(script).toContain("page.locator('#a')");
      expect(script).toContain('if (locators.length === 1)');
    });

    it('generates valid script for multiple selectors', () => {
      const script = buildScript(['#a', '#b'], 0, 'default');
      expect(script).toContain("page.locator('#a')");
      expect(script).toContain("page.locator('#b')");
      expect(script).toContain('.or(loc)');
    });

    it('escapes single quotes in selectors', () => {
      const script = buildScript(["text='hello'"], 0, 'default');
      expect(script).toContain("\\'");
    });

    it('escapes backslashes in selectors', () => {
      const script = buildScript(['path\\to\\element'], 0, 'default');
      expect(script).toContain('\\\\');
    });

    it('respects timeout parameter', () => {
      const script = buildScript(['#a'], 5000, 'default');
      expect(script).toContain('const timeout = 5000');
    });

    it('respects visibility mode - presence', () => {
      const script = buildScript(['#a'], 0, 'presence');
      expect(script).toContain("'presence'");
      expect(script).toContain("'attached'");
    });

    it('respects visibility mode - visible', () => {
      const script = buildScript(['#a'], 0, 'visible');
      expect(script).toContain("'visible'");
    });

    it('respects visibility mode - default', () => {
      const script = buildScript(['#a'], 0, 'default');
      expect(script).toContain("'default'");
    });

    it('throws error when no locator satisfies condition', () => {
      const script = buildScript(['#a', '#b'], 0, 'default');
      expect(script).toContain('No locator satisfied the visibility condition');
    });
  });
});
