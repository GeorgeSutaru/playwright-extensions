import * as fs from 'fs';
import * as path from 'path';

export interface SkillFile {
  path: string;
  content: string;
}

export function findPlaywrightSkillDir(): string | null {
  const home = require('os').homedir();
  const nvmHome = path.join(home, '.nvm', 'versions', 'node');

  const possiblePaths: string[] = [];

  if (fs.existsSync(nvmHome)) {
    const nodeVersions = fs.readdirSync(nvmHome).filter(v => v.startsWith('v'));
    for (const version of nodeVersions) {
      const cliPath = path.join(nvmHome, version, 'lib', 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright', 'lib', 'skill');
      possiblePaths.push(cliPath);
    }
  }

  possiblePaths.push(
    path.join(process.cwd(), 'node_modules', 'playwright', 'lib', 'skill'),
    path.join(process.cwd(), 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright', 'lib', 'skill'),
    path.join(__dirname, '..', 'node_modules', 'playwright', 'lib', 'skill'),
    path.join(__dirname, '..', '..', 'node_modules', 'playwright', 'lib', 'skill'),
    path.join(__dirname, '..', '..', '..', 'node_modules', 'playwright', 'lib', 'skill'),
  );

  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      return p;
    }
  }

  return null;
}

export function readPlaywrightCliSkills(): SkillFile[] {
  const skillDir = findPlaywrightSkillDir();
  if (!skillDir) {
    return [];
  }

  const files: SkillFile[] = [];

  const skillMd = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMd)) {
    files.push({
      path: 'SKILL.md',
      content: fs.readFileSync(skillMd, 'utf-8'),
    });
  }

  const refsDir = path.join(skillDir, 'references');
  if (fs.existsSync(refsDir) && fs.statSync(refsDir).isDirectory()) {
    const refFiles = fs.readdirSync(refsDir);
    for (const file of refFiles) {
      if (file.endsWith('.md')) {
        const filePath = path.join(refsDir, file);
        files.push({
          path: `references/${file}`,
          content: fs.readFileSync(filePath, 'utf-8'),
        });
      }
    }
  }

  return files;
}

export function readBundledReferences(): SkillFile[] {
  const bundledDir = path.join(__dirname, 'references');
  const files: SkillFile[] = [];

  if (!fs.existsSync(bundledDir)) {
    return files;
  }

  const refFiles = fs.readdirSync(bundledDir);
  for (const file of refFiles) {
    if (file.endsWith('.md')) {
      const filePath = path.join(bundledDir, file);
      files.push({
        path: `references/${file}`,
        content: fs.readFileSync(filePath, 'utf-8'),
      });
    }
  }

  return files;
}

export function readBundledSkillTemplate(): string | null {
  const templatePath = path.join(__dirname, 'templates', 'SKILL.md');
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf-8');
  }
  return null;
}

export function writeSkillFiles(files: SkillFile[], targetDir: string): void {
  for (const file of files) {
    const fullPath = path.join(targetDir, file.path);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file.content, 'utf-8');
    console.log(`  Written: ${file.path}`);
  }
}

export function getDefaultInstallDir(): string {
  const home = require('os').homedir();
  return path.join(home, '.claude', 'skills', 'playwright-race');
}