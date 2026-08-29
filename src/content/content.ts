import type { DetectedField, FieldMapping, FillFormMessage } from '../shared/types';
import { FormDetector } from './FormDetector';
import { FieldMapper } from './FieldMapper';
import { FormFiller } from './FormFiller';
import { DOMObserver } from './DOMObserver';
import { PreviewOverlay } from './PreviewOverlay';

// ─── Content Script Entry Point ────────────────────────────────────────────

const detector = new FormDetector();
const mapper   = new FieldMapper();
const filler   = new FormFiller();
const preview  = new PreviewOverlay(filler);

// ─── Phase 2: Cached Detection State ──────────────────────────────────────
// When dynamic mutations occur, we re-scan and cache the results so that
// the next DETECT_FORM request from the popup returns fresh data instantly.

let cachedDetection: DetectedField[] | null = null;

function runDetection(): DetectedField[] {
  const fields   = detector.scan();
  const detected = mapper.map(fields);
  cachedDetection = detected;
  return detected;
}

// ─── Phase 2: Dynamic Form Observer ───────────────────────────────────────

const observer = new DOMObserver(() => {
  // Re-scan on dynamic DOM changes (React/Vue route transitions, AJAX modals)
  runDetection();
  console.debug(`[SFA] Dynamic re-scan: ${cachedDetection?.length ?? 0} fields detected.`);
});



// ─── Message Listener ─────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Security: Only accept messages from our own extension
  if (sender.id !== chrome.runtime.id) return false;
  // Only handle typed extension messages — ignore window.postMessage entirely
  if (!message?.type) return false;

  switch (message.type) {
    case 'DETECT_FORM': {
      try {
        // Always do a fresh scan when explicitly requested
        const detected = runDetection();
        sendResponse(detected);
      } catch (e) {
        console.error('[SFA Content] DETECT_FORM error:', e);
        sendResponse([]);
      }
      return true; // async response
    }

    case 'SHOW_PREVIEW': {
      try {
        const { mappings } = message as import('../shared/types').ShowPreviewMessage;
        preview.show(mappings);
        sendResponse({ success: true });
      } catch (e) {
        console.error('[SFA Content] SHOW_PREVIEW error:', e);
        sendResponse({ success: false });
      }
      return true;
    }

    case 'FILL_FORM': {
      try {
        const { mappings } = message as import('../shared/types').FillFormMessage;
        const result = filler.fill(mappings);
        sendResponse(result);
      } catch (e) {
        console.error('[SFA Content] FILL_FORM error:', e);
        sendResponse({ successCount: 0, failureCount: 0, errors: [] });
      }
      return true;
    }

    default:
      return false;
  }
});

console.debug('[SFA] Content script loaded. Observer active.');

// Start observing once the DOM is ready (defensively placed at the end)
try {
  observer.start();
} catch (e) {
  console.warn('[SFA] Observer failed to start:', e);
}
