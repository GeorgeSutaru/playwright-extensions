import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, buildScript } from '../src/commands/race-locator';

describe('race-locator argument parsing', () => {
  describe('parseArgs', () => {
    it('parses basic selectors', () => {
      const result = parseArgs(['#a', '#b', '#c']);
      expect(result.selectors).toEqual(['#a', '#b', '#c']);
      expect(result.timeout).toBe(0);
      expect(result.visibilityMode).toBe('default');
      expect(result.session).toBe('default');
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
      const result = parseArgs(['#a', '#b', '--session', 'my-session']);
      expect(result.session).toBe('my-session');
    });

    it('parses selectors with -s shorthand', () => {
      const result = parseArgs(['#a', '#b', '-s', 'my-session']);
      expect(result.session).toBe('my-session');
    });

    it('parses all options together', () => {
      const result = parseArgs([
        '#a', '#b', '#c',
        '--timeout', '10000',
        '--visibility', 'visible',
        '--session', 'test-session',
      ]);
      expect(result.selectors).toEqual(['#a', '#b', '#c']);
      expect(result.timeout).toBe(10000);
      expect(result.visibilityMode).toBe('visible');
      expect(result.session).toBe('test-session');
    });

    it('handles selectors with unknown options', () => {
      const result = parseArgs(['#a', '#b', '--unknown', 'value']);
      // --unknown value is treated as two selectors since it starts with --
      expect(result.selectors).toContain('#a');
      expect(result.selectors).toContain('#b');
    });

    it('handles single selector', () => {
      const result = parseArgs(['#only']);
      expect(result.selectors).toEqual(['#only']);
    });

    it('handles selectors with special characters', () => {
      const result = parseArgs(['button:has-text(Pay)', 'button:has-text(Checkout)']);
      expect(result.selectors).toEqual(['button:has-text(Pay)', 'button:has-text(Checkout)']);
    });
  });

  describe('buildScript', () => {
    it('generates valid script for single selector', () => {
      const script = buildScript(['#a'], 0, 'default');
      expect(script).toContain('page.locator(\'#a\')');
      expect(script).toContain('locators.length === 1');
      expect(script).toContain('timeout = 0');
    });

    it('generates valid script for multiple selectors', () => {
      const script = buildScript(['#a', '#b'], 0, 'default');
      expect(script).toContain('page.locator(\'#a\')');
      expect(script).toContain('page.locator(\'#b\')');
      expect(script).toContain('acc.or(loc)');
    });

    it('escapes single quotes in selectors', () => {
      const script = buildScript(["button:has-text('Pay')"], 0, 'default');
      expect(script).toContain("\\'");
    });

    it('escapes backslashes in selectors', () => {
      const script = buildScript(['path\\\\to\\\\element'], 0, 'default');
      expect(script).toContain('\\\\');
    });

    it('respects timeout parameter', () => {
      const script = buildScript(['#a'], 5000, 'default');
      expect(script).toContain('timeout = 5000');
    });

    it('respects visibility mode - presence', () => {
      const script = buildScript(['#a'], 0, 'presence');
      expect(script).toContain('visibilityMode = \'presence\'');
      expect(script).toContain('? \'attached\'');
      expect(script).toContain('loc.count() > 0');
    });

    it('respects visibility mode - visible', () => {
      const script = buildScript(['#a'], 0, 'visible');
      expect(script).toContain('visibilityMode = \'visible\'');
      expect(script).toContain(': \'visible\'');
      expect(script).toContain('loc.isVisible()');
    });

    it('respects visibility mode - default', () => {
      const script = buildScript(['#a'], 0, 'default');
      expect(script).toContain('visibilityMode = \'default\'');
    });

    it('throws error when no locator satisfies condition', () => {
      const script = buildScript(['#a', '#b'], 0, 'default');
      expect(script).toContain('No locator satisfied the visibility condition');
    });
  });
});
