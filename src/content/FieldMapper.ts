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
    const results = fields.map(field => this.classify(field));

    // A full address must fill at most one field per page: when several
    // detected fields match FULL_ADDRESS, only the highest-confidence one
    // keeps its mapping and the rest are demoted to UNKNOWN so they are
    // safely skipped instead of receiving the street address as a wrong
    // duplicate value (e.g. an "Apt, Suite" line). Other single-value types
    // are intentionally NOT deduped: two genuine email or phone fields on
    // one page (e.g. separate contact and registration forms) both deserve
    // the same profile value, and an identical value is semantically correct
    // there. Radio and checkbox controls are always excluded — each control
    // is a distinct option, and FormFiller selects the matching option by
    // value rather than filling every control in a group.
    const isGroupControl = (f: FormField) =>
      f.tagType === 'INPUT' && (f.inputTypeAttr === 'radio' || f.inputTypeAttr === 'checkbox');

    const candidates = results.filter(
      r => r.matchedType === 'FULL_ADDRESS' && !isGroupControl(r.field)
    );

    const counts = new Map<string, number>();
    for (const r of candidates) {
      counts.set(r.matchedType, (counts.get(r.matchedType) ?? 0) + 1);
    }

    const demoted = new Set<DetectedField>();
    for (const [type, count] of counts) {
      if (count <= 1) continue;
      const group = candidates.filter(r => r.matchedType === type);
      let best = group[0];
      for (const r of group) {
        if (r.confidenceScore > best.confidenceScore) best = r;
      }
      for (const r of group) {
        if (r !== best) demoted.add(r);
      }
    }

    return results.map(r =>
      demoted.has(r)
        ? { field: r.field, matchedType: 'UNKNOWN' as FieldType, confidenceScore: 0, detectionSource: 'NONE' as const }
        : r
    );
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

    // HTML5 input type is a strong generic signal (e.g. type="email" / type="tel").
    // Only specific, well-defined types contribute — type="text" is too generic to use.
    const typeSignalText =
      field.inputTypeAttr === 'email' ? 'email' :
      field.inputTypeAttr === 'tel'   ? 'tel telephone' :
      '';
    if (typeSignalText) {
      signals.push({ text: typeSignalText, weight: CONFIDENCE_WEIGHTS.LABEL });
    }

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

    // Specific name evidence outranks the generic FULL_NAME signal: the bare
    // 'name' keyword also matches inside "first name" / "last name" / a
    // section header reading just "Name", so a First/Last name field must
    // never be captured as a full-name field.
    const specificNameTypes: string[] = ['FIRST_NAME', 'MIDDLE_NAME', 'LAST_NAME'];
    if (scores.has('FULL_NAME') && specificNameTypes.some(t => scores.has(t))) {
      scores.delete('FULL_NAME');
    }

    // Radio groups: a radio whose label/value wording indicates a gender choice
    // (Male / Female / non-binary) maps to GENDER even when the group name carries
    // no hint (e.g. name="radiooptions"). Word-boundary match avoids false hits.
    if (field.tagType === 'INPUT' && field.inputTypeAttr === 'radio') {
      const radioSignal = normalizeText(
        [field.labelText, field.ariaLabelAttr, field.nameAttr, field.idAttr, field.surroundingText].join(' ')
      );
      if (/(^|\s)(male|female|nonbinary)(\s|$)/.test(radioSignal)) {
        scores.set('GENDER', (scores.get('GENDER') ?? 0) + CONFIDENCE_WEIGHTS.LABEL);
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
