// Validation rules constants

export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHAR: true,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 70,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    PATTERN: /^[\+]?[1-9][\d]{0,15}$/,
  },
} as const;

export const BOROUGHS = [
  'All Boroughs',
  'Manhattan',
  'Brooklyn',
  'Queens',
  'Bronx',
  'Staten Island',
] as const;

export const RISK_LEVELS = [
  'Low Risk',
  'Moderate Risk',
  'High Risk',
] as const;

export const USER_ROLES = [
  'tenant',
  'landlord',
] as const;

export const TENANT_TYPES = [
  'student',
  'working_professional',
  'other',
] as const;

export const LANDLORD_TYPES = [
  'individual_owner',
  'property_management',
  'real_estate_agent',
  'corporate_landlord',
] as const;
