#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import type { Preset } from './types/preset';
import { getAllPresets, saveCustomPreset, clearAllCustomPresets, deleteCustomPreset, loadCustomPresets } from './lib/presets';
import { setupProject } from './lib/setup';

program
  .name('setmeup')
  .description('CLI to set up React + Vite projects')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new project')
  .action(async () => {
    console.log('Welcome to setmeup!');

    const allPresets = getAllPresets();
    // Card-style options (title + subtitle/tech details; extra gap \n\n; active highlight on whole)
    const choices = [
      ...allPresets.map(p => ({
        name: chalk.bold(p.name) + '\n  ' + chalk.dim(p.description) + '\n',
        value: p.id
      })),
      {
        name: chalk.bold('Build your own stack (BYOS)') + '\n  ' + chalk.dim('Create custom React+Vite setup step-by-step') + '\n',
        value: 'byos'
      }
    ];

    const { presetId } = await inquirer.prompt([
      {
        type: 'rawlist',
        name: 'presetId',
        message: 'Choose a preset:',
        choices
      }
    ]);

    if (presetId === 'byos') {
      await handleByos();
    } else {
      const preset = allPresets.find(p => p.id === presetId);
      if (preset) {
        await handlePreset(preset);
      }
    }
  });

// Clear all custom presets
program
  .command('clear-presets')
  .description('Delete all custom presets')
  .action(() => {
    clearAllCustomPresets();
  });

// Clear specific preset
program
  .command('clear')
  .description('Delete a specific preset')
  .option('--preset <name>', 'Preset ID to delete')
  .action((cmd) => {
    if (!cmd.preset) {
      console.error('Usage: setmeup clear --preset=<name>');
      process.exit(1);
    }
    deleteCustomPreset(cmd.preset);
  });

// Reset/update a preset via BYOS
program
  .command('reset')
  .description('Reset/update a preset by starting BYOS with given name')
  .option('--preset <name>', 'Preset ID to reset')
  .action(async (cmd) => {
    if (!cmd.preset) {
      console.error('Usage: setmeup reset --preset=<name>');
      process.exit(1);
    }
    // Start BYOS but pre-set name for reset (allows update/override)
    console.log(`Resetting preset "${cmd.preset}" via BYOS...`);
    await handleByos(cmd.preset);
  });

// List custom presets
program
  .command('presets')
  .description('List all available custom presets')
  .action(() => {
    const customs = loadCustomPresets();
    if (customs.length === 0) {
      console.log('No custom presets found.');
      return;
    }
    console.log('Custom presets:');
    customs.forEach(p => {
      console.log(`- ${p.id}: ${p.name} (${p.description})`);
    });
  });

async function handlePreset(preset: Preset): Promise<void> {
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Enter project name:',
      default: preset.id + '-app',
      validate: (input: string) => input.trim() !== '' || 'Project name is required'
    }
  ]);

  const fileStructure = await askFileStructure();
  // Override structure in copy of preset for this setup
  const setupPreset = { ...preset, fileStructure };
  await setupProject(setupPreset, projectName.trim());
}

