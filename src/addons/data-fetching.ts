import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { Addon } from '../types/addon';
// Use shared helpers/constants from lib to eliminate duplication + ensure consistency
import { promptConfirm, addDependencyIfMissing, detectExt, DEP_VERSIONS } from '../lib/addons';

const dataFetchingAddon: Addon = {
  id: 'data-fetching',
  name: 'Data Fetching',
  description: 'Add TanStack React Query for data fetching/caching',
  // Card details for selection UI
  changes: 'Updates package.json + creates src/queries + wires QueryClient in main + demo in App',
  filesImpact: 'package.json | src/queries/useExampleQuery.{ts,jsx} (demo) | main.{ts,jsx} (QueryClientProvider) | App.{ts,jsx} (useQuery demo)',
  apply: async (projectDir: string) => {
    console.log(chalk.cyan('\nSetting up Data Fetching addon...'));

    // Shared confirm + dep + detect (centralized for consistency/no dup)
    const confirmed = await promptConfirm('Add TanStack React Query for data fetching?');
    if (!confirmed) {
      console.log(chalk.yellow('Data fetching addon skipped.'));
      return;
    }

    const { isTypeScript, ext } = detectExt(projectDir);
    const appPath = path.join(projectDir, 'src', `App.${ext}`);
    const mainPath = path.join(projectDir, 'src', `main.${ext}`);
    const queriesDir = path.join(projectDir, 'src', 'queries');
    const exampleQueryPath = path.join(queriesDir, `useExampleQuery.${ext}`);

    // pkg dep (shared helper)
    const addedDep = addDependencyIfMissing(projectDir, '@tanstack/react-query');

    // Queries example file: create only if missing
    let queryCreated = false;
    if (!fs.existsSync(exampleQueryPath)) {
      if (!fs.existsSync(queriesDir)) {
        fs.mkdirSync(queriesDir, { recursive: true });
      }
      const queryContent = isTypeScript
        ? `// Minimal TanStack React Query example (TS)
import { useQuery } from '@tanstack/react-query'

// Demo query (placeholder; replace URL with real API)
export function useExampleQuery() {
  return useQuery({
    queryKey: ['example'],
    queryFn: async () => {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos/1')
      return res.json()
    },
  })
}`
        : `// Minimal TanStack React Query example (JS)
import { useQuery } from '@tanstack/react-query'

// Demo query (placeholder; replace URL with real API)
export function useExampleQuery() {
  return useQuery({
    queryKey: ['example'],
    queryFn: async () => {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos/1')
      return res.json()
    },
  })
}`;
      fs.writeFileSync(exampleQueryPath, queryContent);
      queryCreated = true;
    }

    // Main: add QueryClient + Provider wrap (idempotent check)
    let mainContent = fs.readFileSync(mainPath, 'utf8');
    const alreadyHasQueryProvider = mainContent.includes('QueryClientProvider');
    if (!alreadyHasQueryProvider) {
      // Import if missing
      if (!mainContent.includes('@tanstack/react-query')) {
        mainContent = mainContent.replace(
          /import ReactDOM from 'react-dom\/client'/,
          `import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'`
        );
      }
      // Create client + wrap (surgical, around App; TODO: AST for complex)
      // If no <App />, fallback comment
      if (mainContent.includes('<App />')) {
        mainContent = mainContent.replace(
          /<App \/>/,
          `<QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>`
        );
      } else {
        // Unexpected: add comment only
        mainContent += '\n// TODO: Manually wrap <App /> with QueryClientProvider from @tanstack/react-query (unexpected structure)'
      }
      fs.writeFileSync(mainPath, mainContent);
    }

    // App: add demo useExampleQuery if not present (surgical)
    let appContent = fs.readFileSync(appPath, 'utf8');
    const alreadyUsesQuery = appContent.includes('useExampleQuery') || appContent.includes('@tanstack/react-query');
    if (!alreadyUsesQuery) {
      // Import
      appContent = appContent.replace(
        /import { useState } from 'react'/,
        `import { useState } from 'react'
import { useExampleQuery } from './queries/useExampleQuery'`
      );
      // Insert demo after existing content (use RegExp for safety)
      // Looser match on unique p tag (ignore indent)
      appContent = appContent.replace(
        /<p className="read-the-docs">[\s\S]*?Click on the Vite and React logos to learn more[\s\S]*?<\/p>/,
        `<p className="read-the-docs">
          Click on the Vite and React logos to learn more
        </p>
        {/* TanStack React Query demo (minimal useQuery) */}
        <div>
          <h3>Data Fetch Demo</h3>
          <pre>{JSON.stringify(useExampleQuery().data, null, 2) || 'Loading...'}</pre>
        </div>`
      );
      fs.writeFileSync(appPath, appContent);
    }

    // idempotent success
    console.log(chalk.green('✓ Data fetching addon applied (idempotent).'));
    if (!addedDep) console.log('  - TanStack dep already present');
    else console.log('  - Added: @tanstack/react-query to package.json');
    console.log(`  - Queries: ${queryCreated ? 'example created' : 'already present'}`);
    console.log(`  - main.${ext}: ${alreadyHasQueryProvider ? 'already wired, skipped' : 'QueryClient added'}`);
    console.log(`  - App.${ext}: ${alreadyUsesQuery ? 'already uses query, skipped' : 'demo added'}`);
    console.log(`  - Project dir: ${projectDir}`);
    console.log(chalk.green('Next (if changed): npm install && npm run dev'));
  }
};

export { dataFetchingAddon };
