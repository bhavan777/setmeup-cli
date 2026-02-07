import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { Addon } from '../types/addon';
// Use shared helpers/constants from lib to eliminate duplication + ensure consistency
import { promptConfirm, addDependencyIfMissing, detectExt, DEP_VERSIONS } from '../lib/addons';

const routingAddon: Addon = {
  id: 'routing',
  name: 'Routing',
  description: 'Add React Router for navigation',
  // Card details for selection UI
  changes: 'Updates package.json + main/App files (surgical router wrap + dummy page)',
  filesImpact: 'package.json | main.{ts,jsx} (BrowserRouter wrap) | App.{ts,jsx} (Routes + nav) | src/pages/About.{ts,jsx} (dummy)',
  apply: async (projectDir: string) => {
    console.log(chalk.cyan('\nSetting up Routing addon...'));

    // Shared confirm + dep + detect (centralized for consistency/no dup)
    const confirmed = await promptConfirm('Add React Router DOM for client-side routing?');
    if (!confirmed) {
      console.log(chalk.yellow('Routing addon skipped.'));
      return;
    }

    const { ext } = detectExt(projectDir);
    const appPath = path.join(projectDir, 'src', `App.${ext}`);
    const mainPath = path.join(projectDir, 'src', `main.${ext}`);
    const pagesDir = path.join(projectDir, 'src', 'pages');
    const aboutPath = path.join(pagesDir, `About.${ext}`);

    // pkg dep (shared helper)
    const addedDep = addDependencyIfMissing(projectDir, 'react-router-dom');

    // 2. main: skip all if BrowserRouter already wraps App; else conditional import+wrap
    let mainContent = fs.readFileSync(mainPath, 'utf8');
    const alreadyWrappedMain = /<BrowserRouter>[\s\S]*?<App \/>[\s\S]*?<\/BrowserRouter>/.test(mainContent);
    if (!alreadyWrappedMain) {
      // import only if missing
      if (!mainContent.includes('BrowserRouter')) {
        mainContent = mainContent.replace(
          /import ReactDOM from 'react-dom\/client'/,
          `import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'`
        );
      }
      // wrap only if needed
      if (!mainContent.includes('<BrowserRouter>')) {
        mainContent = mainContent.replace(
          /<App \/>/,
          `<BrowserRouter>
      <App />
    </BrowserRouter>`
        );
      }
      fs.writeFileSync(mainPath, mainContent);
    }

    // 3. About dummy: create only if missing
    let aboutCreated = false;
    if (!fs.existsSync(aboutPath)) {
      if (!fs.existsSync(pagesDir)) {
        fs.mkdirSync(pagesDir, { recursive: true });
      }
      const aboutContent = `// Dummy page for routing (minimal; supports ${ext})
// Usage example: navigate to /about
function About() {
  return (
    <div>
      <h2>About Page</h2>
      <p>This dummy page was added by routing addon.</p>
      <a href="/">Go Home</a>
    </div>
  );
}
export default About;`;
      fs.writeFileSync(aboutPath, aboutContent);
      aboutCreated = true;
    }

    // 4. App: skip all if already routed (<Routes> present + router import); else surgical wrap
    let appContent = fs.readFileSync(appPath, 'utf8');
    const alreadyRouted = appContent.includes('<Routes>') && appContent.includes("from 'react-router-dom'");
    if (!alreadyRouted) {
      // imports only if missing
      if (!appContent.includes("from 'react-router-dom'")) {
        appContent = appContent.replace(
          /import '\.\/App\.css'/,
          `import './App.css'
import { Routes, Route, Link } from 'react-router-dom'
import About from './pages/About'`
        );
      }
      // wrap start (if needed)
      // TODO: shift to AST (e.g. @babel or ts-morph) or lib like jscodeshift for safe JSX edits in future
      if (!appContent.includes('<Routes>')) {
        appContent = appContent.replace(
          /  return \(\s*<>/,
          `  return (
    // Routing: minimal wrap of original JSX as / route (preserved exactly)
    // + nav + /about to dummy; supports tsx/jsx
    <>
      <nav style={{ padding: '1rem', background: '#f0f0f0', marginBottom: '1rem' }}>
        <Link to="/">Home</Link> |{' '}
        <Link to="/about">About (dummy)</Link>
      </nav>
      <Routes>
        <Route path="/" element={
          <>
`
        );
      }
      // wrap close (if needed; single-line regex)
      if (!appContent.includes('<Route path="/about"')) {
        appContent = appContent.replace(
          /    <\/>\s*\)\s*\n\s*\}\s*\n\n\s*export default App/,
          `    </>
          } />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  )
}

export default App`
        );
      }
      fs.writeFileSync(appPath, appContent);
    }

    // idempotent success (no dups)
    console.log(chalk.green('✓ Routing addon applied (idempotent; no duplicates).'));
    if (!addedDep) console.log('  - Dep already present');
    else console.log(`  - Added: react-router-dom to package.json`);
    console.log(`  - main.${ext}: ${alreadyWrappedMain ? 'already wrapped, skipped' : 'updated (if needed)'}`);
    console.log(`  - App.${ext}: ${alreadyRouted ? 'already routed, skipped' : 'updated (if needed)'}`);
    console.log(`  - About.${ext}: ${aboutCreated ? 'created' : 'already present'}`);
    console.log(`  - Project dir: ${projectDir}`);
    console.log(chalk.green('Next (if changed): npm install && npm run dev'));
  }
};

export { routingAddon };
