# Smart Form Auto-Filler

A secure, privacy-first Chrome Extension that intelligently detects web form fields and auto-fills them using your locally saved profiles. 

Unlike standard browser autofill, Smart Form Auto-Filler uses an advanced heuristic scoring engine to understand complex forms, supports multiple profiles, handles modern React/Vue single-page applications, and offers an optional AI fallback for stubborn websites—all while ensuring your data never leaves your device without permission.

---

## 🌟 Features

* **🧠 Smart Heuristic Engine:** Intelligently identifies form fields by analyzing `name`, `id`, `autocomplete`, `<label>` tags, `placeholder` text, and surrounding context.
* **🔒 Privacy-First Architecture:** Your profiles are encrypted and stored entirely locally using `chrome.storage.local`.
* **🛡️ Security Hardened:** Strictly blocks sensitive fields (Passwords, SSNs, Credit Cards) from ever being auto-filled or scanned. Uses strict Content Security Policies and avoids dangerous DOM manipulation (`innerHTML`, `eval`).
* **👥 Multi-Profile Support:** Seamlessly switch between work, personal, or test profiles with one click.
* **🤖 AI Fallback (Optional):** Toggle on an OpenAI-powered classifier for incredibly complex forms. Only structural HTML tags are sent (never your input or PII).
* **📦 Encrypted Import/Export:** Backup or share your profiles with AES-256-GCM encryption secured by a password.
* **⚡ Modern Framework Support:** Seamlessly fills React, Vue, and Angular forms by dispatching native DOM events to trigger state updates. Dynamically rescans when new forms are injected into the DOM (e.g., in multi-step wizards).
* **🎨 Shadow DOM Preview:** Review and selectively toggle exactly what will be filled via a floating UI before committing changes to the page.

---

## 🚀 Installation (For Users)

Once published to the Chrome Web Store, you can install it directly via a link. 

**To install manually from this repository:**
1. Download the latest `smart-form-autofiller.zip` or clone this repository.
2. If downloaded as a `.zip`, extract it to a folder.
3. Open Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode** in the top right corner.
5. Click **Load unpacked** and select the `dist/` directory inside the project folder.

---

## 🛠️ Development Setup

This extension is built using **TypeScript**, **Vite**, and **Manifest V3**.

### Prerequisites
* Node.js v18+ 
* npm or pnpm

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd smart-form-autofiller
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Development Server (Watch Mode):**
   ```bash
   npm run dev
   ```
   This will watch for TypeScript changes and automatically compile them to the `dist/` folder. Reload the extension in `chrome://extensions` to see changes.

4. **Run Tests:**
   The project maintains a high coverage standard using Vitest and Playwright.
   ```bash
   npm run test
   ```

5. **Build for Production:**
   ```bash
   npm run build
   ```
   This generates a minified, production-ready extension in the `dist/` folder.

---

## 📁 Project Structure

```
├── public/                 # Static assets (manifest, icons, HTML)
├── src/
│   ├── background/         # Service worker & AI API handling
│   ├── content/            # DOM scanning, detection, and filling logic
│   ├── options/            # Options page UI (Profiles, Site Rules, Export)
│   ├── popup/              # Extension popup UI
│   ├── shared/             # Shared types, storage wrappers, and security
│   └── utils/              # DOM traversal helpers
├── tests/                  # Unit, Integration, and E2E tests
└── vite.config.ts          # Build configuration
```

---

## 🔐 Privacy & Security

Smart Form Auto-Filler is built defensively:
1. **Local Storage:** All user data resides in `chrome.storage.local`.
2. **AI Privacy:** The AI fallback (if enabled and provided an API key) only transmits HTML structure (e.g., `<input type="text" id="email">`). It **never** transmits placeholders, page text, cookies, or user profile data.
3. **Sensitive Data:** Fields containing keywords like `password`, `cvv`, or `ssn` are strictly blocked by the `FormDetector` and completely ignored by the engine.
4. **Encryption:** Exports use `crypto.subtle` (PBKDF2 + AES-GCM) to ensure files cannot be read without your password.

---

## 📄 License

MIT License. See `LICENSE` for details.
