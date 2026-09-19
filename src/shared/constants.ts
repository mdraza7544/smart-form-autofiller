import type { FieldType, ExtensionSettings } from './types';

// ─── Keyword Dictionaries ──────────────────────────────────────────────────

export const FIELD_KEYWORDS: Record<string, string[]> = {
  // Unified Name Fields
  FIRST_NAME:      ['first name', 'firstname', 'fname', 'given name', 'givenname', 'forename', 'preferred name', 'preferredname', 'nickname'],
  MIDDLE_NAME:     ['middle name', 'middlename', 'mname'],
  LAST_NAME:       ['last name', 'lastname', 'lname', 'surname', 'family name', 'familyname', 'maiden name', 'maidenname', 'previous name', 'previousname', 'former name', 'formername'],
  FULL_NAME:       ['full name', 'fullname', 'your name', 'contact name', 'student name', 'employee name', 'applicant name', 'candidate name', 'member name', 'customer name', 'passenger name', 'name'],
  INITIALS:        ['initials'],

  // Standalone Name Fields
  PARENT_NAME:     ['parent name', 'parentname', 'parent’s name', 'parent\'s name', 'parent', 'parents\' name', 'parents name', 'parent full name', 'parent/guardian name', 'parent or guardian name', 'parent_name', 'parents_name', 'parent_full_name'],
  GUARDIAN_NAME:   ['guardian name', 'guardianname', 'guardian’s name', 'guardian\'s name', 'guardian', 'legal guardian name', 'guardian full name', 'parent/guardian name', 'parent or guardian name', 'guardian_name', 'guardians_name', 'guardian_full_name', 'guardiansname'],
  FATHER_NAME:     ['father name', 'fathername', 'fathers name', 'father\'s name', 'father’s name', 'father', 'father\'s full name', 'father full name', 'father\'s first name', 'father\'s middle name', 'father\'s last name', 'father\'s surname', 'father\'s family name', 'dad\'s name', 'dad name', 'dad', 'parent/father name', 'father_name', 'fathers_name', 'father_full_name', 'father_first_name', 'father_last_name'],
  MOTHER_NAME:     ['mother name', 'mothername', 'mothers name', 'mother\'s name', 'mother’s name', 'mother', 'mother\'s full name', 'mother full name', 'mother\'s first name', 'mother\'s middle name', 'mother\'s last name', 'mother\'s surname', 'mom\'s name', 'mom name', 'mom', 'mother_name', 'mothers_name', 'mother_full_name', 'mother_first_name', 'mother_last_name'],
  ROLL_NUMBER:     ['roll number', 'roll no', 'roll no.', 'roll #', 'roll id', 'roll', 'student roll number', 'student roll no', 'university roll number', 'university roll no', 'university roll', 'university roll id', 'usn', 'u.s.n.', 'university seat number', 'university seat no', 'seat number', 'seat no', 'student number', 'student id', 'student identification number', 'roll_number', 'roll_no', 'rollid', 'student_roll_number', 'university_roll_number', 'university_roll_no', 'student_number', 'student_id', 'seat_number'],
  REGISTRATION_NUMBER: ['registration number', 'registration no', 'registration no.', 'registration id', 'registration #', 'student registration number', 'student registration no', 'university registration number', 'university registration no', 'college registration number', 'college registration no', 'enrollment number', 'enrollment no', 'enrollment id', 'enrollment number/id', 'registration_number', 'registration_no', 'registrationid', 'student_registration_number', 'university_registration_number', 'college_registration_number', 'enrollment_number', 'enrollment_id'],
  SCHOOL_NAME:     ['school name', 'school'],
  COLLEGE_NAME:    ['college name', 'college'],
  UNIVERSITY_NAME: ['university name', 'university'],
  DEPARTMENT_NAME: ['department name', 'department', 'dept name'],
  COURSE_NAME:     ['course name', 'course'],

  // Email Fields
  EMAIL:           ['email', 'email address', 'emailaddress', 'mail', 'contact email', 'e-mail', 'user email', 'primary email', 'alternate email', 'secondary email', 'personal email', 'business email', 'work email', 'login email', 'username email', 'confirm email', 'email confirmation', 'confirm email address', 're-enter email'],
  
  // Phone Fields
  PHONE:           ['phone', 'telephone', 'tel', 'contact number', 'contact no', 'phonenumber', 'phone number', 'mobile', 'mobile phone', 'mobile number', 'cellphone', 'cell phone', 'cell', 'cell number', 'telephone number', 'work phone', 'business phone', 'home phone', 'alternate phone', 'secondary phone', 'emergency phone', 'whatsapp', 'whatsapp number', 'contact phone'],
  COUNTRY_CODE:    ['country code', 'phone country code', 'mobile country code', 'calling code', 'dialing code', 'telephone country code', 'international code', 'phone prefix', 'dial code'],
  DOB:             ['dob', 'date of birth', 'dateofbirth', 'birthdate', 'birthday', 'birth date'],
  DOB_DAY:         ['birth day', 'day of birth'],
  DOB_MONTH:       ['birth month', 'month of birth'],
  DOB_YEAR:        ['birth year', 'year of birth'],
  GENDER:          ['gender', 'sex', 'gender identity', 'sex type'],
  
  SAME_AS_PERMANENT: ['same as permanent', 'same as current', 'same as mailing', 'same as above'],
  SAME_AS_BILLING:   ['same as billing', 'residential', 'home', 'commercial', 'work'],
  SAME_AS_SHIPPING:  ['same as shipping'],
  
  // Unified Address Fields
  FULL_ADDRESS:    ['full address', 'default address', 'permanent address', 'current address', 'billing address', 'shipping address', 'work address', 'mailing address', 'home address', 'residential address', 'office address', 'delivery address', 'contact address', 'correspondence address', 'registered address', 'present address', 'temporary address', 'address'],
  ADDRESS_LINE1:   ['address line 1', 'address line 01', 'address1', 'address 1', 'address one', 'street address', 'street', 'primary address', 'house address', 'residential address line 1', 'addr 1', 'addr1', 'address'],
  ADDRESS_LINE2:   ['address line 2', 'address line 02', 'address2', 'address 2', 'address two', 'apartment', 'apartment number', 'flat', 'flat number', 'unit', 'unit number', 'suite', 'suite number', 'building', 'building number', 'floor', 'addr 2', 'addr2'],
  CITY:            ['city', 'city name', 'town', 'town name', 'municipality', 'locality', 'urban area'],
  STATE:           ['state', 'state name', 'province', 'province name', 'region', 'state/province', 'state/province/region', 'territory', 'district', 'county', 'sub district', 'taluk', 'tehsil'],
  ZIP_CODE:        ['pin', 'pin code', 'pincode', 'pin number', 'postal code', 'postal', 'postcode', 'zip', 'zip code', 'zipcode', 'zip number', 'zip/postal code', 'zip/postal', 'postal/zip code', 'zip4'],
  COUNTRY:         ['country', 'country name', 'country of residence', 'country/region', 'nation', 'country code'],

  UNKNOWN:         [],
};

