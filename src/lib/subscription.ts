export function isPremiumStatus(status?: string | null): boolean {
  return status === 'active' || status === 'trial';
}
