import type { WebDAVSettings } from '@/types/settings';
import {
  WebDAVConfig,
  ensureDirectory,
  getFile,
  getFileBinary,
  listDirectory,
  putFile,
  putFileBinary,
  toClientConfig,
} from './WebDAVClient';
import {
  ancestorsOf,
  buildBasePath,
  buildFontsDirPath,
  buildFontFilePath,
  buildTexturesDirPath,
  buildTextureFilePath,
  buildDictionaryPath,
  buildOPDSPath,
} from './WebDAVPaths';
import type { BookFileSource, SyncLibraryOptions } from './WebDAVSync';

type ExtendedResult = {
  fontsUploaded: number;
  fontsDownloaded: number;
  texturesUploaded: number;
  texturesDownloaded: number;
  dictionaryPulled: boolean;
  dictionaryPushed: boolean;
  opdsPulled: boolean;
  opdsPushed: boolean;
};

/** Sync binary files (fonts/textures) — compare local vs remote file lists, push missing, pull new. */
async function syncBinaryDir(
  client: WebDAVConfig,
  dirPath: string,
  filePathFn: (name: string) => string,
  listLocal: () => Promise<string[]>,
  loadLocal: (name: string) => Promise<BookFileSource | null>,
  saveLocal: (name: string, bytes: ArrayBuffer) => Promise<void>,
): Promise<{ uploaded: number; downloaded: number }> {
  let uploaded = 0;
  let downloaded = 0;

  let remoteFiles: string[] = [];
  try {
    const entries = await listDirectory(client, dirPath);
    remoteFiles = entries.filter((e) => !e.isDirectory).map((e) => e.name);
  } catch {
    /* dir doesn't exist yet */
  }

  const localFiles = await listLocal();
  const remoteSet = new Set(remoteFiles);
  const localSet = new Set(localFiles);

  for (const name of localFiles) {
    if (remoteSet.has(name)) continue;
    const src = await loadLocal(name);
    if (!src) continue;
    await putFileBinary(client, filePathFn(name), src.bytes);
    uploaded++;
  }

  for (const name of remoteFiles) {
    if (localSet.has(name)) continue;
    try {
      const bytes = await getFileBinary(client, filePathFn(name));
      if (bytes) {
        await saveLocal(name, bytes);
        downloaded++;
      }
    } catch {
      /* best-effort */
    }
  }

  return { uploaded, downloaded };
}

/** Sync a JSON config file — pull if remote exists, push if only local exists. */
async function syncJsonConfig(
  client: WebDAVConfig,
  filePath: string,
  loadLocal: () => Promise<Record<string, unknown> | null>,
  saveLocal: (config: Record<string, unknown>) => Promise<void>,
): Promise<{ pulled: boolean; pushed: boolean }> {
  let pulled = false;
  let pushed = false;

  let remoteConfig: Record<string, unknown> | null = null;
  try {
    const raw = await getFile(client, filePath);
    if (raw) remoteConfig = JSON.parse(raw);
  } catch {
    /* no remote */
  }

  const localConfig = await loadLocal();

  if (remoteConfig && !localConfig) {
    await saveLocal(remoteConfig);
    pulled = true;
  } else if (localConfig && !remoteConfig) {
    await putFile(client, filePath, JSON.stringify(localConfig), 'application/json');
    pushed = true;
  }

  return { pulled, pushed };
}

/**
 * Sync fonts, textures, dictionary config, and OPDS catalogs.
 * Called from syncLibrary when the corresponding sub-toggles are enabled.
 */
export async function syncExtendedData(
  settings: WebDAVSettings,
  options: SyncLibraryOptions,
): Promise<ExtendedResult> {
  const client = toClientConfig(settings);
  const result: ExtendedResult = {
    fontsUploaded: 0,
    fontsDownloaded: 0,
    texturesUploaded: 0,
    texturesDownloaded: 0,
    dictionaryPulled: false,
    dictionaryPushed: false,
    opdsPulled: false,
    opdsPushed: false,
  };

  // Fonts
  if (
    settings.syncFonts &&
    options.listLocalFonts &&
    options.loadFontFile &&
    options.saveFontFile
  ) {
    const dir = buildFontsDirPath(settings.rootPath);
    try {
      await ensureDirectory(client, ancestorsOf(dir));
    } catch {
      /* ok */
    }
    const r = await syncBinaryDir(
      client,
      dir,
      (n) => buildFontFilePath(settings.rootPath, n),
      options.listLocalFonts,
      options.loadFontFile,
      options.saveFontFile,
    );
    result.fontsUploaded = r.uploaded;
    result.fontsDownloaded = r.downloaded;
  }

  // Textures
  if (
    settings.syncTextures &&
    options.listLocalTextures &&
    options.loadTextureFile &&
    options.saveTextureFile
  ) {
    const dir = buildTexturesDirPath(settings.rootPath);
    try {
      await ensureDirectory(client, ancestorsOf(dir));
    } catch {
      /* ok */
    }
    const r = await syncBinaryDir(
      client,
      dir,
      (n) => buildTextureFilePath(settings.rootPath, n),
      options.listLocalTextures,
      options.loadTextureFile,
      options.saveTextureFile,
    );
    result.texturesUploaded = r.uploaded;
    result.texturesDownloaded = r.downloaded;
  }

  // Dictionary
  if (settings.syncDictionary && options.loadDictionaryConfig && options.saveDictionaryConfig) {
    const r = await syncJsonConfig(
      client,
      buildDictionaryPath(settings.rootPath),
      options.loadDictionaryConfig,
      options.saveDictionaryConfig,
    );
    result.dictionaryPulled = r.pulled;
    result.dictionaryPushed = r.pushed;
  }

  // OPDS
  if (settings.syncOPDS && options.loadOPDSConfig && options.saveOPDSConfig) {
    const r = await syncJsonConfig(
      client,
      buildOPDSPath(settings.rootPath),
      options.loadOPDSConfig,
      options.saveOPDSConfig,
    );
    result.opdsPulled = r.pulled;
    result.opdsPushed = r.pushed;
  }

  return result;
}
