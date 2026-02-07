import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import type { Addon } from '../types/addon';
import { getAllAddons, getAddonById, addonRegistry } from '../addons';

export function isSetmeupProject(projectDir: string = process.cwd()): boolean {
  const markerPath = path.join(projectDir, '.setmeup.json');
  return fs.existsSync(markerPath);
}

export async function handleAdd(addonId?: string): Promise<void> {
  const projectDir = process.cwd();

  if (!isSetmeupProject(projectDir)) {
    console.error(chalk.red('Error: This command only works inside projects scaffolded by setmeup CLI.'));
    console.error('Run this from a project created with "setmeup init".');
    process.exit(1);
  }

  let addon: Addon | undefined;

  if (addonId) {
    addon = getAddonById(addonId);
    if (!addon) {
      console.error(chalk.red(`Error: Addon "${addonId}" not found.`));
      console.error('Available addons:');
      getAllAddons().forEach(a => console.error(`  - ${a.id}: ${a.name}`));
      process.exit(1);
    }
  } else {
    // Interactive selection (card-style like presets: heavy title + desc + changes + filesImpact subtitle)
    const allAddons = getAllAddons();
    const choices = allAddons.map(a => ({
      name: chalk.bold(a.name) + '\n  ' + chalk.dim(a.description) + '\n  ' + chalk.dim('Changes: ' + a.changes) + '\n  ' + chalk.dim('Files: ' + a.filesImpact) + '\n',
      value: a.id
    }));

    const { selectedAddon } = await inquirer.prompt([
      {
        type: 'rawlist',
        name: 'selectedAddon',
        message: 'Choose an addon to add:',
        choices
      }
    ]);
    addon = getAddonById(selectedAddon);
  }

  if (addon) {
    console.log(chalk.blue(`\nApplying ${addon.name} addon...`));
    await addon.apply(projectDir);
  }
}

// Centralized constants + helpers to eliminate duplication across addons (consistent patterns)
export const DEP_VERSIONS = {
  'react-router-dom': '^6.26.2',
  'zustand': '^4.5.5',
  '@tanstack/react-query': '^5.59.0',
} as const;

export function detectExt(projectDir: string): { isTypeScript: boolean; ext: 'tsx' | 'jsx' } {
  const srcDir = path.join(projectDir, 'src');
  const isTypeScript = fs.existsSync(path.join(srcDir, 'App.tsx'));
  const ext = isTypeScript ? 'tsx' : 'jsx';
  return { isTypeScript, ext };
}

export function addDependencyIfMissing(projectDir: string, pkgName: keyof typeof DEP_VERSIONS): boolean {
  const pkgPath = path.join(projectDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.dependencies && pkg.dependencies[pkgName]) {
    return false; // already present
  }
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies[pkgName] = DEP_VERSIONS[pkgName];
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  return true;
}

export async function promptConfirm(message: string, defaultVal = true): Promise<boolean> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message,
      default: defaultVal
    }
  ]);
  return confirm;
}

export { addonRegistry, getAllAddons, getAddonById };
