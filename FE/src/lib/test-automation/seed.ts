export function buildAutomationSeedName(namespace: string, seedMode: string): string {
  return `${namespace}-${seedMode}`;
}
