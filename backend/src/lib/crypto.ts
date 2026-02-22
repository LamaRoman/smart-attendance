import crypto from 'crypto';
import { config } from '../config';

// ============================================================
// QR Token Generation & Verification
// Uses QR_SECRET — completely separate from JWT_SECRET
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
    // Buffers of different lengths will throw — means signature is invalid
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

// ============================================================
// TOTP Utilities (for Phase 2+ QR rotation)
// ============================================================

// Generate a random TOTP secret (Base32 encoded)
export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

// Generate current TOTP code from a secret
export function generateTOTPCode(
  secret: string,
  timeStep: number = 30,
  now: number = Math.floor(Date.now() / 1000)
): string {
  const counter = Math.floor(now / timeStep);
  return hmacCounter(secret, counter);
}

// Verify a TOTP code (checks current + previous window for clock drift)
export function verifyTOTPCode(
  code: string,
  secret: string,
  timeStep: number = 30,
  window: number = 1
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(now / timeStep);

  for (let i = -window; i <= window; i++) {
    const expected = hmacCounter(secret, currentCounter + i);
    try {
      if (crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected))) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

// ---- Internal helpers ----

function hmacCounter(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto
    .createHmac('sha1', base32Decode(secret))
    .update(buffer)
    .digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, '0');
}

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const lookup: Record<string, number> = {};
  for (let i = 0; i < BASE32_CHARS.length; i++) {
    lookup[BASE32_CHARS[i]] = i;
  }

  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of encoded.toUpperCase()) {
    if (lookup[char] === undefined) continue;
    value = (value << 5) | lookup[char];
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}