async function handleByos(prefillName?: string): Promise<void> {
  console.log('Building your own stack...');

  const { language } = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'language',
      message: 'Choose language:',
      choices: [
        { name: 'TypeScript', value: 'typescript' },
        { name: 'JavaScript', value: 'javascript' }
      ]
    }
  ]);

  const { styling } = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'styling',
      message: 'Choose styling:',
      choices: [
        { name: 'Tailwind CSS', value: 'tailwind' },
        { name: 'CSS Modules', value: 'css-modules' },
        { name: 'None', value: 'none' }
      ]
    }
  ]);

  const { features } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select additional features:',
      choices: [
        { name: 'ESLint', value: 'eslint' },
        { name: 'Prettier', value: 'prettier' },
        { name: 'Framer Motion', value: 'framer-motion' },
        { name: 'Lucide Icons', value: 'lucide-react' },
        { name: 'Radix UI', value: 'radix-ui' }
      ]
    }
  ]);

  const { customName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'customName',
      message: 'Name your custom preset:',
      default: prefillName || 'my-custom-stack',
      validate: (input: string) => input.trim() !== '' || 'Name is required'
    }
  ]);

  const fileStructure = await askFileStructure();

  const customPreset: Preset = {
    id: customName.trim().toLowerCase().replace(/\s+/g, '-'),
    name: customName.trim(),
    description: `Custom stack: ${language}, ${styling}, features: ${features.join(', ')}, structure: ${fileStructure}`,
    template: 'react-vite',
    language,
    styling,
    features,
    dependencies: buildDependencies(features, styling),
    devDependencies: buildDevDependencies(features, language),
    scripts: {
      dev: 'vite',
      build: language === 'typescript' ? 'tsc && vite build' : 'vite build',
      preview: 'vite preview',
      ...(features.includes('eslint') && { lint: 'eslint src --ext ts,tsx,js,jsx' }),
      ...(features.includes('prettier') && { format: 'prettier --write src' })
    },
    fileStructure
  };

  saveCustomPreset(customPreset);
  console.log(`Custom preset "${customName}" saved for future use.`);

  // For BYOS, use already-chosen structure + do name prompt/setup directly (avoid duplicate structure ask)
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Enter project name:',
      default: customPreset.id + '-app',
      validate: (input: string) => input.trim() !== '' || 'Project name is required'
    }
  ]);
  await setupProject(customPreset, projectName.trim());
}

async function askFileStructure(): Promise<'standard' | 'feature-based' | 'atomic' | 'flat'> {
  // Shows options with examples; inquirer handles arrow nav (current=cyan highlight) + Enter; selected turns green
  console.log(chalk.cyan('\nFile structure options (use arrows + Enter):'));
  const { structure } = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'structure',
      message: 'Choose project file structure:',
      choices: [
        {
          name: chalk.bold('1) Standard') + '\n   src/\n   ├── components/\n   ├── pages/\n   └── App.tsx (etc)',
          value: 'standard'
        },
        {
          name: chalk.bold('2) Feature-based') + '\n   src/\n   ├── features/\n   │   └── ui/\n   └── App.tsx',
          value: 'feature-based'
        },
        {
          name: chalk.bold('3) Atomic Design') + '\n   src/\n   ├── components/\n   │   ├── atoms/\n   │   └── molecules/\n   └── App.tsx',
          value: 'atomic'
        },
        {
          name: chalk.bold('4) Flat') + '\n   src/\n   ├── App.tsx\n   ├── main.tsx\n   └── (all files flat)',
          value: 'flat'
        }
      ]
    }
  ]);
  console.log(chalk.green(`✓ Selected: ${structure}`));
  return structure;
}

function buildDependencies(features: string[], styling: string): Record<string, string> {
  const deps: Record<string, string> = {
    'react': '^18.3.1',
    'react-dom': '^18.3.1'
  };
  if (styling === 'tailwind') {
    deps['tailwindcss'] = '^3.4.0';
  }
  if (features.includes('framer-motion')) deps['framer-motion'] = '^11.0.0';
  if (features.includes('lucide-react')) deps['lucide-react'] = '^0.400.0';
  if (features.includes('radix-ui')) {
    deps['@radix-ui/react-slot'] = '^1.0.0';
    deps['class-variance-authority'] = '^0.7.0';
  }
  return deps;
}

function buildDevDependencies(features: string[], language: string): Record<string, string> {
  const devDeps: Record<string, string> = {
    '@vitejs/plugin-react': '^4.3.0',
    'vite': '^5.0.0'
  };
  if (language === 'typescript') {
    devDeps['typescript'] = '^5.0.0';
    devDeps['@types/react'] = '^18.3.0';
    devDeps['@types/react-dom'] = '^18.3.0';
  }
  if (features.includes('eslint')) {
    devDeps['eslint'] = '^8.0.0';
    devDeps['@typescript-eslint/eslint-plugin'] = '^7.0.0';
    devDeps['@typescript-eslint/parser'] = '^7.0.0';
    devDeps['eslint-plugin-react'] = '^7.0.0';
    devDeps['eslint-plugin-react-hooks'] = '^4.0.0';
  }
  if (features.includes('prettier')) {
    devDeps['prettier'] = '^3.0.0';
    devDeps['eslint-config-prettier'] = '^9.0.0';
  }
  return devDeps;
}

program.parse();
