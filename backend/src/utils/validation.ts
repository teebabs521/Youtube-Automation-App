export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateYouTubeChannelId(id: string): boolean {
  return /^UC[a-zA-Z0-9_-]{22}$/.test(id) || /^@[\w-]+$/.test(id);
}

export function validateYouTubeVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

export function sanitize(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function validateRequired(fields: { [key: string]: any }): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      errors.push(`${key} is required`);
    }
  });
  return { valid: errors.length === 0, errors };
}
