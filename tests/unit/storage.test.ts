import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '../../src/shared/storage';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../../src/shared/constants';

describe('StorageService', () => {
  const storage = new StorageService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSettings returns defaults if storage is empty', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({});
    
    const settings = await storage.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(chrome.storage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.SETTINGS);
  });

  it('saveProfile creates a new profile and saves it', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({ [STORAGE_KEYS.PROFILES]: [] });
    
    const newProfile = {
      id: '123',
      label: 'Test',
      data: { FIRST_NAME: 'Alice' },
      createdAt: 1000,
      updatedAt: 1000,
    };

    await storage.saveProfile(newProfile);
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.PROFILES]: [newProfile]
    });
  });

  it('deleteProfile removes a profile by id', async () => {
    const existing = [
      { id: '1', label: 'One', data: {}, createdAt: 1, updatedAt: 1 },
      { id: '2', label: 'Two', data: {}, createdAt: 2, updatedAt: 2 }
    ];
    
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({ [STORAGE_KEYS.PROFILES]: existing });
    
    await storage.deleteProfile('1');
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.PROFILES]: [existing[1]]
    });
  });

  it('clearAll completely clears local storage', async () => {
    await storage.clearAll();
    expect(chrome.storage.local.clear).toHaveBeenCalled();
  });
});
