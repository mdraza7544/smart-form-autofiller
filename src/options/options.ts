import type { UserProfile, ExtensionSettings, SiteRule, FieldType } from '../shared/types';
import { storageService } from '../shared/storage';
import { securityService } from '../shared/security';

// ─── DOM Refs ─────────────────────────────────────────────────────────────

const optBanner       = document.getElementById('opt-banner')         as HTMLDivElement;
const toggleAutofill  = document.getElementById('toggle-autofill')    as HTMLInputElement;
const themeSelect     = document.getElementById('theme-select')       as HTMLSelectElement;
const toggleAi        = document.getElementById('toggle-ai')          as HTMLInputElement;
const aiApiKey        = document.getElementById('ai-api-key')         as HTMLInputElement;
const toggleKeyVis    = document.getElementById('toggle-key-visibility') as HTMLButtonElement;
const apiKeyRow       = document.getElementById('api-key-row')        as HTMLDivElement;
const profilesList    = document.getElementById('profiles-list')      as HTMLDivElement;
const ruleDomainInput = document.getElementById('rule-domain')        as HTMLInputElement;
const ruleProfileSel  = document.getElementById('rule-profile')       as HTMLSelectElement;
const addRuleBtn      = document.getElementById('add-rule-btn')       as HTMLButtonElement;
const rulesList       = document.getElementById('rules-list')         as HTMLDivElement;
const exportPassword  = document.getElementById('export-password')    as HTMLInputElement;
const exportBtn       = document.getElementById('export-btn')         as HTMLButtonElement;
const importPassword  = document.getElementById('import-password')    as HTMLInputElement;
const importFile      = document.getElementById('import-file')        as HTMLInputElement;
const importBtn       = document.getElementById('import-btn')         as HTMLButtonElement;
const clearAllBtn     = document.getElementById('clear-all-btn')      as HTMLButtonElement;
const saveSettingsBtn = document.getElementById('save-settings-btn')  as HTMLButtonElement;

// ─── State ────────────────────────────────────────────────────────────────

let settings: ExtensionSettings;
let profiles: UserProfile[] = [];
let siteRules: SiteRule[] = [];

// ─── Init ─────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  settings  = await storageService.getSettings();
  profiles  = await storageService.getProfiles();
  siteRules = await storageService.getSiteRules();

  // General
  toggleAutofill.checked = settings.autoDetectEnabled;
  themeSelect.value = settings.theme;

  // AI
  toggleAi.checked = settings.aiEnabled;
  aiApiKey.value = settings.aiApiKey ?? '';
  updateApiKeyVisibility();

  // Profiles
  renderProfiles();

  // Site Rules
  populateRuleProfileSelect();
  renderSiteRules();
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERAL SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

saveSettingsBtn.addEventListener('click', async () => {
  settings.autoDetectEnabled = toggleAutofill.checked;
  settings.theme = themeSelect.value as ExtensionSettings['theme'];
  settings.aiEnabled = toggleAi.checked;
  settings.aiApiKey = aiApiKey.value.trim() || null;

  await storageService.saveSettings(settings);
  showBanner('Settings saved.', 'success');
});

// ═══════════════════════════════════════════════════════════════════════════
// AI CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

toggleAi.addEventListener('change', () => updateApiKeyVisibility());

function updateApiKeyVisibility(): void {
  apiKeyRow.style.display = toggleAi.checked ? 'flex' : 'none';
}

toggleKeyVis.addEventListener('click', () => {
  const isPassword = aiApiKey.type === 'password';
  aiApiKey.type = isPassword ? 'text' : 'password';
  toggleKeyVis.textContent = isPassword ? '🙈' : '👁';
});

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function renderProfiles(): void {
  profilesList.innerHTML = '';

  for (const p of profiles) {
    const card = document.createElement('div');
    card.className = 'profile-card';

    const fieldCount = Object.keys(p.data).length;
    const isActive = settings.activeProfileId === p.id;

    card.innerHTML = `
      <div class="profile-card__info">
        <div class="profile-card__name">${escapeHtml(p.label)}</div>
        <div class="profile-card__meta">${fieldCount} field(s) · Updated ${formatDate(p.updatedAt)}</div>
      </div>
      ${isActive ? '<span class="profile-card__badge">Active</span>' : ''}
    `;

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'rule-row__remove';
    delBtn.textContent = '×';
    delBtn.title = 'Delete profile';
    delBtn.addEventListener('click', async () => {
      if (profiles.length <= 1) { showBanner('Cannot delete the last profile.', 'error'); return; }
      await storageService.deleteProfile(p.id);
      profiles = profiles.filter(x => x.id !== p.id);
      renderProfiles();
      showBanner(`Deleted "${p.label}".`, 'info');
    });
    card.appendChild(delBtn);

    profilesList.appendChild(card);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SITE RULES (Step 19)
// ═══════════════════════════════════════════════════════════════════════════

// Dangerous patterns that could match every domain
const OVERLY_BROAD = ['*', '*.*', '*.com', '*.org', '*.net', '*.io', '*.co'];

function populateRuleProfileSelect(): void {
  ruleProfileSel.innerHTML = '<option value="">Default Profile</option>';
  for (const p of profiles) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    ruleProfileSel.appendChild(opt);
  }
}

function renderSiteRules(): void {
  rulesList.innerHTML = '';
  for (const rule of siteRules) {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const profileName = profiles.find(p => p.id === rule.preferredProfileId)?.label ?? 'Default';

    row.innerHTML = `
      <span class="rule-row__domain">${escapeHtml(rule.domainPattern)}</span>
      <span class="rule-row__profile">${escapeHtml(profileName)}</span>
    `;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'rule-row__remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', async () => {
      siteRules = siteRules.filter(r => r.id !== rule.id);
      await storageService.saveSiteRules(siteRules);
      renderSiteRules();
    });
    row.appendChild(removeBtn);

    rulesList.appendChild(row);
  }
}

