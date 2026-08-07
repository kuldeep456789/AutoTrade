export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export interface PasswordValidationError {
  code: string;
  message: string;
}

export const PASSWORD_RULES = {
  lower: { regex: /(?=.*[a-z])/, label: 'at least one lowercase letter' },
  upper: { regex: /(?=.*[A-Z])/, label: 'at least one uppercase letter' },
  number: { regex: /(?=.*\d)/, label: 'at least one number' },
  special: {
    regex: /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
    label: 'at least one special character',
  },
} as const;

export interface PasswordRuleStatus {
  lower: boolean;
  upper: boolean;
  number: boolean;
  special: boolean;
  length: boolean;
}

export function getPasswordRuleStatus(password: string): PasswordRuleStatus {
  return {
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    length:
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH,
  };
}

export function validatePassword(
  password: string,
): PasswordValidationError | null {
  if (!password) {
    return { code: 'required', message: 'Password is required' };
  }
  if (password.trim() !== password) {
    return {
      code: 'whitespace',
      message: 'Password cannot start or end with spaces',
    };
  }
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return {
      code: 'length',
      message: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`,
    };
  }
  const status = getPasswordRuleStatus(password);
  if (!status.lower)
    return {
      code: 'lower',
      message: 'Password must contain at least one lowercase letter',
    };
  if (!status.upper)
    return {
      code: 'upper',
      message: 'Password must contain at least one uppercase letter',
    };
  if (!status.number)
    return {
      code: 'number',
      message: 'Password must contain at least one number',
    };
  if (!status.special)
    return {
      code: 'special',
      message: 'Password must contain at least one special character',
    };
  return null;
}