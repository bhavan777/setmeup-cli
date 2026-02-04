export interface BasePreset {
  id: string;
  name: string;
  description: string;
  template: 'react-vite';
  language: 'typescript' | 'javascript';
  styling: 'tailwind' | 'css-modules' | 'none';
  features: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  fileStructure: 'standard' | 'feature-based' | 'atomic' | 'flat';
}

export type Preset = BasePreset;

export interface PresetCollection {
  presets: Preset[];
  getPresetById: (id: string) => Preset | undefined;
}
