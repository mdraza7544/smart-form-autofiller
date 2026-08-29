import { describe, it, expect } from 'vitest';
import { FieldMapper } from '../../src/content/FieldMapper';
import { FormField } from '../../src/shared/types';

describe('FieldMapper', () => {
  const mapper = new FieldMapper();

  const createMockField = (overrides: Partial<FormField> = {}): FormField => ({
    id: 'mock_123',
    elementSelector: 'input#test',
    nameAttr: '',
    idAttr: '',
    placeholderAttr: '',
    autocompleteAttr: '',
    ariaLabelAttr: '',
    tagType: 'INPUT',
    inputTypeAttr: 'text',
    labelText: '',
    surroundingText: '',
    ...overrides
  });

  it('blocks sensitive fields like passwords', () => {
    const fields = [
      createMockField({ inputTypeAttr: 'password' }),
      createMockField({ nameAttr: 'user_password' }),
      createMockField({ labelText: 'Credit Card Number' })
    ];

    const results = mapper.map(fields);
    
    results.forEach(res => {
      expect(res.matchedType).toBe('UNKNOWN');
      expect(res.confidenceScore).toBe(0);
      expect(res.detectionSource).toBe('NONE');
    });
  });

  it('matches exactly using autocomplete attribute', () => {
    const field = createMockField({ autocompleteAttr: 'email' });
    const [result] = mapper.map([field]);
    
    expect(result.matchedType).toBe('EMAIL');
    expect(result.detectionSource).toBe('AUTOCOMPLETE');
    expect(result.confidenceScore).toBe(95);
  });

  it('scores heuristics correctly and matches threshold', () => {
    // Both label and placeholder suggest FIRST_NAME
    const field = createMockField({ 
      labelText: 'First Name', 
      placeholderAttr: 'Enter your given name' 
    });
    
    const [result] = mapper.map([field]);
    
    expect(result.matchedType).toBe('FIRST_NAME');
    expect(result.detectionSource).toBe('HEURISTICS');
    expect(result.confidenceScore).toBeGreaterThan(40);
  });

  it('returns UNKNOWN if confidence is below threshold', () => {
    // Only surrounding text has a vague mention, low weight
    const field = createMockField({ surroundingText: 'name' });
    const [result] = mapper.map([field]);
    
    expect(result.matchedType).toBe('UNKNOWN');
    // Surrounding text weight is 30, threshold is 40
    expect(result.confidenceScore).toBeLessThan(40);
  });
});
