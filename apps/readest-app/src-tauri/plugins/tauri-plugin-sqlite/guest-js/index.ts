import { invoke } from '@tauri-apps/api/core';

export type Cipher = 'aes256cbc';

export interface EncryptionConfig {
  cipher: Cipher;
  key: number[] | Uint8Array;
}

export interface LoadOptions {
  path: string;
  encryption?: EncryptionConfig;
  syncUrl?: string;
  authToken?: string;
  experimental?: string[];
}

export interface QueryResult {
  rowsAffected: number;
  lastInsertId: number;
}

export class Database {
  path: string;

  constructor(path: string) {
    this.path = path;
  }

  static async load(pathOrOptions: string | LoadOptions): Promise<Database> {
    const options = typeof pathOrOptions === 'string' ? { path: pathOrOptions } : pathOrOptions;
    const _path = await invoke<string>('plugin:sqlite|load', { options });
    return new Database(_path);
  }

  async execute(query: string, bindValues?: unknown[]): Promise<QueryResult> {
    return await invoke<QueryResult>('plugin:sqlite|execute', {
      db: this.path,
      query,
      values: bindValues ?? [],
    });
  }

  async select<T>(query: string, bindValues?: unknown[]): Promise<T> {
    return await invoke<T>('plugin:sqlite|select', {
      db: this.path,
      query,
      values: bindValues ?? [],
    });
  }

  async batch(queries: string[]): Promise<void> {
    await invoke('plugin:sqlite|batch', { db: this.path, queries });
  }

  async sync(): Promise<void> {
    // No-op: rusqlite doesn't have remote sync
  }

  async close(db?: string): Promise<boolean> {
    return await invoke<boolean>('plugin:sqlite|close', { db });
  }
}

export interface ConfigInfo {
  encrypted: boolean;
}

export async function getConfig(): Promise<ConfigInfo> {
  return invoke<ConfigInfo>('plugin:sqlite|get_config');
}