// ─── Autocomplete Attribute Mappings ──────────────────────────────────────

export const AUTOCOMPLETE_MAP: Record<string, string> = {
  'given-name':        'FIRST_NAME',
  'middle-name':       'MIDDLE_NAME',
  'family-name':       'LAST_NAME',
  'name':              'FULL_NAME',
  'nickname':          'NICKNAME',
  'email':             'EMAIL',
  'tel':               'PHONE',
  'tel-national':      'PHONE',
  'tel-local':         'PHONE',
  'tel-country-code':  'COUNTRY_CODE',
  'street-address':    'ADDRESS_LINE1',
  'address-line1':     'ADDRESS_LINE1',
  'address-line2':     'ADDRESS_LINE2',
  'address-line3':     'ADDRESS_LINE2',
  'address-level3':    'CITY',
  'address-level2':    'CITY',
  'address-level1':    'STATE',
  'country':           'COUNTRY',
  'country-name':      'COUNTRY',
  'postal-code':       'ZIP_CODE',
  'bday':              'DOB',
  'bday-day':          'DOB_DAY',
  'bday-month':        'DOB_MONTH',
  'bday-year':         'DOB_YEAR',
  'sex':               'GENDER',
  'organization':      'UNKNOWN',
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

export const NEGATIVE_KEYWORDS: readonly string[] = [
  'model', 'subject', 'previous', 'destination', 'pickup', 'url', 'website', 'ip address', 'email address', 'company address', 'office address', 'destination address', 'pickup address'
] as const;

// ─── Default Settings ──────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: ExtensionSettings = {
  activeProfileId: null,
  autoDetectEnabled: true,
  theme: 'SYSTEM',
};

// ─── Storage Keys ─────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  PROFILES:  'sfa_profiles',
  SETTINGS:  'sfa_settings',
  SITE_RULES:'sfa_site_rules',
} as const;
