import type { Addon } from '../types/addon';
import { routingAddon } from './routing';
import { stateManagementAddon } from './state-management';
import { dataFetchingAddon } from './data-fetching';

const addons: Addon[] = [
  routingAddon,
  stateManagementAddon,
  dataFetchingAddon,
];

export const addonRegistry: Record<string, Addon> = addons.reduce((acc, addon) => {
  acc[addon.id] = addon;
  return acc;
}, {} as Record<string, Addon>);

export const getAllAddons = (): Addon[] => addons;

export const getAddonById = (id: string): Addon | undefined => {
  return addonRegistry[id];
};
