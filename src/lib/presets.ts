import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Preset } from '../types/preset';
import { presetCollection } from '../presets';

const CUSTOM_PRESETS_DIR = path.join(os.homedir(), '.setmeup');
const CUSTOM_PRESETS_FILE = path.join(CUSTOM_PRESETS_DIR, 'custom-presets.json');

export function loadCustomPresets(): Preset[] {
  try {
    if (fs.existsSync(CUSTOM_PRESETS_FILE)) {
      const data = fs.readFileSync(CUSTOM_PRESETS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading custom presets:', error);
  }
  return [];
}

export function saveCustomPreset(preset: Preset): void {
  try {
    if (!fs.existsSync(CUSTOM_PRESETS_DIR)) {
      fs.mkdirSync(CUSTOM_PRESETS_DIR, { recursive: true });
    }
    const customs = loadCustomPresets();
    // Replace if exists (supports reset/update), else add
    const index = customs.findIndex(p => p.id === preset.id);
    if (index !== -1) {
      customs[index] = preset;
    } else {
      customs.push(preset);
    }
    fs.writeFileSync(CUSTOM_PRESETS_FILE, JSON.stringify(customs, null, 2));
  } catch (error) {
    console.error('Error saving custom preset:', error);
  }
}

export function getAllPresets(): Preset[] {
  const customs = loadCustomPresets();
  return [...presetCollection.presets, ...customs];
}

export function clearAllCustomPresets(): void {
  try {
    if (fs.existsSync(CUSTOM_PRESETS_FILE)) {
      fs.unlinkSync(CUSTOM_PRESETS_FILE);
      console.log('All custom presets cleared.');
    } else {
      console.log('No custom presets to clear.');
    }
  } catch (error) {
    console.error('Error clearing custom presets:', error);
  }
}

export function deleteCustomPreset(presetId: string): void {
  try {
    const customs = loadCustomPresets();
    const filtered = customs.filter(p => p.id !== presetId);
    if (filtered.length !== customs.length) {
      fs.writeFileSync(CUSTOM_PRESETS_FILE, JSON.stringify(filtered, null, 2));
      console.log(`Preset "${presetId}" deleted.`);
    } else {
      console.log(`Preset "${presetId}" not found.`);
    }
  } catch (error) {
    console.error('Error deleting preset:', error);
  }
}
