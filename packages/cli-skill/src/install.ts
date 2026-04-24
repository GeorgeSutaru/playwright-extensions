import * as path from 'path';
import {
  readPlaywrightCliSkills,
  readBundledReferences,
  readBundledSkillTemplate,
  writeSkillFiles,
  getDefaultInstallDir,
  SkillFile,
} from './index';

const raceRefNames = [
  'multiple-outcomes.md',
  'error-handling.md',
  'dynamic-content.md',
  'visibility-modes.md',
];

export async function install(targetDir?: string): Promise<void> {
  const dir = targetDir || process.argv[2] || getDefaultInstallDir();

  console.log('Installing @playwright-extensions/cli-skill...');
  console.log(`Target directory: ${dir}\n`);

  const allFiles: SkillFile[] = [];

  const skillTemplate = readBundledSkillTemplate();
  if (skillTemplate) {
    allFiles.push({ path: 'SKILL.md', content: skillTemplate });
  } else {
    const cliSkills = readPlaywrightCliSkills();
    const skillMd = cliSkills.find(f => f.path === 'SKILL.md');
    if (skillMd) {
      allFiles.push(skillMd);
    }
    const cliRefs = cliSkills.filter(f => f.path.startsWith('references/'));
    allFiles.push(...cliRefs);
  }

  const bundledRefs = readBundledReferences();
  const raceRefs = bundledRefs.filter(f => raceRefNames.includes(path.basename(f.path)));
  allFiles.push(...raceRefs);

  writeSkillFiles(allFiles, dir);

  console.log(`\nInstalled ${allFiles.length} skill files to ${dir}`);
  console.log('\nTo use, ensure .claude/skills/playwright-race/ is in your skills path.');
}