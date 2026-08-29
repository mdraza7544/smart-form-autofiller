import type { UserProfile, ExtensionSettings, SiteRule } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';

// ─── StorageService ────────────────────────────────────────────────────────

export class StorageService {

  // ── Profiles ──────────────────────────────────────────────────────────

  async getProfiles(): Promise<UserProfile[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILES);
      const raw = result[STORAGE_KEYS.PROFILES];
      if (!Array.isArray(raw)) return [];
      return raw as UserProfile[];
    } catch (e) {
      console.error('[StorageService] getProfiles failed:', e);
      return [];
    }
  }

  async getActiveProfile(): Promise<UserProfile | null> {
    const [profiles, settings] = await Promise.all([
      this.getProfiles(),
      this.getSettings(),
    ]);
    if (!settings.activeProfileId) return profiles[0] ?? null;
    return profiles.find(p => p.id === settings.activeProfileId) ?? null;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    try {
      const profiles = await this.getProfiles();
      const idx = profiles.findIndex(p => p.id === profile.id);
      profile.updatedAt = Date.now();
      if (idx >= 0) {
        profiles[idx] = profile;
      } else {
        profiles.push(profile);
      }
      await chrome.storage.local.set({ [STORAGE_KEYS.PROFILES]: profiles });
    } catch (e) {
      console.error('[StorageService] saveProfile failed:', e);
      throw new Error('Failed to save profile. Storage may be full.');
    }
  }

  async deleteProfile(id: string): Promise<void> {
    try {
      const profiles = await this.getProfiles();
      const updated = profiles.filter(p => p.id !== id);
      await chrome.storage.local.set({ [STORAGE_KEYS.PROFILES]: updated });

      // Clear activeProfileId if it was this profile
      const settings = await this.getSettings();
      if (settings.activeProfileId === id) {
        await this.saveSettings({ ...settings, activeProfileId: updated[0]?.id ?? null });
      }
    } catch (e) {
      console.error('[StorageService] deleteProfile failed:', e);
    }
  }

  createEmptyProfile(label = 'My Profile'): UserProfile {
    return {
      id: crypto.randomUUID(),
      label,
      data: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  // ── Settings ──────────────────────────────────────────────────────────

  async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const raw = result[STORAGE_KEYS.SETTINGS];
      if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...(raw as Partial<ExtensionSettings>) };
    } catch (e) {
      console.error('[StorageService] getSettings failed:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(settings: ExtensionSettings): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    } catch (e) {
      console.error('[StorageService] saveSettings failed:', e);
      throw new Error('Failed to save settings.');
    }
  }

  // ── Site Rules ────────────────────────────────────────────────────────

  async getSiteRules(): Promise<SiteRule[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_RULES);
      const raw = result[STORAGE_KEYS.SITE_RULES];
      if (!Array.isArray(raw)) return [];
      return raw as SiteRule[];
    } catch (e) {
      console.error('[StorageService] getSiteRules failed:', e);
      return [];
    }
  }

  async saveSiteRules(rules: SiteRule[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.SITE_RULES]: rules });
    } catch (e) {
      console.error('[StorageService] saveSiteRules failed:', e);
      throw new Error('Failed to save site rules.');
    }
  }

  // ── Nuclear Option ─────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    await chrome.storage.local.clear();
  }
}

export const storageService = new StorageService();
