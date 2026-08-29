/**
 * normalizeText — sanitizes attribute strings for keyword comparison.
 *
 * Transforms:
 *   "user_Email-Address_2" → "user email address"
 *   "emailAddress"         → "email address"  (camelCase split)
 *   "CONTACT_MAIL"         → "contact mail"
 */
export function normalizeText(input: string): string {
  if (!input) return '';

  return input
    // Insert space before uppercase letters preceded by lowercase (camelCase → words)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace underscores, hyphens, and multiple spaces with a single space
    .replace(/[_\-\s]+/g, ' ')
    // Lowercase everything
    .toLowerCase()
    // Remove characters that are not letters, numbers, or spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Remove trailing numeric suffixes like "_2", " 1", etc.
    .replace(/\s+\d+$/, '')
    .trim();
}

/**
 * Builds a robust unique CSS selector for a DOM element,
 * used as a stable reference in FieldMapping.
 */
export function buildSelector(el: Element): string {
  // If element has a stable id, prefer it
  if (el.id && !/^\d/.test(el.id)) {
    return `#${CSS.escape(el.id)}`;
  }

  // Walk up the tree building a path
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id && !/^\d/.test(current.id)) {
      selector = `#${CSS.escape(current.id)}`;
      parts.unshift(selector);
      break;
    }

    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter(s => s.tagName === current!.tagName)
      : [];

    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-of-type(${index})`;
    }

    parts.unshift(selector);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

/**
 * Extracts visible text content from a DOM node, stripping HTML tags.
 */
export function getTextContent(el: Element | null): string {
  if (!el) return '';
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Returns the label text associated with an input via:
 *   1. <label for="id"> explicit association
 *   2. Ancestor <label> wrapping
 *   3. aria-labelledby attribute
 */
export function findLabelText(el: HTMLElement): string {
  // 1. Explicit <label for="...">
  if (el.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`);
    if (label) return getTextContent(label);
  }

  // 2. Ancestor <label>
  const ancestorLabel = el.closest<HTMLLabelElement>('label');
  if (ancestorLabel) {
    // Clone and remove the input itself to get only the label text
    const clone = ancestorLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, textarea, select').forEach(n => n.remove());
    return getTextContent(clone);
  }

  // 3. aria-labelledby
  const labelledById = el.getAttribute('aria-labelledby');
  if (labelledById) {
    const labelEl = document.getElementById(labelledById);
    if (labelEl) return getTextContent(labelEl);
  }

  return '';
}

export function getSurroundingText(el: HTMLElement): string {
  const parts: string[] = [];

  // 1. Previous siblings (Text nodes OR Elements)
  let prev = el.previousSibling;
  let count = 0;
  while (prev && count < 3) {
    if (prev.nodeType === Node.TEXT_NODE) {
      const t = prev.textContent?.trim();
      if (t) { parts.unshift(t); count++; }
    } else if (prev.nodeType === Node.ELEMENT_NODE) {
      const t = (prev as HTMLElement).innerText?.trim() || prev.textContent?.trim();
      if (t) { parts.unshift(t); count++; }
    }
    prev = prev.previousSibling;
  }

  // 2. Parent's direct text nodes and previous element sibling of the parent (e.g. Google Forms structure)
  if (el.parentElement) {
    const parentText = Array.from(el.parentElement.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (parentText) parts.push(parentText);

    // Look at parent's previous sibling element (very common in div layouts)
    const parentPrev = el.parentElement.previousElementSibling as HTMLElement;
    if (parentPrev) {
      const t = parentPrev.innerText?.trim() || parentPrev.textContent?.trim();
      if (t) parts.unshift(t);
    }
  }

  return parts.join(' ').trim();
}
