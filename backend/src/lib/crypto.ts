import crypto from 'crypto';
import { config } from '../config';

// ============================================================
// QR Token Generation & Verification
// Uses QR_SECRET -- completely separate from JWT_SECRET
// ============================================================

// Generate a random token for QR code
export function generateQRToken(): string {
  return crypto.randomUUID();
}

// Sign the token with HMAC-SHA256 using QR_SECRET
export function signQRToken(token: string): string {
  return crypto
    .createHmac('sha256', config.QR_SECRET)
    .update(token)
    .digest('hex');
}

// Verify the signature (timing-safe comparison)
export function verifyQRSignature(token: string, signature: string): boolean {
  const expectedSignature = signQRToken(token);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    // Buffers of different lengths will throw -- means signature is invalid
    return false;
  }
}

// Create QR payload (what gets encoded in the QR code)
export function createQRPayload(token: string, signature: string): string {
  return JSON.stringify({ token, signature });
}

// Parse QR payload
export function parseQRPayload(
  payload: string
): { token: string; signature: string } | null {
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed.token === 'string' && typeof parsed.signature === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}