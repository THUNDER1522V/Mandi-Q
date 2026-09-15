import type { FarmerBooking } from '../types/dashboard';

/**
 * Regional village constants for display and lookup.
 * All hardcoded mock farmer data has been removed.
 * The FastAPI backend is the single source of truth.
 */
export const REGIONAL_VILLAGES = [
  'Taraori',
  'Nilokheri',
  'Indri',
  'Nangal',
  'Gharaunda',
  'Assandh',
  'Nissing',
  'Samana',
  'Nabha',
  'Rajpura',
  'Sanaur',
  'Bhunerheri',
  'Devigarh',
  'Ghagga',
  'Patran'
] as const;

export const CROPS = [
  'Wheat (गेहूँ)',
  'Paddy PR-126 (धान)',
  'Basmati 1121 (बासमती)',
  'Mustard (सरसों)'
] as const;

// Empty list - mock objects removed in favor of live backend
export const INITIAL_FARMERS: FarmerBooking[] = [];

export function getInitialFarmersClone(): FarmerBooking[] {
  return [];
}
