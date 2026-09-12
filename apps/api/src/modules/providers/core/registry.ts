import type { ProviderAdapter, ProviderKey } from "./types.js";
const map = new Map<ProviderKey, ProviderAdapter>();
export function registerProvider(a: ProviderAdapter){ map.set(a.key, a); }
export function getProvider(key: string): ProviderAdapter | undefined { return map.get(key as any); }
export function listProviders(): ProviderAdapter[]{ return [...map.values()]; }
