import type { FieldMapping, FillResult } from '../shared/types';
import { FieldMapper } from './FieldMapper';
import { GoogleFormsAdapter } from './GoogleFormsAdapter';

// ─── FormFiller ────────────────────────────────────────────────────────────

export class FormFiller {
  /**
   * Fills DOM elements based on provided mappings.
   * Each element is found via its CSS selector. Failures are recorded
   * without interrupting the remaining fills.
   */
  fill(mappings: FieldMapping[]): FillResult {
    const errors: FillResult['errors'] = [];
    let successCount = 0;
    const isGoogleForm = GoogleFormsAdapter.isGoogleForm();

    for (const mapping of mappings) {
      try {
    const element = document.querySelector(mapping.elementSelector) as HTMLElement;
        if (!element) throw new Error(`Element not found: ${mapping.elementSelector}`);

        if (FieldMapper.containsSensitiveKeyword(mapping.elementSelector + mapping.matchedType)) {
          throw new Error('Blocked: sensitive field detected');
        }

        if (isGoogleForm) {
          GoogleFormsAdapter.fill(element, mapping.profileValue, this.optionMatches.bind(this));
        } else if (element instanceof HTMLInputElement) {
          this.fillInput(element, mapping.profileValue, mapping.matchedType);
        } else if (element instanceof HTMLTextAreaElement) {
          this.fillTextArea(element, mapping.profileValue);
        } else if (element instanceof HTMLSelectElement) {
          this.fillSelect(element, mapping.profileValue);
        } else {
          throw new Error(`Unsupported element type: ${element.tagName}`);
        }

        successCount++;
      } catch (e) {
        errors.push({
          fieldId: mapping.fieldId,
          error: (e as Error).message,
        });
      }
    }

    return {
      formId: `fill_${Date.now()}`,
      timestamp: Date.now(),
      successCount,
      failureCount: errors.length,
      errors,
    };
  }

  // ── Input & Textarea ────────────────────────────────────────────────

  private fillInput(el: HTMLInputElement, value: string, matchedType?: string): void {
    // Handle checkboxes and radios separately
    if (el.type === 'checkbox') {
      this.fillCheckbox(el, value);
      return;
    }
    if (el.type === 'radio') {
      this.fillRadio(el, value);
      return;
    }
    if (el.type === 'date') {
      this.fillDate(el, value);
      return;
    }

    if (matchedType === 'DOB' && ['text', 'tel', 'number', 'search'].includes(el.type)) {
      value = this.formatDateForText(el, value);
    }

    this.setNativeValue(el, value);
  }

  private formatDateForText(el: HTMLInputElement, value: string): string {
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    const [year, month, day] = parts;

    const context = [
      el.placeholder,
      el.labels?.[0]?.textContent ?? '',
      el.getAttribute('aria-label') ?? '',
      el.parentElement?.textContent ?? ''
    ].join(' ').toLowerCase();

    if (context.includes('dd/mm/yyyy') || context.includes('dd-mm') || context.includes('dd/mm')) {
      return `${day}/${month}/${year}`;
    }
    if (context.includes('mm/dd/yyyy') || context.includes('mm-dd') || context.includes('mm/dd')) {
      return `${month}/${day}/${year}`;
    }
    if (context.includes('yyyy/mm/dd') || context.includes('yyyy-mm-dd') || context.includes('yyyy/mm') || context.includes('yyyy-mm')) {
      return `${year}-${month}-${day}`; // standard fallback
    }

    // Default return original
    return value;
  }

  private fillTextArea(el: HTMLTextAreaElement, value: string): void {
    this.setNativeValue(el, value);
  }

