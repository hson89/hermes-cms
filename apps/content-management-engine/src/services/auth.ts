/**
 * Authentication and authorization utilities for internal service-to-service communication.
 * Satisfies T002.
 */

/**
 * Retrieves the configured internal service secret.
 */
export function getInternalSecret(): string {
  return process.env.INTERNAL_SERVICE_SECRET || 'hermes-internal-secret';
}

/**
 * Validates that the provided secret matches the configured internal service secret.
 */
export function verifyInternalSecret(secret: string | null): boolean {
  if (!secret) return false;
  return secret === getInternalSecret();
}

/**
 * Reusable headers for calling external internal services (like the AI microservice).
 */
export function getInternalAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Secret': getInternalSecret(),
  };
}
