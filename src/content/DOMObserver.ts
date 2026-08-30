// ─── DOMObserver ───────────────────────────────────────────────────────────
// Phase 2: Watches the page for dynamically injected form elements
// (e.g. React multi-step wizards, AJAX modals) and triggers a re-scan.
//
// Performance rules:
//   - Debounce 250ms — burst mutations from React renders fire one callback.
//   - Only trigger if the mutations contain form-related elements.
//   - Observe childList + subtree only (no attribute observation).
//   - Disconnect cleanly on stop().

export class DOMObserver {
  private observer: MutationObserver;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;

  constructor(private readonly onFormChange: () => void) {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
  }

  // ── Public API ────────────────────────────────────────────────────────

  start(): void {
    if (this.isRunning) return;
    if (!document.body) {
      console.debug('[SFA] document.body not found, skipping DOMObserver.');
      return;
    }
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      // Do NOT observe attributes or characterData — too noisy
    });
    this.isRunning = true;
  }

  stop(): void {
    if (!this.isRunning) return;
    this.observer.disconnect();
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.isRunning = false;
  }

  // ── Mutation Handler ──────────────────────────────────────────────────

  private handleMutations(mutations: MutationRecord[]): void {
    // Only proceed if at least one mutation added a form-relevant node.
    const hasFormElements = mutations.some(mutation =>
      Array.from(mutation.addedNodes).some(node => this.isFormRelevant(node))
    );

    if (!hasFormElements) return;

    // Debounce: collapse rapid successive mutations into one callback.
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.onFormChange();
    }, 250);
  }

  // ── Node Relevance Check ──────────────────────────────────────────────

  private isFormRelevant(node: Node): boolean {
    if (!(node instanceof HTMLElement)) return false;

    if (this.isFormControl(node)) return true;

    return node.querySelector('input, textarea, select, form, [role="textbox"], [role="radiogroup"], [role="listbox"], [role="combobox"], [role="checkbox"], [role="listitem"]') !== null;
  }

  private isFormControl(el: HTMLElement): boolean {
    const tag = el.tagName?.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'FORM') return true;
    
    const role = el.getAttribute('role');
    if (role && ['textbox', 'radiogroup', 'listbox', 'combobox', 'checkbox', 'listitem'].includes(role)) return true;
    
    return false;
  }
}