  /**
   * Overrides the native value setter so React/Angular/Vue
   * virtual DOM trackers detect the change correctly.
   */
  private setNativeValue(
    el: HTMLInputElement | HTMLTextAreaElement,
    value: string
  ): void {
    const proto = Object.getPrototypeOf(el);
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    if (nativeSetter) {
      nativeSetter.call(el, value);
    } else {
      el.value = value;
    }

    // Dispatch events that framework bindings expect
    el.dispatchEvent(new Event('input',  { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  }

  // ── Helper for Option Matching ───────────────────────────────────────
  
  private optionMatches(optionText: string, optionValue: string, targetValue: string): boolean {
    const oText = optionText.toLowerCase().trim();
    const oVal = optionValue.toLowerCase().trim();
    const target = targetValue.toLowerCase().trim();

    if (oText === target || oVal === target) return true;
    if (oText.includes(target) || oVal.includes(target)) return true;
    if (target.includes(oText) && oText.length > 2) return true;
    if (target.includes(oVal) && oVal.length > 2) return true;

    // Advanced Region Matching (Countries)
    if (target.length === 2 || target.length === 3) {
      try {
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        const fullName = regionNames.of(target.toUpperCase())?.toLowerCase();
        if (fullName && (oText === fullName || oVal === fullName || oText.includes(fullName))) return true;
      } catch (e) {}
    } else {
      try {
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        if (oVal.length === 2) {
          const optFullName = regionNames.of(oVal.toUpperCase())?.toLowerCase();
          if (optFullName === target || optFullName?.includes(target)) return true;
        }
      } catch (e) {}
    }

    // Prefix match for state/country abbreviations (KAR -> Karnataka, IND -> India)
    if (target.length >= 2 && oText.length > target.length && oText.startsWith(target)) return true;
    if (oText.length >= 2 && target.length > oText.length && target.startsWith(oText)) return true;
    
    // Exact or partial code matching (e.g. 29 for Karnataka if 29 is the value)
    if (oVal === target) return true;

    // Gender specific loose matching
    if (['male', 'm', 'man'].includes(target)) {
      if (['male', 'm', 'man'].includes(oText) || ['male', 'm', 'man'].includes(oVal)) return true;
    }
    if (['female', 'f', 'woman'].includes(target)) {
      if (['female', 'f', 'woman'].includes(oText) || ['female', 'f', 'woman'].includes(oVal)) return true;
    }
    if (['non-binary', 'nonbinary'].includes(target)) {
      if (['non-binary', 'nonbinary'].includes(oText) || ['non-binary', 'nonbinary'].includes(oVal)) return true;
    }
    if (['prefer not to say'].includes(target)) {
      if (oText.includes('prefer') || oVal.includes('prefer')) return true;
    }

    return false;
  }

  // ── Select ───────────────────────────────────────────────────────────

  private fillSelect(el: HTMLSelectElement, value: string): void {
    let matched = false;

    for (let i = 0; i < el.options.length; i++) {
      const opt = el.options[i];
      if (this.optionMatches(opt.text, opt.value, value)) {
        el.selectedIndex = i;
        matched = true;
        break;
      }
    }

    if (matched) {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // ── Checkbox ─────────────────────────────────────────────────────────

  private fillCheckbox(el: HTMLInputElement, value: string): void {
    const siblings = el.name
      ? Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${CSS.escape(el.name)}"]`))
      : [el];

    if (siblings.length > 1) {
      for (const cb of siblings) {
        const labelText = cb.labels?.[0]?.textContent ?? '';
        const matches = this.optionMatches(labelText, cb.value, value);
        if (cb.checked !== matches) {
          cb.checked = matches;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      return;
    }

    const shouldCheck = ['true', 'yes', '1', 'on', 'checked'].includes(value.toLowerCase().trim());
    if (el.checked !== shouldCheck) {
      el.checked = shouldCheck;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // ── Radio ────────────────────────────────────────────────────────────

  private fillRadio(el: HTMLInputElement, value: string): void {
    // Find all siblings with the same name
    const siblings = el.name
      ? Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]`))
      : [el];

    for (const radio of siblings) {
      const labelText = radio.labels?.[0]?.textContent ?? '';
      const matches = this.optionMatches(labelText, radio.value, value);
      
      if (matches) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  }

  // ── Date ─────────────────────────────────────────────────────────────

  private fillDate(el: HTMLInputElement, value: string): void {
    // Normalize to YYYY-MM-DD
    let formatted = value;
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        formatted = d.toISOString().split('T')[0];
      }
    } catch {
      // Use value as-is
    }
    this.setNativeValue(el, formatted);
  }
}
