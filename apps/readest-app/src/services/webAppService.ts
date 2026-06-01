// Web app service stubbed — web platform removed.
// Only Tauri (native) app service is active.
export class WebAppService {
  isWebApp = true;
  async openDatabase() {
    throw new Error('Web platform unavailable');
  }
  async loadBookConfig() {
    return null;
  }
  async saveBookConfig() {}
  async exists() {
    return false;
  }
  async openFile() {
    throw new Error('Web platform unavailable');
  }
  async writeFile() {}
  async createDir() {}
  async deleteFile() {}
  async resolveFilePath() {
    return '';
  }
  async loadBookCover() {
    return null;
  }
  async clearWebviewCache() {}
  async showNotification() {}
  get isDesktopApp() {
    return false;
  }
}
