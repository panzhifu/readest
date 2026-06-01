// Command palette registry — stubbed after Supabase removal.
// Only local-only commands are supported.

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  action: () => void;
}

export interface CommandSearchResult {
  item: CommandItem;
  score: number;
}

export type CommandCategory = string;

export function buildCommandRegistry(items: CommandItem[], _recentIds?: string[]): CommandItem[] {
  return items;
}

export function searchCommands(_query: string, _registry: CommandItem[]): CommandSearchResult[] {
  return [];
}

export function groupResultsByCategory(
  results: CommandSearchResult[],
): Map<string, CommandSearchResult[]> {
  return new Map();
}

export function trackCommandUsage(_id: string) {}

export function getRecentCommands(_ids: string[], _registry: CommandItem[]): CommandItem[] {
  return [];
}
