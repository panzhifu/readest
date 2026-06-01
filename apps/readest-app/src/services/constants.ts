// ── Book identifiers ─────────────────────────────────────────────────
export const BOOK_UNGROUPED_NAME = '__ungrouped__';
export const BOOK_UNGROUPED_ID = '__ungrouped__';
export const BOOK_IDS_SEPARATOR = '/';

// ── Reader UI constants ──────────────────────────────────────────────
export const ZOOM_STEP = 10;
export const MIN_ZOOM_LEVEL = 50;
export const MAX_ZOOM_LEVEL = 200;
export const SIZE_PER_LOC = 1024;
export const SIZE_PER_TIME_UNIT = 350;
export const LONG_HOLD_THRESHOLD = 500;
export const SHOW_UNREAD_STATUS_BADGE = true;

// ── Reading ruler ────────────────────────────────────────────────────
export const READING_RULER_COLORS = ['#FF0000', '#00FF00', '#0000FF'];

// ── Paragraph mode ───────────────────────────────────────────────────
export const DEFAULT_PARAGRAPH_MODE_CONFIG = {
  speed: 200,
  fontSize: 18,
};

// ── File formats ─────────────────────────────────────────────────────
export const SUPPORTED_BOOK_EXTS = ['.epub', '.mobi', '.azw3', '.fb2', '.cbz', '.txt', '.pdf'];
export const BOOK_ACCEPT_FORMATS = '.epub,.mobi,.azw3,.fb2,.cbz,.txt,.pdf';

// ── Note export ───────────────────────────────────────────────────────
export const DEFAULT_NOTE_EXPORT_CONFIG = { format: 'markdown' } as const;

// ── Transfer ──────────────────────────────────────────────────────────
export const SYNC_BOOKS_INTERVAL_SEC = 60;
export const DATA_SUBDIR = 'data';

// ── URLs ──────────────────────────────────────────────────────────────
export const DOWNLOAD_READEST_URL = 'https://readest.com/download';
export const READEST_WEB_BASE_URL = 'https://web.readest.com';

// ── Updater ───────────────────────────────────────────────────────────
export const CHECK_UPDATE_INTERVAL_SEC = 3600;
export const READEST_CHANGELOG_FILE = 'CHANGELOG.md';
export const READEST_UPDATER_FILE = 'RELEASES';

// ── Share ─────────────────────────────────────────────────────────────
export const SHARE_DEFAULT_EXPIRATION_DAYS = 30;
export const SHARE_EXPIRATION_DAYS = [7, 30, 90, 365];

// ── Fonts ─────────────────────────────────────────────────────────────
export const SERIF_FONTS: string[] = [];
export const SANS_SERIF_FONTS: string[] = [];
export const MONOSPACE_FONTS: string[] = [];
export const CJK_SERIF_FONTS: string[] = [];
export const CJK_SANS_SERIF_FONTS: string[] = [];
export const CJK_EXCLUDE_PATTENS: RegExp[] = [];
export const CJK_FONTS_PATTENS: RegExp[] = [];
export const WINDOWS_FONTS: string[] = [];
export const MACOS_FONTS: string[] = [];
export const LINUX_FONTS: string[] = [];
export const IOS_FONTS: string[] = [];
export const NON_FREE_FONTS: string[] = [];
