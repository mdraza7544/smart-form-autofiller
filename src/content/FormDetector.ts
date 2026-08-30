import type { FormField } from '../shared/types';
import { SENSITIVE_INPUT_TYPES, SENSITIVE_KEYWORDS } from '../shared/constants';
import { buildSelector, findLabelText, getSurroundingText, normalizeText } from '../utils/domHelpers';
import { GoogleFormsAdapter } from './GoogleFormsAdapter';

// ─── FormDetector ──────────────────────────────────────────────────────────
// Phase 2: Enhanced detection with radio group awareness, richer context
// extraction, and improved visibility checks.

export class FormDetector {
  private readonly MAX_ELEMENTS = 500;

  // Tracks which radio group names have already been emitted so we
  // don't generate duplicate field entries for radio siblings.
  private seenRadioGroups = new Set<string>();

  /**
   * Scans the DOM and returns all detectable, non-sensitive, visible fields.
   */
  scan(): FormField[] {
    if (GoogleFormsAdapter.isGoogleForm()) {
      try {
        const gFields = GoogleFormsAdapter.scan();
        if (gFields.length > 0) return gFields;
      } catch (e) {
        console.error('[SFA] GoogleFormsAdapter error:', e);
      }
    }

    this.seenRadioGroups.clear();

    const elements = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="file"]), textarea, select'
      )
    ).slice(0, this.MAX_ELEMENTS);

    const fields: FormField[] = [];

    for (const el of elements) {
      if (this.isSensitiveElement(el)) continue;
      if (!this.isVisible(el)) continue;

      // Phase 2: De-duplicate radio groups — only emit the FIRST radio per group
      if (el instanceof HTMLInputElement && el.type === 'radio') {
        const groupName = el.name || el.id;
        if (groupName && this.seenRadioGroups.has(groupName)) continue;
        if (groupName) this.seenRadioGroups.add(groupName);
      }

      fields.push(this.extractField(el));
    }

    return fields;
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  private extractField(
    el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ): FormField {
    const tagType = el.tagName as 'INPUT' | 'TEXTAREA' | 'SELECT';
    const inputTypeAttr = el instanceof HTMLInputElement ? (el.type ?? 'text') : '';

    // Phase 2: For radio groups, collect all option values as surrounding context
    let surroundingText = getSurroundingText(el as HTMLElement);
    if (el instanceof HTMLInputElement && el.type === 'radio' && el.name) {
      const options = this.getRadioGroupOptions(el.name);
      if (options.length) {
        surroundingText = [surroundingText, ...options].filter(Boolean).join(' | ');
      }
    }

    // Phase 2: For select, gather option texts for context
    if (el instanceof HTMLSelectElement) {
      const optionTexts = Array.from(el.options)
        .map(o => o.text.trim())
        .filter(Boolean)
        .slice(0, 10)      // cap to avoid bloating
        .join(' ');
      if (optionTexts) surroundingText = [surroundingText, optionTexts].filter(Boolean).join(' ');
    }

    const labelText = findLabelText(el as HTMLElement);

    return {
      id: `sfa_${Math.random().toString(36).slice(2, 10)}`,
      elementSelector: buildSelector(el),
      nameAttr:        el.getAttribute('name') ?? '',
      idAttr:          el.id ?? '',
      placeholderAttr: (el as HTMLInputElement).placeholder ?? '',
      autocompleteAttr:el.getAttribute('autocomplete') ?? '',
      ariaLabelAttr:   el.getAttribute('aria-label') ?? '',
      tagType,
      inputTypeAttr,
      labelText,
      surroundingText,
    };
  }

  // ── Radio Group Helper ────────────────────────────────────────────────

  /**
   * Collects sibling radio values + labels for context.
   * e.g. name="gender" → ["Male", "Female", "Other"]
   */
  private getRadioGroupOptions(name: string): string[] {
    return Array.from(
      document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`)
    ).map(radio => {
      const label = findLabelText(radio) || radio.value;
      return label.trim();
    }).filter(Boolean);
  }

  // ── Sensitive Element Check ───────────────────────────────────────────

  private isSensitiveElement(el: Element): boolean {
    if (el instanceof HTMLInputElement) {
      const type = el.type?.toLowerCase();
      if (SENSITIVE_INPUT_TYPES.includes(type)) return true;

      const combined = normalizeText(
        [el.name, el.id, el.placeholder, el.getAttribute('aria-label')].join(' ')
      );
      if (SENSITIVE_KEYWORDS.some(kw => combined.includes(kw))) return true;
    }
    return false;
  }

  // ── Visibility Check ─────────────────────────────────────────────────

  private isVisible(el: Element): boolean {
    const htmlEl = el as HTMLElement;

    // Fastest check: offsetParent is null when hidden via display:none/visibility:hidden
    // Exception: fixed-position elements also have null offsetParent
    if (htmlEl.offsetParent === null) {
      // Allow fixed-position elements
      const style = window.getComputedStyle(htmlEl);
      if (style.position !== 'fixed') return false;
    }

    const style = window.getComputedStyle(htmlEl);
    if (style.display === 'none')       return false;
    if (style.visibility === 'hidden')  return false;
    if (style.opacity === '0')          return false;

    // Check dimensions — zero-size elements are effectively invisible
    const rect = htmlEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    return true;
  }
}
