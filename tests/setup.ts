// Mock Chrome API globals for Vitest
const chromeMock = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    }
  },
  runtime: {
    id: 'mock-extension-id',
    onMessage: {
      addListener: vi.fn(),
    },
    openOptionsPage: vi.fn(),
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  }
};

(global as any).chrome = chromeMock;
