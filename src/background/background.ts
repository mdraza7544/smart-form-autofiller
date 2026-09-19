import type { ExtensionSettings, UserProfile } from '../shared/types';
import { storageService } from '../shared/storage';
import { DEFAULT_SETTINGS } from '../shared/constants';

// ─── Background Service Worker ─────────────────────────────────────────────

// Initialize defaults on first install
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await storageService.getSettings();
  if (!settings.activeProfileId) {
    await storageService.saveSettings({ ...DEFAULT_SETTINGS });
  }
  console.debug('[SFA Background] Installed / Updated.');
});

// ── Message Router ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (!message?.type) return false;

  (async () => {
    switch (message.type) {
      case 'GET_SETTINGS': {
        const settings: ExtensionSettings = await storageService.getSettings();
        sendResponse(settings);
        break;
      }

      case 'GET_ACTIVE_PROFILE': {
        const profile: UserProfile | null = await storageService.getActiveProfile();
        sendResponse(profile);
        break;
      }

      case 'SAVE_PROFILE': {
        try {
          await storageService.saveProfile(message.profile);
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: (e as Error).message });
        }
        break;
      }


      default:
        sendResponse(null);
    }
  })();

  return true; // keep message channel open for async response
});
