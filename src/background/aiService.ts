import type { FormField, AIFieldDetectionResult, FieldType } from '../shared/types';

// ─── AIService ─────────────────────────────────────────────────────────────
// Privacy-first AI fallback for unknown field classification.
//
// WHAT IS SENT:    tag type, name, id, input type, autocomplete attribute.
// WHAT IS NEVER SENT: profile values, placeholder text, page URLs, cookies.

const VALID_FIELD_TYPES: FieldType[] = [
  'FIRST_NAME','LAST_NAME','FULL_NAME','EMAIL','PHONE',
  'ADDRESS_LINE1','ADDRESS_LINE2','CITY','STATE','COUNTRY','ZIP_CODE','DOB','UNKNOWN',
];

export class AIService {
  private readonly TIMEOUT_MS = 8000;

  /**
   * Sends sanitized field metadata to OpenAI for classification.
   * Returns empty predictions on ANY failure — never throws.
   */
  async classify(fields: FormField[], apiKey: string): Promise<AIFieldDetectionResult> {
    try {
      // 1. Sanitize — strip everything except structural metadata
      const sanitized = fields.map(f => ({
        fieldId: f.id,
        tag: f.tagType,
        name: f.nameAttr,
        id: f.idAttr,
        type: f.inputTypeAttr,
        autocomplete: f.autocompleteAttr,
      }));

      // 2. Build prompt
      const prompt = this.buildPrompt(sanitized);

      // 3. Call OpenAI with strict timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a form field classifier. Respond ONLY with valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[AIService] API error: ${response.status}`);
        return { predictedFields: [] };
      }

      const json = await response.json();
      const content = json?.choices?.[0]?.message?.content ?? '';

      // 4. Parse and validate
      return this.parseResponse(content, fields);

    } catch (e) {
      // AbortError, network error, parse error — all silently return empty
      console.warn('[AIService] classify failed:', (e as Error).message);
      return { predictedFields: [] };
    }
  }

  // ── Prompt Construction ────────────────────────────────────────────────

  private buildPrompt(
    sanitized: Array<{ fieldId: string; tag: string; name: string; id: string; type: string; autocomplete: string }>
  ): string {
    return `Classify each HTML form field into one of these types:
FIRST_NAME, LAST_NAME, FULL_NAME, EMAIL, PHONE, ADDRESS_LINE1, ADDRESS_LINE2, CITY, STATE, COUNTRY, ZIP_CODE, DOB, UNKNOWN

Fields:
${JSON.stringify(sanitized, null, 2)}

Respond with a JSON array of objects. Each object must have:
- "fieldId": the fieldId from input
- "predictedType": one of the types above
- "explanation": brief reason

Example response:
[{"fieldId":"sfa_abc","predictedType":"EMAIL","explanation":"name attribute contains email"}]

Respond ONLY with the JSON array. No markdown. No extra text.`;
  }

  // ── Response Parsing & Validation ──────────────────────────────────────

  private parseResponse(content: string, originalFields: FormField[]): AIFieldDetectionResult {
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) return { predictedFields: [] };

      const validFieldIds = new Set(originalFields.map(f => f.id));

      const predictedFields = parsed
        .filter((item: unknown) => {
          if (!item || typeof item !== 'object') return false;
          const obj = item as Record<string, unknown>;
          return (
            typeof obj.fieldId === 'string' &&
            typeof obj.predictedType === 'string' &&
            validFieldIds.has(obj.fieldId) &&
            VALID_FIELD_TYPES.includes(obj.predictedType as FieldType)
          );
        })
        .map((item: Record<string, unknown>) => ({
          fieldId: item.fieldId as string,
          predictedType: item.predictedType as FieldType,
          explanation: typeof item.explanation === 'string' ? item.explanation : undefined,
        }));

      return { predictedFields };
    } catch {
      console.warn('[AIService] Failed to parse AI response');
      return { predictedFields: [] };
    }
  }
}
