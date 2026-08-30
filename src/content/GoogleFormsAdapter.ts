import type { FormField } from '../shared/types';
import { buildSelector } from '../utils/domHelpers';
import { FieldMapper } from './FieldMapper';

export class GoogleFormsAdapter {
  static isGoogleForm(): boolean {
    return window.location.hostname === 'docs.google.com' && window.location.pathname.startsWith('/forms');
  }

  static scan(): FormField[] {
    const fields: FormField[] = [];
    
    // Find all interactive elements globally
    const interactives = Array.from(document.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, [role="textbox"], [role="radiogroup"], [role="listbox"], [role="combobox"], [role="checkbox"]'
    ));

    // Deduplicate native radios by name if any exist
    const filteredInteractives = interactives.filter((el, index, self) => {
      if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'radio') {
        const name = el.getAttribute('name');
        if (name) {
          return self.findIndex(e => e.tagName === 'INPUT' && (e as HTMLInputElement).type === 'radio' && e.getAttribute('name') === name) === index;
        }
      }
      return true;
    });

    const seenCheckboxContainers = new Set<HTMLElement>();

    for (const el of filteredInteractives) {
      // Visibility check
      if (el.offsetParent === null) {
        const style = window.getComputedStyle(el);
        if (style.position !== 'fixed' && style.display === 'none') continue;
      }

      // Find the closest question container
      const container = el.closest<HTMLElement>('[role="listitem"]') || 
                        el.closest<HTMLElement>('div.geS5n') || 
                        el.closest<HTMLElement>('.freebirdFormviewerViewItemsItemItem') || 
                        el.parentElement?.closest<HTMLElement>('div[jsmodel]') || 
                        el.parentElement;

      if (!container) continue;

      let questionText = '';
      let surroundingText = '';

      // For checkboxes, we only want to emit ONE field per group
      if (el.getAttribute('role') === 'checkbox' || ((el as HTMLInputElement).type === 'checkbox')) {
        if (seenCheckboxContainers.has(container)) continue;
        seenCheckboxContainers.add(container);
      }

      const heading = container.querySelector('[role="heading"]');
      if (heading) {
        questionText = heading.textContent || '';
      } else {
        // Fallback: use innerText of the container, take the first non-empty line
        const textLines = (container.innerText || '').split('\n').map(t => t.trim()).filter(Boolean);
        questionText = textLines.length > 0 ? textLines[0] : '';
      }
      
      surroundingText = questionText;

      const tagType = 'GOOGLE_FORM_FIELD' as any;
      let inputTypeAttr = el.getAttribute('type') || '';
      const role = el.getAttribute('role');
      if (role === 'radiogroup') inputTypeAttr = 'radio';
      if (role === 'listbox') inputTypeAttr = 'select';
      if (role === 'checkbox') inputTypeAttr = 'checkbox';

      if (inputTypeAttr === 'radio' || inputTypeAttr === 'checkbox' || inputTypeAttr === 'select') {
        const options = Array.from(container.querySelectorAll('[role="radio"], [role="checkbox"], [role="option"]'))
          .map(opt => opt.getAttribute('aria-label') || opt.getAttribute('data-value') || opt.textContent || '')
          .map(t => t.trim())
          .filter(Boolean);
        if (options.length) {
          surroundingText += ' | ' + options.join(' | ');
        }
      }

      const ariaLabel = el.getAttribute('aria-label') ?? '';
      if (FieldMapper.containsSensitiveKeyword(questionText + ' ' + ariaLabel + ' ' + surroundingText)) {
        continue;
      }

      fields.push({
        id: `sfa_gform_${Math.random().toString(36).slice(2, 10)}`,
        elementSelector: buildSelector(el),
        nameAttr: el.getAttribute('name') ?? '',
        idAttr: el.id ?? '',
        placeholderAttr: el.getAttribute('placeholder') ?? ariaLabel,
        autocompleteAttr: el.getAttribute('autocomplete') ?? '',
        ariaLabelAttr: ariaLabel,
        tagType,
        inputTypeAttr,
        labelText: questionText,
        surroundingText,
      });
    }

    return fields;
  }

  static fill(el: HTMLElement, value: string, optionMatches: (optText: string, optVal: string, target: string) => boolean): void {
    const role = el.getAttribute('role');
    const tag = el.tagName.toUpperCase();
    const type = el.getAttribute('type');

    if (tag === 'INPUT' || tag === 'TEXTAREA' || role === 'textbox') {
      if (type === 'date') {
        let formatted = value;
        try {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            formatted = d.toISOString().split('T')[0];
          }
        } catch {}
        (el as HTMLInputElement).value = formatted;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      else if ((el as any).isContentEditable) {
        el.innerText = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        (el as HTMLInputElement).value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } 
    else if (role === 'radiogroup') {
      const options = Array.from(el.querySelectorAll<HTMLElement>('[role="radio"]'));
      for (const opt of options) {
        const text = opt.getAttribute('aria-label') || opt.getAttribute('data-value') || opt.textContent || '';
        if (optionMatches(text, text, value)) {
          opt.click(); // Google forms radios respond to click events
          break;
        }
      }
    } 
    else if (role === 'checkbox') {
      // Find all checkboxes in the same listitem
      const container = el.closest('[role="listitem"]');
      if (container) {
        const options = Array.from(container.querySelectorAll<HTMLElement>('[role="checkbox"]'));
        for (const opt of options) {
          const text = opt.getAttribute('aria-label') || opt.getAttribute('data-value') || opt.textContent || '';
          const matches = optionMatches(text, text, value);
          const isChecked = opt.getAttribute('aria-checked') === 'true';
          
          if (matches && !isChecked) {
            opt.click();
          } else if (!matches && isChecked) {
            opt.click(); // toggle off
          }
        }
      }
    }
    else if (role === 'listbox' || role === 'combobox') {
      // Google forms dropdowns require a click to open, then a click on the option.
      // Doing this synchronously is tricky because the options might not exist in DOM until opened.
      // But usually in forms, they are in DOM or we can trigger it.
      // A safe approach: trigger click on combobox, wait a tick, find option, click it.
      el.click();
      setTimeout(() => {
        const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
        for (const opt of options) {
          // ignore hidden or disconnected options
          if (opt.offsetParent === null) continue;
          
          const text = opt.getAttribute('aria-label') || opt.getAttribute('data-value') || opt.textContent || '';
          if (optionMatches(text, text, value)) {
            opt.click();
            break;
          }
        }
      }, 50);
    }
  }
}
