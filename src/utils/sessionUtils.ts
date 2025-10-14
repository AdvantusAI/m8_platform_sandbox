import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  sub?: string;
  session_id?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Decodes and validates a JWT token
 * @param token - The JWT token to decode
 * @returns The decoded payload or null if invalid
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Checks if a JWT token is expired
 * @param token - The JWT token to check
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

/**
 * Extracts session_id from JWT token
 * @param token - The JWT token
 * @returns The session_id or null if not found
 */
export function getSessionIdFromToken(token: string): string | null {
  const decoded = decodeJWT(token);
  return decoded?.session_id || null;
}

/**
 * Validates if a session token has the required claims
 * @param token - The JWT token to validate
 * @returns true if valid, false otherwise
 */
export function validateSessionToken(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded) {
    return false;
  }
  
  // Check if token has required claims
  if (!decoded.sub || !decoded.session_id) {
    return false;
  }
  
  // Check if token is not expired
  if (isTokenExpired(token)) {
    return false;
  }
  
  return true;
}
