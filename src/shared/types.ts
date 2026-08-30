// ─── Field Types ───────────────────────────────────────────────────────────

export type NameFieldType =
  | 'FIRST_NAME'
  | 'MIDDLE_NAME'
  | 'LAST_NAME'
  | 'FULL_NAME'
  | 'INITIALS';

export type AddressFieldType =
  | 'FULL_ADDRESS'
  | 'ADDRESS_LINE1'
  | 'ADDRESS_LINE2'
  | 'CITY'
  | 'STATE'
  | 'ZIP_CODE'
  | 'COUNTRY';

export type FieldType =
  | 'EMAIL'
  | 'PHONE'
  | 'COUNTRY_CODE'
  | 'DOB'
  | 'DOB_DAY'
  | 'DOB_MONTH'
  | 'DOB_YEAR'
  | 'GENDER'
  | 'SAME_AS_PERMANENT'
  | 'SAME_AS_BILLING'
  | 'SAME_AS_SHIPPING'
  | 'PARENT_NAME'
  | 'GUARDIAN_NAME'
  | 'FATHER_NAME'
  | 'MOTHER_NAME'
  | 'SCHOOL_NAME'
  | 'COLLEGE_NAME'
  | 'UNIVERSITY_NAME'
  | 'DEPARTMENT_NAME'
  | 'COURSE_NAME'
  | 'ROLL_NUMBER'
  | 'REGISTRATION_NUMBER'
  | 'UNKNOWN'
  | NameFieldType
  | AddressFieldType;

// ─── Profile ───────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;           // crypto.randomUUID()
  label: string;        // e.g. "Work", "Personal"
  data: Partial<Record<FieldType, string>>;
  createdAt: number;    // Unix timestamp (ms)
  updatedAt: number;
}

// ─── Form Fields ───────────────────────────────────────────────────────────

export interface FormField {
  id: string;                // Generated tracking id
  elementSelector: string;   // Unique CSS selector to locate the element
  nameAttr: string;
  idAttr: string;
  placeholderAttr: string;
  autocompleteAttr: string;
  ariaLabelAttr: string;
  tagType: 'INPUT' | 'TEXTAREA' | 'SELECT' | 'GOOGLE_FORM_FIELD';
  inputTypeAttr: string;
  labelText: string;
  surroundingText: string;
}

export interface DetectedField {
  field: FormField;
  matchedType: FieldType;
  confidenceScore: number;   // 0 – 100
  detectionSource: 'HEURISTICS' | 'AI' | 'AUTOCOMPLETE' | 'NONE';
}

// ─── Field Mapping ─────────────────────────────────────────────────────────

export interface FieldMapping {
  fieldId: string;        // Matches FormField.id
  elementSelector: string;
  profileValue: string;
  matchedType: FieldType;
}

// ─── Site Rules ────────────────────────────────────────────────────────────

export interface SiteRule {
  id: string;
  domainPattern: string;               // e.g. "example.com" or "*.example.com"
  preferredProfileId: string | null;   // null → use global active profile
  isDisabled: boolean;
  disabledFieldTypes: FieldType[];
}

// ─── Settings ──────────────────────────────────────────────────────────────

export interface ExtensionSettings {
  activeProfileId: string | null;
  aiEnabled: boolean;
  aiApiKey: string | null;
  autoDetectEnabled: boolean;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
}

// ─── Fill Result ───────────────────────────────────────────────────────────

export interface FillResult {
  formId: string;
  timestamp: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ fieldId: string; error: string }>;
}

// ─── AI ────────────────────────────────────────────────────────────────────

export interface AIFieldDetectionResult {
  predictedFields: Array<{
    fieldId: string;
    predictedType: FieldType;
    explanation?: string;
  }>;
}

// ─── Messaging ─────────────────────────────────────────────────────────────

export type MessageType =
  | 'GET_ACTIVE_PROFILE'
  | 'DETECT_FORM'
  | 'FILL_FORM'
  | 'SHOW_PREVIEW'
  | 'REQUEST_AI_CLASSIFICATION'
  | 'SAVE_PROFILE'
  | 'GET_SETTINGS';

export interface BaseMessage {
  type: MessageType;
}

export interface GetActiveProfileMessage extends BaseMessage {
  type: 'GET_ACTIVE_PROFILE';
}

export interface DetectFormMessage extends BaseMessage {
  type: 'DETECT_FORM';
}

export interface FillFormMessage extends BaseMessage {
  type: 'FILL_FORM';
  mappings: FieldMapping[];
}

export interface ShowPreviewMessage extends BaseMessage {
  type: 'SHOW_PREVIEW';
  mappings: FieldMapping[];
}

export interface RequestAIClassificationMessage extends BaseMessage {
  type: 'REQUEST_AI_CLASSIFICATION';
  fields: FormField[];
}

export interface SaveProfileMessage extends BaseMessage {
  type: 'SAVE_PROFILE';
  profile: UserProfile;
}

export interface GetSettingsMessage extends BaseMessage {
  type: 'GET_SETTINGS';
}

export type ExtensionMessage =
  | GetActiveProfileMessage
  | DetectFormMessage
  | FillFormMessage
  | ShowPreviewMessage
  | RequestAIClassificationMessage
  | SaveProfileMessage
  | GetSettingsMessage;
