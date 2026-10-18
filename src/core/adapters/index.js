import { LegacyPageAdapter } from './LegacyPageAdapter.js';
import { VuiPageAdapter } from './VuiPageAdapter.js';

export const PAGE_ADAPTERS = [VuiPageAdapter, LegacyPageAdapter];

export function getPageAdapter() {
  return PAGE_ADAPTERS.find(adapter => document.querySelector(adapter.sidebar)) || null;
}
