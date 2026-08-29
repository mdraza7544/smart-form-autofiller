import { describe, it, expect } from 'vitest';
import { normalizeText } from '../../src/utils/domHelpers';

describe('normalizeText', () => {
  it('handles camelCase and PascalCase', () => {
    expect(normalizeText('emailAddress')).toBe('email address');
    expect(normalizeText('FirstName')).toBe('first name');
  });

  it('handles snake_case and kebab-case', () => {
    expect(normalizeText('user_email_address')).toBe('user email address');
    expect(normalizeText('contact-phone-number')).toBe('contact phone number');
  });

  it('removes trailing numeric suffixes', () => {
    expect(normalizeText('address_line_1')).toBe('address line'); // wait, address_line_1 becomes address line 1 if split? 
    // Wait, let's see what it actually does: .replace(/\s+\d+$/, '')
    // "address line 1" -> "address line"
  });

  it('removes special characters', () => {
    expect(normalizeText('Email Address!!!')).toBe('email address');
    expect(normalizeText('First Name (Required)')).toBe('first name required');
  });

  it('handles empty or null input', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText(null as any)).toBe('');
  });
});
