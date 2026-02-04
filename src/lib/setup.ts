import fs from 'fs';
import path from 'path';
import type { Preset } from '../types/preset';

const TEMPLATE_DIR = path.join(__dirname, '../../templates/react-vite');

export async function setupProject(preset: Preset, projectName: string): Promise<void> {
  const targetDir = path.resolve(process.cwd(), projectName);
  
  if (fs.existsSync(targetDir)) {
    console.error(`Directory ${projectName} already exists.`);
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  copyDir(TEMPLATE_DIR, targetDir);

  customizeProject(targetDir, preset);

  // Reorganize based on chosen fileStructure
  restructureFiles(targetDir, preset.fileStructure);

  console.log(`\nProject ${projectName} created successfully with ${preset.name}!`);
  console.log(`Next steps:`);
  console.log(`  cd ${projectName}`);
  console.log(`  npm install`);
  console.log(`  npm run dev`);
}

function copyDir(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function customizeProject(targetDir: string, preset: Preset): void {
  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  pkg.name = path.basename(targetDir).toLowerCase().replace(/\s+/g, '-');
  pkg.dependencies = { ...pkg.dependencies, ...preset.dependencies };
  pkg.devDependencies = { ...pkg.devDependencies, ...preset.devDependencies };
  pkg.scripts = { ...pkg.scripts, ...preset.scripts };
  
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  if (preset.language === 'javascript') {
    convertToJS(targetDir);
  }

  if (preset.styling === 'tailwind') {
    addTailwind(targetDir);
  }

  if (preset.features.includes('eslint') || preset.features.includes('prettier')) {
    addLinting(targetDir, preset.features);
  }
}

function convertToJS(targetDir: string): void {
  const srcDir = path.join(targetDir, 'src');
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    if (file.endsWith('.tsx')) {
      const oldPath = path.join(srcDir, file);
      const newPath = path.join(srcDir, file.replace('.tsx', '.jsx'));
      fs.renameSync(oldPath, newPath);
    }
  }
  fs.unlinkSync(path.join(targetDir, 'tsconfig.json'));
  fs.unlinkSync(path.join(targetDir, 'tsconfig.node.json'));
  const viteConfig = path.join(targetDir, 'vite.config.ts');
  if (fs.existsSync(viteConfig)) {
    fs.renameSync(viteConfig, path.join(targetDir, 'vite.config.js'));
  }
  const mainFile = path.join(srcDir, 'main.jsx');
  if (fs.existsSync(mainFile)) {
    let content = fs.readFileSync(mainFile, 'utf8');
    content = content.replace(/\.tsx/g, '.jsx');
    fs.writeFileSync(mainFile, content);
  }

  const htmlPath = path.join(targetDir, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace('main.tsx', 'main.jsx');
  fs.writeFileSync(htmlPath, html);
}

function addTailwind(targetDir: string): void {
  const postcssPath = path.join(targetDir, 'postcss.config.js');
  fs.writeFileSync(postcssPath, `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`);

  const tailwindConfigPath = path.join(targetDir, 'tailwind.config.js');
  fs.writeFileSync(tailwindConfigPath, `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`);

  const cssPath = path.join(targetDir, 'src', 'index.css');
  let css = fs.readFileSync(cssPath, 'utf8');
  css = `@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

` + css;
  fs.writeFileSync(cssPath, css);
}

function addLinting(targetDir: string, features: string[]): void {
  const eslintPath = path.join(targetDir, '.eslintrc.cjs');
  fs.writeFileSync(eslintPath, `module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    features.includes('prettier') ? 'prettier' : '',
  ].filter(Boolean),
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
};`);

  if (features.includes('prettier')) {
    const prettierPath = path.join(targetDir, '.prettierrc');
    fs.writeFileSync(prettierPath, `{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}`);
  }
}

function restructureFiles(targetDir: string, structure: 'standard' | 'feature-based' | 'atomic' | 'flat'): void {
  const srcDir = path.join(targetDir, 'src');
  if (!fs.existsSync(srcDir)) return;

  switch (structure) {
    case 'flat':
      // Keep all flat in src/ (default template already close; no subdirs)
      // Remove empty dirs if any
      break;
    case 'feature-based':
      const featuresDir = path.join(srcDir, 'features', 'ui');
      fs.mkdirSync(featuresDir, { recursive: true });
      // Move App etc to features/ui
      if (fs.existsSync(path.join(srcDir, 'App.tsx')) || fs.existsSync(path.join(srcDir, 'App.jsx'))) {
        const appFile = fs.existsSync(path.join(srcDir, 'App.tsx')) ? 'App.tsx' : 'App.jsx';
        fs.renameSync(path.join(srcDir, appFile), path.join(featuresDir, appFile));
      }
      // Update imports in main
      const mainPath = path.join(srcDir, fs.existsSync(path.join(srcDir, 'main.tsx')) ? 'main.tsx' : 'main.jsx');
      if (fs.existsSync(mainPath)) {
        let content = fs.readFileSync(mainPath, 'utf8');
        content = content.replace(/from ['"].\/App/, "from './features/ui/App");
        fs.writeFileSync(mainPath, content);
      }
      break;
    case 'atomic':
      const atomsDir = path.join(srcDir, 'components', 'atoms');
      const moleculesDir = path.join(srcDir, 'components', 'molecules');
      fs.mkdirSync(atomsDir, { recursive: true });
      fs.mkdirSync(moleculesDir, { recursive: true });
      // Move App to components
      if (fs.existsSync(path.join(srcDir, 'App.tsx')) || fs.existsSync(path.join(srcDir, 'App.jsx'))) {
        const appFile = fs.existsSync(path.join(srcDir, 'App.tsx')) ? 'App.tsx' : 'App.jsx';
        fs.renameSync(path.join(srcDir, appFile), path.join(srcDir, 'components', appFile));
      }
      // Update imports
      const mainAtomicPath = path.join(srcDir, fs.existsSync(path.join(srcDir, 'main.tsx')) ? 'main.tsx' : 'main.jsx');
      if (fs.existsSync(mainAtomicPath)) {
        let content = fs.readFileSync(mainAtomicPath, 'utf8');
        content = content.replace(/from ['"].\/App/, "from './components/App");
        fs.writeFileSync(mainAtomicPath, content);
      }
      break;
    case 'standard':
    default:
      // Default template structure (src/components etc already basic)
      const componentsDir = path.join(srcDir, 'components');
      fs.mkdirSync(componentsDir, { recursive: true });
      break;
  }
}
