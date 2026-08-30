import type { FormField, DetectedField, FieldType } from '../shared/types';
import {
  FIELD_KEYWORDS,
  AUTOCOMPLETE_MAP,
  CONFIDENCE_WEIGHTS,
  CONFIDENCE_THRESHOLD,
  SENSITIVE_KEYWORDS,
  SENSITIVE_INPUT_TYPES,
  NEGATIVE_KEYWORDS,
} from '../shared/constants';
import { normalizeText } from '../utils/domHelpers';

export class FieldMapper {
  map(fields: FormField[]): DetectedField[] {
    return fields.map(field => this.classify(field));
  }

  private classify(field: FormField): DetectedField {
    if (this.isSensitive(field)) {
      return {
        field,
        matchedType: 'UNKNOWN',
        confidenceScore: 0,
        detectionSource: 'NONE',
      };
    }

    const autoType = this.matchAutocomplete(field.autocompleteAttr);
    if (autoType !== 'UNKNOWN') {
      return {
        field,
        matchedType: autoType,
        confidenceScore: CONFIDENCE_WEIGHTS.AUTOCOMPLETE,
        detectionSource: 'AUTOCOMPLETE',
      };
    }

    const scores = this.accumulateScores(field);
    const best = this.pickBest(scores);

    if (best.score >= CONFIDENCE_THRESHOLD) {
      let finalType = best.type;
      return {
        field,
        matchedType: finalType as FieldType,
        confidenceScore: Math.min(best.score, 100),
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

  private isSensitive(field: FormField): boolean {
    if (SENSITIVE_INPUT_TYPES.includes(field.inputTypeAttr)) return true;

    const combined = normalizeText(
      [field.nameAttr, field.idAttr, field.placeholderAttr, field.labelText, field.ariaLabelAttr].join(' ')
    );
    return SENSITIVE_KEYWORDS.some(kw => combined.includes(kw));
  }





  private matchAutocomplete(autocomplete: string): FieldType {
    if (!autocomplete) return 'UNKNOWN';
    const tokens = autocomplete.toLowerCase().split(/\s+/);
    
    let baseType = 'UNKNOWN';
    for (const token of tokens) {
      if (AUTOCOMPLETE_MAP[token]) {
        baseType = AUTOCOMPLETE_MAP[token];
        break;
      }
    }
    
    return baseType as FieldType;
  }

  private accumulateScores(field: FormField): Map<string, number> {
    const scores = new Map<string, number>();

    const signals: Array<{ text: string; weight: number }> = [
      { text: field.nameAttr,        weight: CONFIDENCE_WEIGHTS.NAME_EXACT       },
      { text: field.idAttr,          weight: CONFIDENCE_WEIGHTS.ID_EXACT         },
      { text: field.labelText,       weight: CONFIDENCE_WEIGHTS.LABEL            },
      { text: field.ariaLabelAttr,   weight: CONFIDENCE_WEIGHTS.ARIA_LABEL       },
      { text: field.placeholderAttr, weight: CONFIDENCE_WEIGHTS.PLACEHOLDER      },
      { text: field.surroundingText, weight: CONFIDENCE_WEIGHTS.SURROUNDING_TEXT },
    ];

    const standaloneNameKeywords = ['company', 'school', 'college', 'university', 'course', 'department', 'product', 'father', 'mother', 'parent', 'guardian', 'spouse'];
    const combinedSignalsText = normalizeText(signals.map(s => s.text).join(' '));
    const hasStandaloneKeyword = standaloneNameKeywords.some(kw => combinedSignalsText.includes(kw));
    const hasFatherContext = combinedSignalsText.includes('father') || combinedSignalsText.includes('parent');
    const hasMotherContext = combinedSignalsText.includes('mother') || combinedSignalsText.includes('parent');

    for (const { text, weight } of signals) {
      if (!text) continue;
      const normalized = normalizeText(text);
      if (!normalized) continue;
      if (NEGATIVE_KEYWORDS.some(nkw => normalized.includes(nkw))) continue;

      for (const [rawType, keywords] of Object.entries(FIELD_KEYWORDS)) {
        if (rawType === 'UNKNOWN') continue;
        
        // Skip personal names if a standalone context is detected
        if (hasStandaloneKeyword && ['FIRST_NAME', 'MIDDLE_NAME', 'LAST_NAME', 'FULL_NAME', 'INITIALS'].includes(rawType)) {
          continue;
        }

        let isMatch = this.matchesKeywords(normalized, keywords);

        // Contextual matching for ambiguous abbreviations
        if (!isMatch) {
          if (rawType === 'FATHER_NAME' && hasFatherContext) {
            isMatch = ['f. name', 'f name', 'f.name', 'f/n', 'f/n name', 'f_name', 'fname'].some(kw => normalized.includes(kw));
          }
          if (rawType === 'MOTHER_NAME' && hasMotherContext) {
            isMatch = ['m. name', 'm name', 'm.name', 'm_name', 'mname'].some(kw => normalized.includes(kw));
          }
        }

        if (!isMatch) continue;

        const current = scores.get(rawType) ?? 0;
        scores.set(rawType, current + weight);
      }
    }

    return scores;
  }

  private matchesKeywords(normalized: string, keywords: string[]): boolean {
    return keywords.some(kw => normalized.includes(kw));
  }

  private pickBest(scores: Map<string, number>): { type: string; score: number } {
    let bestType: string = 'UNKNOWN';
    let bestScore = 0;
    for (const [type, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }
    return { type: bestType, score: bestScore };
  }

  static containsSensitiveKeyword(text: string): boolean {
    const n = normalizeText(text);
    return SENSITIVE_KEYWORDS.some(kw => n.includes(kw));
  }
}
