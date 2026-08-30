# Privacy Policy for Smart Form Auto-Filler

## 1. Data Collection & Storage
All personal profile data, settings, and form field mappings are stored **strictly locally** on your device using Chrome's `chrome.storage.local` API. We do not operate any backend servers, and we do not upload, sync, or transmit your personal data anywhere.

## 2. Open AI Integration (Optional)
If you choose to enable the AI Field Detection fallback, the extension will send structural HTML metadata (such as element tags, ID attributes, and Name attributes) to OpenAI to determine the correct field type. 
**We NEVER send your personal data, passwords, or the contents of the fields you are filling out.**

## 3. Permissions Justification
- `storage`: Required to save your profiles locally.
- `activeTab`: Required to interact with the current webpage to detect and fill forms when you explicitly click the extension.
- `scripting`: Required to inject the form filler script into the active webpage.

## 4. Encryption
When exporting your data, it is encrypted using industry-standard AES-256-GCM encryption. The password you set for the export is never saved or transmitted.

## 5. Security & Isolation
Smart Form Auto-Filler has undergone rigorous penetration testing to ensure maximum privacy:
- **No Silent Data Extraction:** Your profile data is never passed to the active webpage or content script on page load. The webpage has no access to your data. Data is only sent to the form when you explicitly click "Fill Form" in the extension popup.
- **XSS & DOM Protection:** The extension uses native DOM value setters instead of dangerous HTML injection APIs (`innerHTML`), entirely neutralizing DOM-based Cross-Site Scripting (XSS) and Prototype Pollution attacks.
- **Message Spoofing Defense:** The content script strictly verifies that all incoming commands originate from the extension itself, preventing malicious websites from spoofing autofill requests.
