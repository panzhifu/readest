// Sync categories are no longer needed — Supabase replica sync has been removed.
// WebDAV sync uses its own independent toggle system (syncProgress, syncNotes, etc.).
// This file kept as a stub for any legacy imports that may still reference it.
export const isSyncCategoryEnabled = (_id: string): boolean => false;
