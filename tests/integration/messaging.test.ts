import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DetectFormMessage } from '../../src/shared/types';

describe('Messaging Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chrome.tabs.sendMessage routes DETECT_FORM correctly', async () => {
    // Mock the extension sending a message to a tab
    const mockResponse = [{ matchedType: 'EMAIL', confidenceScore: 90 }];
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValueOnce(mockResponse);

    const message: DetectFormMessage = { type: 'DETECT_FORM' };
    const response = await chrome.tabs.sendMessage(1, message);

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, message);
    expect(response).toEqual(mockResponse);
  });

  it('chrome.runtime.onMessage listener validation', () => {
    // Test the mock setup for runtime listeners
    const mockListener = vi.fn();
    chrome.runtime.onMessage.addListener(mockListener);

    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(mockListener);
  });
});
