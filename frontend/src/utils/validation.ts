// Form validation utilities

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  
  if (password.length < 8 || password.length > 12) {
    errors.push("Password must be 8-12 characters long.");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Must contain uppercase letter.");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Must contain lowercase letter.");
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push("Must contain number.");
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Must contain special character.");
  }
  
  return errors;
};

export const validateName = (name: string): string | null => {
  if (!name || name.length < 2 || name.length > 70) {
    return "Name must be 2-70 characters.";
  }
  return null;
};

export const validatePhoneNumber = (phone: string): boolean => {
  // Basic phone number validation - can be enhanced
  return /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s/g, ''));
};
