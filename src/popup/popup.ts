import type {
  UserProfile, DetectedField, FieldMapping, FieldType, FillResult,
} from '../shared/types';
import { storageService } from '../shared/storage';

// ─── DOM Refs ─────────────────────────────────────────────────────────────

const form          = document.getElementById('profile-form')     as HTMLFormElement;
const saveBtn       = document.getElementById('save-btn')         as HTMLButtonElement;
const fillBtn       = document.getElementById('fill-btn')         as HTMLButtonElement;
const banner        = document.getElementById('status-banner')    as HTMLDivElement;
const fieldCount    = document.getElementById('field-count')      as HTMLSpanElement;
const profileSelect = document.getElementById('profile-select')   as HTMLSelectElement;
const newProfileBtn = document.getElementById('new-profile-btn')  as HTMLButtonElement;
const delProfileBtn = document.getElementById('delete-profile-btn') as HTMLButtonElement;
const openOptions   = document.getElementById('open-options')     as HTMLAnchorElement;

// ─── State ────────────────────────────────────────────────────────────────

let profiles: UserProfile[] = [];
let currentProfile: UserProfile | null = null;

// ─── Init ─────────────────────────────────────────────────────────────────

function applyTheme(theme: string): void {
  const resolved = theme === 'SYSTEM' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'DARK' : 'LIGHT') : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

async function init(): Promise<void> {
  const settings = await storageService.getSettings();
  applyTheme(settings.theme);

  profiles = await storageService.getProfiles();

  if (profiles.length === 0) {
    const newP = storageService.createEmptyProfile('My Profile');
    await storageService.saveProfile(newP);
    profiles = [newP];
    const settings = await storageService.getSettings();
    await storageService.saveSettings({ ...settings, activeProfileId: newP.id });
  }

  renderProfileSelect(settings.activeProfileId);

  currentProfile = profiles.find(p => p.id === settings.activeProfileId) ?? profiles[0];
  populateForm(currentProfile);
  updateFieldCount();
}

// ─── Profile Selector ─────────────────────────────────────────────────────

function renderProfileSelect(activeId: string | null): void {
  profileSelect.innerHTML = '';
  for (const p of profiles) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    if (p.id === activeId) opt.selected = true;
    profileSelect.appendChild(opt);
  }
}

profileSelect.addEventListener('change', async () => {
  const id = profileSelect.value;
  currentProfile = profiles.find(p => p.id === id) ?? null;
  if (currentProfile) {
    populateForm(currentProfile);
    const settings = await storageService.getSettings();
    await storageService.saveSettings({ ...settings, activeProfileId: id });
  }
});

// ─── New Profile ──────────────────────────────────────────────────────────

newProfileBtn.addEventListener('click', async () => {
  const label = `Profile ${profiles.length + 1}`;
  const newP = storageService.createEmptyProfile(label);
  await storageService.saveProfile(newP);
  profiles.push(newP);

  const settings = await storageService.getSettings();
  await storageService.saveSettings({ ...settings, activeProfileId: newP.id });

  renderProfileSelect(newP.id);
  currentProfile = newP;
  populateForm(newP);
  showBanner(`Created "${label}".`, 'success');
});

// ─── Delete Profile ───────────────────────────────────────────────────────

delProfileBtn.addEventListener('click', async () => {
  if (!currentProfile) return;
  if (profiles.length <= 1) {
    showBanner('Cannot delete the last profile.', 'error');
    return;
  }

  const label = currentProfile.label;
  await storageService.deleteProfile(currentProfile.id);
  profiles = profiles.filter(p => p.id !== currentProfile!.id);

  currentProfile = profiles[0];
  const settings = await storageService.getSettings();
  await storageService.saveSettings({ ...settings, activeProfileId: currentProfile.id });

  renderProfileSelect(currentProfile.id);
  populateForm(currentProfile);
  showBanner(`Deleted "${label}".`, 'info');
});

// ─── Options Page ─────────────────────────────────────────────────────────

openOptions.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// ─── Populate / Build ─────────────────────────────────────────────────────

function populateForm(profile: UserProfile): void {
  const inputs = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[name], select[name]');
  inputs.forEach(input => {
    input.value = profile.data[input.name as FieldType] ?? '';
  });
}

function buildProfileFromForm(): UserProfile {
  const data: Partial<Record<FieldType, string>> = {};
  const inputs = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[name], select[name]');
  inputs.forEach(input => {
    const val = input.value.trim();
    if (val) data[input.name as FieldType] = val;
  });
  return {
    ...(currentProfile ?? storageService.createEmptyProfile()),
    data,
    updatedAt: Date.now(),
  };
}

// ─── Save Profile ─────────────────────────────────────────────────────────

saveBtn.addEventListener('click', async () => {
  setLoading(saveBtn, true);
  try {
    const profile = buildProfileFromForm();
    await storageService.saveProfile(profile);
    currentProfile = profile;

    // Update local array
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx >= 0) profiles[idx] = profile; else profiles.push(profile);

    const settings = await storageService.getSettings();
    if (!settings.activeProfileId) {
      await storageService.saveSettings({ ...settings, activeProfileId: profile.id });
    }

    showBanner('Profile saved.', 'success');
  } catch (e) {
    showBanner(`Save failed: ${(e as Error).message}`, 'error');
  } finally {
    setLoading(saveBtn, false);
  }
});

// ─── Fill Form ────────────────────────────────────────────────────────────

