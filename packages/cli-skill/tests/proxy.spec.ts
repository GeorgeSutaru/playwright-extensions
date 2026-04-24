import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { findPlaywrightCliBin, proxyToPlaywrightCli } from '../src/proxy';

describe('proxy module', () => {
  describe('findPlaywrightCliBin', () => {
    it('returns a path or null', () => {
      const result = findPlaywrightCliBin();
      expect(result).toBeDefined();
    });

    it('returns null when playwright-cli is not in PATH', () => {
      const originalPath = process.env.PATH;
      try {
        process.env.PATH = '/nonexistent/path';
        const result = findPlaywrightCliBin();
        expect(result).toBeNull();
      } finally {
        process.env.PATH = originalPath;
      }
    });
  });

  describe('proxyToPlaywrightCli', () => {
    it('does not throw for empty args', () => {
      const originalExit = process.exit;
      let exitCode: number | null = null;
      
      vi.spyOn(process, 'exit').mockImplementation((code) => {
        exitCode = code;
        throw new Error('__exit__');
      });

      try {
        proxyToPlaywrightCli([]);
      } catch (err: any) {
        if (err.message !== '__exit__') {
          throw err;
        }
      } finally {
        process.exit = originalExit;
      }

      expect(exitCode).not.toBeNull();
    });
  });
});
