import type { FormField, DetectedField, FieldType } from '../shared/types';
import {
  FIELD_KEYWORDS,
  AUTOCOMPLETE_MAP,
  CONFIDENCE_WEIGHTS,
  CONFIDENCE_THRESHOLD,
  SENSITIVE_KEYWORDS,
  SENSITIVE_INPUT_TYPES,
} from '../shared/constants';
import { normalizeText } from '../utils/domHelpers';

// ─── FieldMapper ───────────────────────────────────────────────────────────
// Phase 2: Multi-signal additive scoring.
//
// Each field is evaluated across 6 independent DOM signals.
// Matching the same FieldType across multiple signals ADDS to the score
// (capped at 100), rewarding corroboration. The highest-scoring type wins.
// Sensitive fields are blocked at classification time before any scoring.

export class FieldMapper {
  /**
   * Maps each raw FormField to a DetectedField with a FieldType + confidence score.
   */
  map(fields: FormField[]): DetectedField[] {
    return fields.map(field => this.classify(field));
  }

  // ── Private ─────────────────────────────────────────────────────────

  private classify(field: FormField): DetectedField {
    // Step 14: Sensitive field guard — block at mapper level, not just detector
    if (this.isSensitive(field)) {
      return {
        field,
        matchedType: 'UNKNOWN',
        confidenceScore: 0,
        detectionSource: 'NONE',
      };
    }

    // Step 13a: Autocomplete attribute — highest confidence, short-circuit
    const autoType = this.matchAutocomplete(field.autocompleteAttr);
    if (autoType !== 'UNKNOWN') {
      return {
        field,
        matchedType: autoType,
        confidenceScore: CONFIDENCE_WEIGHTS.AUTOCOMPLETE,
        detectionSource: 'AUTOCOMPLETE',
      };
    }

    // Step 13b: Additive multi-signal scoring
    const scores = this.accumulateScores(field);
    const best = this.pickBest(scores);

    if (best.score >= CONFIDENCE_THRESHOLD) {
      return {
        field,
        matchedType: best.type,
        confidenceScore: Math.min(best.score, 100), // cap at 100
        detectionSource: 'HEURISTICS',
      };
    }

    return {
      field,
      matchedType: 'UNKNOWN',
      confidenceScore: best.score,
      detectionSource: 'NONE',
    };
  }

  // ── Step 14: Sensitive Field Guard ───────────────────────────────────

  private isSensitive(field: FormField): boolean {
    // Block by input type first (fastest check)
    if (SENSITIVE_INPUT_TYPES.includes(field.inputTypeAttr)) return true;

    // Block by keyword scan across all text signals
    const combined = normalizeText(
      [field.nameAttr, field.idAttr, field.placeholderAttr, field.labelText, field.ariaLabelAttr].join(' ')
    );
    return SENSITIVE_KEYWORDS.some(kw => combined.includes(kw));
  }

  // ── Step 13: Autocomplete Match ───────────────────────────────────────

  private matchAutocomplete(autocomplete: string): FieldType {
    if (!autocomplete) return 'UNKNOWN';
    const normalized = normalizeText(autocomplete);
    return (
      AUTOCOMPLETE_MAP[autocomplete] ??   // exact raw match (e.g. "given-name")
      AUTOCOMPLETE_MAP[normalized] ??     // normalized match
      'UNKNOWN'
    );
  }

  // ── Step 13: Additive Multi-Signal Score Accumulation ─────────────────
  //
  // Each of the 6 signals contributes its FULL weight when it matches.
  // This means:
  //   - name="email" (85) + label="Email" (60) = 145 → capped to 100
  //   - Only label="Email" (60) = 60 → passes threshold
  //   - Only surroundingText="contact" (30) = 30 → below threshold → UNKNOWN
  //
  // A field strongly corroborated across multiple signals gets a much higher
  // score than one matched by a single weak signal.

  private accumulateScores(field: FormField): Map<FieldType, number> {
    const scores = new Map<FieldType, number>();

    const signals: Array<{ text: string; weight: number }> = [
      { text: field.nameAttr,        weight: CONFIDENCE_WEIGHTS.NAME_EXACT       },
      { text: field.idAttr,          weight: CONFIDENCE_WEIGHTS.ID_EXACT         },
      { text: field.labelText,       weight: CONFIDENCE_WEIGHTS.LABEL            },
      { text: field.ariaLabelAttr,   weight: CONFIDENCE_WEIGHTS.ARIA_LABEL       },
      { text: field.placeholderAttr, weight: CONFIDENCE_WEIGHTS.PLACEHOLDER      },
      { text: field.surroundingText, weight: CONFIDENCE_WEIGHTS.SURROUNDING_TEXT },
    ];

    for (const { text, weight } of signals) {
      if (!text) continue;
      const normalized = normalizeText(text);
      if (!normalized) continue;

      for (const [rawType, keywords] of Object.entries(FIELD_KEYWORDS)) {
        const type = rawType as FieldType;
        if (type === 'UNKNOWN') continue;
        if (!this.matchesKeywords(normalized, keywords)) continue;

        // ADDITIVE: each corroborating signal adds its weight
        const current = scores.get(type) ?? 0;
        scores.set(type, current + weight);
      }
    }

    return scores;
  }

  private matchesKeywords(normalized: string, keywords: string[]): boolean {
    return keywords.some(kw => normalized.includes(kw));
  }

  private pickBest(scores: Map<FieldType, number>): { type: FieldType; score: number } {
    let bestType: FieldType = 'UNKNOWN';
    let bestScore = 0;
    for (const [type, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }
    return { type: bestType, score: bestScore };
  }

  // ── Static Utility ────────────────────────────────────────────────────

  /**
   * Public utility used by FormFiller for a final pre-fill safety check.
   */
  static containsSensitiveKeyword(text: string): boolean {
    const n = normalizeText(text);
    return SENSITIVE_KEYWORDS.some(kw => n.includes(kw));
  }
}