fillBtn.addEventListener('click', async () => {
  setLoading(fillBtn, true);
  hideBanner();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { showBanner('Navigate to a web page first.', 'error'); return; }
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showBanner('Cannot fill on this page.', 'error'); return;
    }

    let detected: DetectedField[] = [];
    try {
      detected = await chrome.tabs.sendMessage(tab.id, { type: 'DETECT_FORM' });
    } catch {
      showBanner('Could not reach page. Reload the tab and try again.', 'error'); return;
    }

    const fillable = detected.filter(d => d.matchedType !== 'UNKNOWN' && d.confidenceScore >= 40);
    if (fillable.length === 0) {
      showBanner('No recognised form fields on this page.', 'info');
      updateFieldCount(0); return;
    }

    const profile = buildProfileFromForm();
    const mappings = buildMappings(fillable, profile);
    if (mappings.length === 0) {
      showBanner('Profile has no matching data for detected fields.', 'info'); return;
    }

    await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_PREVIEW', mappings });
    window.close();
  } catch (e) {
    showBanner(`Error: ${(e as Error).message}`, 'error');
  } finally {
    setLoading(fillBtn, false);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildMappings(detected: DetectedField[], profile: UserProfile): FieldMapping[] {
  // Smart Fallback for Names
  const data = { ...profile.data };
  
  // Smart Fallback for Names
  if (!data.FULL_NAME && (data.FIRST_NAME || data.LAST_NAME)) {
    data.FULL_NAME = [data.FIRST_NAME, data.MIDDLE_NAME, data.LAST_NAME].filter(Boolean).join(' ');
  }
  if (!data.FIRST_NAME && data.FULL_NAME) {
    data.FIRST_NAME = data.FULL_NAME.split(' ')[0];
  }
  if (!data.LAST_NAME && data.FULL_NAME) {
    const parts = data.FULL_NAME.split(' ');
    data.LAST_NAME = parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  // Synthesize Initials dynamically
  if (!data.INITIALS) {
    const f = data.FIRST_NAME || '';
    const m = data.MIDDLE_NAME || '';
    const l = data.LAST_NAME || '';
    data.INITIALS = [f[0], m[0], l[0]]
      .filter(Boolean)
      .map(c => c.toUpperCase())
      .join('');
  }

  if (data.DOB) {
    const parts = data.DOB.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (!data.DOB_YEAR) data.DOB_YEAR = year;
      if (!data.DOB_MONTH) data.DOB_MONTH = month;
      if (!data.DOB_DAY) data.DOB_DAY = day;
    }
  }

  // Smart Fallback for Phone Number
  if (data.PHONE && data.COUNTRY_CODE) {
    const hasCountryCode = detected.some(d => d.matchedType === 'COUNTRY_CODE');
    if (!hasCountryCode) {
      data.PHONE = `${data.COUNTRY_CODE} ${data.PHONE}`;
    }
  }

  // Unified Address logic
  const hasLine1 = detected.some(d => d.matchedType === 'ADDRESS_LINE1');
  const hasLine2 = detected.some(d => d.matchedType === 'ADDRESS_LINE2');
  const hasCity = detected.some(d => d.matchedType === 'CITY');
  const hasState = detected.some(d => d.matchedType === 'STATE');

  if (!data.FULL_ADDRESS) {
    // If the page has components but is missing Line 1, the "Address" field is likely Line 1.
    if (!hasLine1 && (hasLine2 || hasCity || hasState)) {
      data.FULL_ADDRESS = data.ADDRESS_LINE1;
    } else {
      // Otherwise, assume it's a true full address field.
      data.FULL_ADDRESS = [
        data.ADDRESS_LINE1,
        data.ADDRESS_LINE2,
        data.CITY,
        data.STATE,
        data.ZIP_CODE,
        data.COUNTRY
      ].filter(Boolean).join(', ');
    }
  }

  // Virtual Checkbox synthesis: Since we only have one address profile, all 'same as' are true.
  if (!data.SAME_AS_PERMANENT) data.SAME_AS_PERMANENT = 'true';
  if (!data.SAME_AS_BILLING) data.SAME_AS_BILLING = 'true';
  if (!data.SAME_AS_SHIPPING) data.SAME_AS_SHIPPING = 'true';

  return detected
    .filter(d => { const v = data[d.matchedType]; return v !== undefined && v !== ''; })
    .map(d => ({
      fieldId: d.field.id,
      elementSelector: d.field.elementSelector,
      matchedType: d.matchedType,
      profileValue: data[d.matchedType] as string,
    }));
}

async function updateFieldCount(count?: number): Promise<void> {
  if (count !== undefined) { fieldCount.textContent = `${count} field(s) detected`; return; }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    fieldCount.textContent = (!tab?.id || !tab.url || tab.url.startsWith('chrome://'))
      ? 'Open a page with a form' : 'Ready to detect fields';
  } catch { fieldCount.textContent = ''; }
}

type BannerType = 'success' | 'error' | 'info';
function showBanner(message: string, type: BannerType): void {
  banner.textContent = message;
  banner.className = `banner banner--${type}`;
  setTimeout(hideBanner, 4000);
}
function hideBanner(): void { banner.className = 'banner banner--hidden'; banner.textContent = ''; }

function setLoading(btn: HTMLButtonElement, loading: boolean): void {
  btn.disabled = loading;
  if (loading) btn.setAttribute('aria-busy', 'true');
  else btn.removeAttribute('aria-busy');
}

// ─── Boot ─────────────────────────────────────────────────────────────────

init().catch(err => console.error('[SFA Popup] Init error:', err));
