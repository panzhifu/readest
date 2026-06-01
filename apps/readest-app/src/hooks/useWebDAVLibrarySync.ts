import { useEffect, useRef, useCallback } from 'react';
import { useEnv } from '@/context/EnvContext';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { SystemSettings } from '@/types/settings';
import { useWebDAVSyncStore } from '@/store/webdavSyncStore';
import { syncLibrary } from '@/services/webdav/WebDAVSync';
import { eventDispatcher } from '@/utils/event';
import { isTauriAppPlatform } from '@/services/environment';
import { tauriDownload, tauriUpload } from '@/utils/transfer';
import { getLocalBookFilename, getCoverFilename } from '@/utils/book';
import { buildBasicAuthHeader, buildRequestUrl } from '@/services/webdav/WebDAVClient';
import { useTranslation } from './useTranslation';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const useWebDAVLibrarySync = () => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const { settings } = useSettingsStore();
  const { library, libraryLoaded, setLibrary } = useLibraryStore();
  const {
    setStatus,
    setProgress,
    setCurrentBook,
    setLastSyncTime,
    addSyncError,
    clearSyncErrors,
    setConflictsDetected,
    reset,
  } = useWebDAVSyncStore();
  const { setSettings, saveSettings } = useSettingsStore.getState();
  const isSyncingRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  const syncWithWebDAV = useCallback(async () => {
    const webdav = settings.webdav;
    if (!webdav?.enabled || !webdav.serverUrl || !webdav.username) return;
    if (isSyncingRef.current) return;

    const now = Date.now();
    if (now - lastSyncRef.current < SYNC_INTERVAL_MS) return;

    isSyncingRef.current = true;
    lastSyncRef.current = now;
    reset();
    setStatus('syncing');
    clearSyncErrors();

    try {
      const appService = await envConfig.getAppService();
      if (!appService) return;

      const currentLibrary = library.length > 0 ? library : await appService.loadLibraryBooks();
      const eligibleBooks = currentLibrary.filter((b) => !b.deletedAt);

      let deviceId = webdav.deviceId;
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        const newSettings = {
          ...settings,
          webdav: { ...webdav, deviceId },
        };
        useSettingsStore.getState().setSettings(newSettings);
        await appService.saveSettings(newSettings);
      }

      const result = await syncLibrary(webdav, eligibleBooks, {
        strategy: webdav.strategy === 'prompt' ? 'silent' : webdav.strategy,
        syncBooks: webdav.syncBooks ?? false,
        deviceId,
        loadConfig: (book) => appService.loadBookConfig(book, settings),
        loadBookFile: async (book) => {
          const fp = book.filePath ?? getLocalBookFilename(book);
          const base = book.filePath ? 'None' : 'Books';
          if (!(await appService.exists(fp, base))) return null;
          const file = await appService.openFile(fp, base);
          const bytes = await file.arrayBuffer();
          return { bytes, size: bytes.byteLength };
        },
        loadBookFileStreaming: isTauriAppPlatform()
          ? async (book) => {
              const fp = book.filePath ?? getLocalBookFilename(book);
              const base = book.filePath ? 'None' : 'Books';
              if (!(await appService.exists(fp, base))) return null;
              const file = await appService.openFile(fp, base);
              const size = file.size;
              const closable = file as { close?: () => Promise<void> };
              if (closable.close) await closable.close();
              const dst = await appService.resolveFilePath(fp, base);
              return {
                size,
                upload: async (remoteUrl, headers) => {
                  try {
                    await tauriUpload(
                      remoteUrl,
                      dst,
                      'PUT',
                      undefined,
                      headers as unknown as Map<string, string>,
                    );
                    return true;
                  } catch (e) {
                    console.warn('WD library sync: tauriUpload failed', book.hash, e);
                    return false;
                  }
                },
              };
            }
          : undefined,
        loadBookCover: async (book) => {
          const fp = getCoverFilename(book);
          if (!(await appService.exists(fp, 'Books'))) return null;
          const file = await appService.openFile(fp, 'Books');
          const bytes = await file.arrayBuffer();
          return { bytes, size: bytes.byteLength };
        },
        saveBookFile: async (book, bytes) => {
          const fp = getLocalBookFilename(book);
          await appService.writeFile(fp, 'Books', bytes);
        },
        downloadBookFile: isTauriAppPlatform()
          ? async (book, remotePath) => {
              const url = buildRequestUrl(webdav.serverUrl, remotePath);
              const headers = {
                Authorization: buildBasicAuthHeader(webdav.username, webdav.password),
              };
              try {
                if (!(await appService.exists(book.hash, 'Books'))) {
                  await appService.createDir(book.hash, 'Books');
                }
                const dst = await appService.resolveFilePath(getLocalBookFilename(book), 'Books');
                await tauriDownload(url, dst, undefined, headers);
                return true;
              } catch {
                return false;
              }
            }
          : undefined,
        saveBookCover: async (book, bytes) => {
          const fp = getCoverFilename(book);
          await appService.writeFile(fp, 'Books', bytes);
        },
        saveBookConfig: async (book, config) => {
          await appService.saveBookConfig(book, config, settings);
        },
        addBookToLibrary: async (book) => {
          book.coverImageUrl = await appService.generateCoverImageUrl(book);
        },
        onProgress: ({ book, index, total }) => {
          setCurrentBook(book.title);
          setProgress(Math.round(((index + 1) / total) * 100));
        },
        loadSettings: async () => {
          return {
            data: { ...settings },
            timestamps: {},
          };
        },
        saveSettings: async (data, _timestamps) => {
          const newSettings = { ...data } as unknown as SystemSettings;
          setSettings(newSettings);
          await saveSettings(envConfig, newSettings);
        },
      });

      setConflictsDetected(result.conflictsDetected);

      if (result.booksDownloaded > 0) {
        const updatedLibrary = await appService.loadLibraryBooks();
        setLibrary(updatedLibrary);
        eventDispatcher.dispatch('toast', {
          type: 'info',
          message: _('Downloaded {{count}} books from WebDAV', { count: result.booksDownloaded }),
        });
      }

      if (result.conflictsDetected > 0) {
        eventDispatcher.dispatch('toast', {
          type: 'info',
          message: _('{{count}} sync conflicts detected and resolved', {
            count: result.conflictsDetected,
          }),
        });
      }

      if (result.failures > 0) {
        result.failedBooks.forEach((failure) => {
          addSyncError(`${failure.title}: ${failure.reason}`);
        });
        eventDispatcher.dispatch('toast', {
          type: 'error',
          message: _('WebDAV sync completed with {{count}} failures', { count: result.failures }),
        });
        setStatus('error');
      } else {
        setStatus('success');
      }

      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('WebDAV library sync failed:', error);
      addSyncError(String(error));
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: _('WebDAV sync failed'),
      });
      setStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, [settings, library, libraryLoaded, envConfig, setLibrary, _]);

  useEffect(() => {
    if (!libraryLoaded) return;
    if (!settings.webdav?.enabled) return;

    syncWithWebDAV();

    const intervalId = setInterval(syncWithWebDAV, SYNC_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [libraryLoaded, settings.webdav?.enabled, syncWithWebDAV]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithWebDAV();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncWithWebDAV]);
};
