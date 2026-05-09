import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  readBundledReferences,
  readBundledSkillTemplate,
  writeSkillFiles,
  getDefaultInstallDir,
} from '../src/index';

describe('skill file management', () => {
  describe('readBundledReferences', () => {
    it('returns reference files from bundled references directory', () => {
      const files = readBundledReferences();
      expect(files.length).toBeGreaterThan(0);
      
      const filenames = files.map(f => path.basename(f.path));
      expect(filenames).toContain('multiple-outcomes.md');
      expect(filenames).toContain('error-handling.md');
      expect(filenames).toContain('dynamic-content.md');
      expect(filenames).toContain('visibility-modes.md');
    });

    it('returns files with correct paths', () => {
      const files = readBundledReferences();
      for (const file of files) {
        expect(file.path).toMatch(/^references\//);
        expect(file.path).toMatch(/\.md$/);
      }
    });

    it('returns files with non-empty content', () => {
      const files = readBundledReferences();
      for (const file of files) {
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });

  describe('readBundledSkillTemplate', () => {
    it('returns the SKILL.md template content', () => {
      const content = readBundledSkillTemplate();
      expect(content).not.toBeNull();
      expect(typeof content).toBe('string');
      expect(content!.length).toBeGreaterThan(0);
    });

    it('contains pw-ext command documentation', () => {
      const content = readBundledSkillTemplate();
      expect(content).toContain('pw-ext');
      expect(content).toContain('race-locator');
    });
  });

  describe('writeSkillFiles', () => {
    const testDir = path.join(os.tmpdir(), `skill-test-${Date.now()}`);
    
    afterEach(() => {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('writes files to target directory', () => {
      const files = [
        { path: 'SKILL.md', content: '# Test Skill' },
        { path: 'references/test.md', content: '# Test Reference' },
      ];

      writeSkillFiles(files, testDir);

      expect(fs.existsSync(path.join(testDir, 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'references', 'test.md'))).toBe(true);
      
      const skillContent = fs.readFileSync(path.join(testDir, 'SKILL.md'), 'utf-8');
      expect(skillContent).toBe('# Test Skill');
    });

    it('creates nested directories', () => {
      const files = [
        { path: 'deep/nested/dir/file.md', content: 'content' },
      ];

      writeSkillFiles(files, testDir);

      expect(fs.existsSync(path.join(testDir, 'deep', 'nested', 'dir', 'file.md'))).toBe(true);
    });
  });

  describe('getDefaultInstallDir', () => {
    it('returns the default Claude skills directory', () => {
      const dir = getDefaultInstallDir();
      expect(dir).toContain('.claude');
      expect(dir).toContain('skills');
      expect(dir).toContain('playwright-race');
    });
  });
});
