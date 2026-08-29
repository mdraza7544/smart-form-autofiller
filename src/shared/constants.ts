import type { FieldType, ExtensionSettings } from './types';

// ─── Keyword Dictionaries ──────────────────────────────────────────────────

export const FIELD_KEYWORDS: Record<FieldType, string[]> = {
  FIRST_NAME:   ['first name', 'firstname', 'fname', 'given name', 'givenname', 'forename'],
  LAST_NAME:    ['last name', 'lastname', 'lname', 'surname', 'family name', 'familyname'],
  FULL_NAME:    ['full name', 'fullname', 'your name', 'contact name', 'name'],
  EMAIL:        ['email', 'email address', 'emailaddress', 'mail', 'contact email', 'e-mail'],
  PHONE:        ['phone', 'telephone', 'mobile', 'tel', 'cellphone', 'cell', 'contact number', 'phonenumber'],
  ADDRESS_LINE1:['address', 'address line 1', 'address1', 'street address', 'street', 'addr'],
  ADDRESS_LINE2:['address line 2', 'address2', 'suite', 'apartment', 'apt', 'unit'],
  CITY:         ['city', 'town', 'locality', 'district'],
  STATE:        ['state', 'province', 'region', 'county'],
  COUNTRY:      ['country', 'nation', 'country name'],
  ZIP_CODE:     ['zip', 'zipcode', 'zip code', 'postal', 'postal code', 'postalcode', 'pin', 'pincode', 'pin code'],
  DOB:          ['dob', 'date of birth', 'dateofbirth', 'birthdate', 'birthday', 'birth date'],
  GENDER:       ['gender', 'sex', 'male', 'female'],
  UNKNOWN:      [],
};

// ─── Autocomplete Attribute Mappings ──────────────────────────────────────

export const AUTOCOMPLETE_MAP: Record<string, FieldType> = {
  'given-name':        'FIRST_NAME',
  'family-name':       'LAST_NAME',
  'name':              'FULL_NAME',
  'email':             'EMAIL',
  'tel':               'PHONE',
  'tel-national':      'PHONE',
  'address-line1':     'ADDRESS_LINE1',
  'address-line2':     'ADDRESS_LINE2',
  'address-level2':    'CITY',
  'address-level1':    'STATE',
  'country':           'COUNTRY',
  'country-name':      'COUNTRY',
  'postal-code':       'ZIP_CODE',
  'bday':              'DOB',
  'sex':               'GENDER',
};

// ─── Confidence Weights ────────────────────────────────────────────────────

export const CONFIDENCE_WEIGHTS = {
  AUTOCOMPLETE:    95,
  NAME_EXACT:      85,
  ID_EXACT:        80,
  LABEL:           60,
  ARIA_LABEL:      55,
  PLACEHOLDER:     50,
  SURROUNDING_TEXT:30,
} as const;

export const CONFIDENCE_THRESHOLD = 40;

// ─── Sensitive Field Blocklists ────────────────────────────────────────────
// Fields matching these are NEVER filled — ever.

export const SENSITIVE_INPUT_TYPES: readonly string[] = ['password', 'hidden'] as const;

export const SENSITIVE_KEYWORDS: readonly string[] = [
  'password', 'passwd', 'pass',
  'credit', 'card', 'cardnumber', 'card number',
  'cvv', 'cvc', 'security code',
  'otp', 'one time', 'verification code',
  'ssn', 'social security',
  'pin',
] as const;

// ─── Default Settings ──────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: ExtensionSettings = {
  activeProfileId: null,
  aiEnabled: false,
  aiApiKey: null,
  autoDetectEnabled: true,
  theme: 'SYSTEM',
};

// ─── Storage Keys ─────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  PROFILES:  'sfa_profiles',
  SETTINGS:  'sfa_settings',
  SITE_RULES:'sfa_site_rules',
} as const;
