import type { FieldMapping, FillResult } from '../shared/types';
import { FieldMapper } from './FieldMapper';

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

    for (const mapping of mappings) {
      try {
        const el = document.querySelector(mapping.elementSelector);
        if (!el) throw new Error(`Element not found: ${mapping.elementSelector}`);

        // Final safety check — never fill sensitive fields
        if (FieldMapper.containsSensitiveKeyword(mapping.elementSelector + mapping.matchedType)) {
          throw new Error('Blocked: sensitive field detected');
        }

        if (el instanceof HTMLInputElement) {
          this.fillInput(el, mapping.profileValue);
        } else if (el instanceof HTMLTextAreaElement) {
          this.fillTextArea(el, mapping.profileValue);
        } else if (el instanceof HTMLSelectElement) {
          this.fillSelect(el, mapping.profileValue);
        } else {
          throw new Error(`Unsupported element type: ${el.tagName}`);
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

  private fillInput(el: HTMLInputElement, value: string): void {
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

    this.setNativeValue(el, value);
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

  // ── Select ───────────────────────────────────────────────────────────

  private fillSelect(el: HTMLSelectElement, value: string): void {
    const lowerValue = value.toLowerCase().trim();
    let matched = false;

    // Try matching by option value first
    for (let i = 0; i < el.options.length; i++) {
      const opt = el.options[i];
      if (opt.value.toLowerCase() === lowerValue || opt.text.toLowerCase() === lowerValue) {
        el.selectedIndex = i;
        matched = true;
        break;
      }
    }

    // Partial match fallback
    if (!matched) {
      for (let i = 0; i < el.options.length; i++) {
        const opt = el.options[i];
        if (opt.text.toLowerCase().includes(lowerValue) || opt.value.toLowerCase().includes(lowerValue)) {
          el.selectedIndex = i;
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // ── Checkbox ─────────────────────────────────────────────────────────

  private fillCheckbox(el: HTMLInputElement, value: string): void {
    const shouldCheck = ['true', 'yes', '1', 'on', 'checked'].includes(value.toLowerCase());
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

    const lowerValue = value.toLowerCase();
    for (const radio of siblings) {
      const matches =
        radio.value.toLowerCase() === lowerValue ||
        (radio.labels?.[0]?.textContent?.toLowerCase().trim() === lowerValue);
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
