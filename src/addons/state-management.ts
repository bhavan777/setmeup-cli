import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { Addon } from '../types/addon';
// Use shared helpers/constants from lib to eliminate duplication + ensure consistency
import { promptConfirm, addDependencyIfMissing, detectExt, DEP_VERSIONS } from '../lib/addons';

const stateManagementAddon: Addon = {
  id: 'state-management',
  name: 'State Management',
  description: 'Add Zustand for lightweight state management',
  // Card details for selection UI
  changes: 'Updates package.json + creates src/store/useStore + demo in App (idempotent)',
  filesImpact: 'package.json | src/store/useStore.{ts,jsx} (demo store) | App.{ts,jsx} (useStore demo buttons)',
  apply: async (projectDir: string) => {
    console.log(chalk.cyan('\nSetting up State Management addon...'));

    // Shared confirm + dep + detect (centralized for consistency/no dup)
    const confirmed = await promptConfirm('Add Zustand for state management?');
    if (!confirmed) {
      console.log(chalk.yellow('State management addon skipped.'));
      return;
    }

    const { isTypeScript, ext } = detectExt(projectDir);
    const appPath = path.join(projectDir, 'src', `App.${ext}`);
    const storeDir = path.join(projectDir, 'src', 'store');
    const storePath = path.join(storeDir, `useStore.${ext}`);

    // pkg dep (shared helper)
    const addedDep = addDependencyIfMissing(projectDir, 'zustand');

    // Store: create dir+file only if missing (idempotent)
    let storeCreated = false;
    if (!fs.existsSync(storePath)) {
      if (!fs.existsSync(storeDir)) {
        fs.mkdirSync(storeDir, { recursive: true });
      }
      // Conditional content for TS/JS support
      const storeContent = isTypeScript
        ? `// Minimal Zustand demo store (TS; supports ${ext})
// Basic counter example; extend as needed
import { create } from 'zustand'

interface StoreState {
  count: number
  increment: () => void
  reset: () => void
}

export const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 })
}))`
        : `// Minimal Zustand demo store (JS; supports ${ext})
// Basic counter example; extend as needed
import { create } from 'zustand'

export const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 })
}))`;
      fs.writeFileSync(storePath, storeContent);
      storeCreated = true;
    }

    // App: surgical demo usage only if not already using zustand store
    let appContent = fs.readFileSync(appPath, 'utf8');
    const alreadyUsesZustand = appContent.includes("from 'zustand'") || appContent.includes('useStore');
    if (!alreadyUsesZustand) {
      // Add import after existing (surgical)
      appContent = appContent.replace(
        /import { useState } from 'react'/,
        `import { useState } from 'react'
import { useStore } from './store/useStore'`
      );
      // Insert demo usage (e.g., after count button; preserves original)
      // Use RegExp ctor + string match for multiline safety
      // TODO: shift to AST (e.g. @babel or ts-morph) or lib like jscodeshift for safe JSX edits in future
      appContent = appContent.replace(
        new RegExp(
          `        <\\/button>\\s*<p>\\s*Edit <code>src\\/App\\.(tsx|jsx)<\\/code> and save to test HMR\\s*<\\/p>`,
          ''
        ),
        `        </button>
        {/* Zustand demo: separate store usage (minimal) */}
        <button onClick={useStore((state) => state.increment)}>
          Zustand count: {useStore((state) => state.count)}
        </button>
        <button onClick={useStore((state) => state.reset)}>
          Reset Zustand
        </button>
        <p>
          Edit <code>src/App.${ext}</code> and save to test HMR
        </p>`
      );
      fs.writeFileSync(appPath, appContent);
    }

    // idempotent log
    console.log(chalk.green('✓ State management addon applied (idempotent).'));
    if (!addedDep) console.log('  - Zustand dep already present');
    else console.log('  - Added: zustand to package.json');
    console.log(`  - Store: ${storeCreated ? 'created in src/store' : 'already present'}`);
    console.log(`  - App.${ext}: ${alreadyUsesZustand ? 'already uses store, skipped' : 'added demo usage'}`);
    console.log(`  - Project dir: ${projectDir}`);
    console.log(chalk.green('Next (if changed): npm install && npm run dev'));
  }
};

export { stateManagementAddon };