addRuleBtn.addEventListener('click', async () => {
  const domain = ruleDomainInput.value.trim().toLowerCase();
  if (!domain) { showBanner('Enter a domain.', 'error'); return; }
  if (OVERLY_BROAD.includes(domain)) { showBanner('Pattern is too broad — rejected for security.', 'error'); return; }

  const rule: SiteRule = {
    id: crypto.randomUUID(),
    domainPattern: domain,
    preferredProfileId: ruleProfileSel.value || null,
    isDisabled: false,
    disabledFieldTypes: [],
  };

  siteRules.push(rule);
  await storageService.saveSiteRules(siteRules);
  renderSiteRules();
  ruleDomainInput.value = '';
  showBanner(`Rule added for ${domain}.`, 'success');
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT / EXPORT (Step 21)
// ═══════════════════════════════════════════════════════════════════════════

const MAX_IMPORT_SIZE = 1_048_576; // 1 MB

exportBtn.addEventListener('click', async () => {
  const password = exportPassword.value;
  if (!password || password.length < 4) {
    showBanner('Password must be at least 4 characters.', 'error'); return;
  }

  try {
    const exportData = {
      version: 1,
      exportedAt: Date.now(),
      profiles: await storageService.getProfiles(),
      settings: await storageService.getSettings(),
      siteRules: await storageService.getSiteRules(),
    };

    const encrypted = await securityService.encrypt(JSON.stringify(exportData), password);

    // Download as .sfa file
    const blob = new Blob([encrypted.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-form-autofiller-${new Date().toISOString().slice(0, 10)}.sfa`;
    a.click();
    URL.revokeObjectURL(url);

    exportPassword.value = '';
    showBanner('Data exported successfully.', 'success');
  } catch (e) {
    showBanner(`Export failed: ${(e as Error).message}`, 'error');
  }
});

importBtn.addEventListener('click', async () => {
  const password = importPassword.value;
  if (!password) { showBanner('Enter the decryption password.', 'error'); return; }

  const file = importFile.files?.[0];
  if (!file) { showBanner('Select a .sfa file.', 'error'); return; }
  if (file.size > MAX_IMPORT_SIZE) { showBanner('File exceeds 1 MB limit.', 'error'); return; }

  try {
    const buffer = new Uint8Array(await file.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const decrypted = await securityService.decrypt(buffer, password);
    const data = JSON.parse(decrypted);

    // Validate schema
    if (!data || typeof data !== 'object' || data.version !== 1) {
      showBanner('Invalid or incompatible export file.', 'error'); return;
    }
    if (!Array.isArray(data.profiles)) {
      showBanner('Corrupted file: missing profiles.', 'error'); return;
    }

    // Import profiles (merge — add new, overwrite existing)
    for (const profile of data.profiles) {
      if (isValidProfile(profile)) {
        await storageService.saveProfile(profile);
      }
    }

    // Import settings
    if (data.settings && typeof data.settings === 'object') {
      await storageService.saveSettings(data.settings);
    }

    // Import site rules
    if (Array.isArray(data.siteRules)) {
      await storageService.saveSiteRules(data.siteRules);
    }

    // Reload state
    await init();
    importPassword.value = '';
    showBanner(`Imported ${data.profiles.length} profile(s) successfully.`, 'success');
  } catch (e) {
    showBanner('Decryption failed. Wrong password or corrupted file.', 'error');
  }
});

function isValidProfile(p: unknown): p is UserProfile {
  if (!p || typeof p !== 'object') return false;
  const obj = p as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.label === 'string' && typeof obj.data === 'object';
}

// ═══════════════════════════════════════════════════════════════════════════
// DANGER ZONE
// ═══════════════════════════════════════════════════════════════════════════

clearAllBtn.addEventListener('click', async () => {
  if (!confirm('This will permanently delete ALL profiles, settings, and site rules. Are you sure?')) return;
  await storageService.clearAll();
  showBanner('All data cleared.', 'info');
  setTimeout(() => location.reload(), 1000);
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

type BannerType = 'success' | 'error' | 'info';
function showBanner(msg: string, type: BannerType): void {
  optBanner.textContent = msg;
  optBanner.className = `opt-banner opt-banner--${type}`;
  setTimeout(() => { optBanner.className = 'opt-banner opt-banner--hidden'; }, 4000);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Boot ─────────────────────────────────────────────────────────────────

init().catch(err => console.error('[SFA Options] Init error:', err));
