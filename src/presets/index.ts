import type { Preset, PresetCollection } from '../types/preset';
import { basicPreset } from './basic';
import { professionalPreset } from './professional';
import { minimalPreset } from './minimal';
import { uiFocusedPreset } from './ui-focused';

const presets: Preset[] = [
  basicPreset,
  professionalPreset,
  minimalPreset,
  uiFocusedPreset,
];

export const presetCollection: PresetCollection = {
  presets,
  getPresetById: (id: string) => presets.find(p => p.id === id),
};
