/**
 * Scan lockout — per-employeeId brute-force protection for
 * scan-public and mobile-checkin endpoints.
 *
 * FIX S-03: The existing scanRateLimiter is per-IP. PINs are 4-6
 * digits (10k-1M combos). An attacker rotating IPs can brute-force
 * any employee's PIN. This module adds per-employeeId lockout.
 *
 * Uses an in-memory map. For multi-instance deployments, replace
 * with Redis (same pattern as the email lockout if you have one).
 */

import { ValidationError } from './errors';
import { createLogger } from '../logger';

const log = createLogger('scan-lockout');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

const scanLockouts = new Map<string, LockoutEntry>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of scanLockouts) {
    // Remove entries that have been idle for over an hour
    if (now - entry.lastAttemptAt > 60 * 60 * 1000) {
      scanLockouts.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check if an employeeId is locked out. Throws if locked.
 */
export function checkScanLockout(employeeId: string): void {
  const key = employeeId.toUpperCase();
  const entry = scanLockouts.get(key);
  if (!entry) return;

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    log.warn({ employeeId: key, remainingMinutes }, 'Scan attempt while locked out');
    throw new ValidationError(
      `Too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
      'SCAN_LOCKED_OUT'
    );
  }

  // Lockout expired — reset
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    scanLockouts.delete(key);
  }
}

/**
 * Record a failed scan attempt (wrong PIN). Locks out after MAX_FAILED_ATTEMPTS.
 */
export function recordFailedScanAttempt(employeeId: string): void {
  const key = employeeId.toUpperCase();
  const entry = scanLockouts.get(key) || { failedAttempts: 0, lockedUntil: null, lastAttemptAt: 0 };

  entry.failedAttempts += 1;
  entry.lastAttemptAt = Date.now();

  if (entry.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    log.warn({ employeeId: key, attempts: entry.failedAttempts }, 'Employee scan locked out');
  }

  scanLockouts.set(key, entry);
}

/**
 * Clear failed attempts after a successful scan.
 */
export function clearFailedScanAttempts(employeeId: string): void {
  scanLockouts.delete(employeeId.toUpperCase());
}