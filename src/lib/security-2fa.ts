/**
 * OMNI-CRM Two-Factor Authentication Service
 * TOTP (Time-based One-Time Password) Implementation
 */

import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

interface TwoFactorVerify {
  valid: boolean;
  remainingAttempts?: number;
}

// ============================================
// CONSTANTS
// ============================================

const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // Allow 1 step before/after
const TOTP_STEP = 30; // 30 seconds
const BACKUP_CODES_COUNT = 10;

// ============================================
// TOTP SERVICE CLASS
// ============================================

class TwoFactorService {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'omni-crm-2fa-key';
  }

  /**
   * Generate a new TOTP secret for user
   */
  generateSecret(userId: string, email: string): TwoFactorSetup {
    // Generate random secret (20 bytes = 160 bits)
    const secret = crypto.randomBytes(20).toString('base64').replace(/[=+\/]/g, '').substring(0, 32);
    
    // Generate QR Code URL
    const issuer = encodeURIComponent('OMNI-CRM');
    const accountName = encodeURIComponent(email);
    const qrCodeUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code
   */
  verifyToken(secret: string, token: string): TwoFactorVerify {
    if (!token || token.length !== TOTP_DIGITS) {
      return { valid: false, remainingAttempts: 3 };
    }

    const currentTime = Math.floor(Date.now() / 1000 / TOTP_STEP);
    
    // Check current and adjacent windows
    for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
      const expectedToken = this.generateTOTP(secret, currentTime + i);
      if (this.safeCompare(token, expectedToken)) {
        return { valid: true };
      }
    }

    return { valid: false, remainingAttempts: 3 };
  }

  /**
   * Generate TOTP for a specific time step
   */
  private generateTOTP(secret: string, timeStep: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(timeStep), 0);
    
    const key = Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buffer);
    
    const hmacResult = hmac.digest();
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    
    const code = (
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff)
    ) % Math.pow(10, TOTP_DIGITS);
    
    return code.toString().padStart(TOTP_DIGITS, '0');
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(backupCodes: string[], code: string): { valid: boolean; remainingCodes: string[] } {
    const index = backupCodes.indexOf(code);
    if (index === -1) {
      return { valid: false, remainingCodes: backupCodes };
    }
    
    const remainingCodes = [...backupCodes];
    remainingCodes.splice(index, 1);
    
    return { valid: true, remainingCodes };
  }

  /**
   * Safe string comparison (timing-safe)
   */
  private safeCompare(a: string, b: string): boolean {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(a.padEnd(TOTP_DIGITS, '0')),
        Buffer.from(b.padEnd(TOTP_DIGITS, '0'))
      );
    } catch {
      return false;
    }
  }

  /**
   * Hash backup codes for storage
   */
  hashBackupCodes(codes: string[]): string[] {
    return codes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );
  }

  /**
   * Encrypt secret for storage
   */
  encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, '2fa-salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt secret from storage
   */
  decryptSecret(encryptedSecret: string): string {
    const [ivHex, encrypted] = encryptedSecret.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(this.encryptionKey, '2fa-salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// ============================================
// SESSION SECURITY
// ============================================

interface SecureSession {
  id: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
  twoFactorVerified: boolean;
}

class SessionSecurityService {
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_SESSIONS_PER_USER = 5;

  /**
   * Create a new secure session
   */
  async createSession(params: {
    userId: string;
    deviceId: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<SecureSession> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT);

    return {
      id: crypto.randomBytes(32).toString('hex'),
      userId: params.userId,
      deviceId: params.deviceId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
      isActive: true,
      twoFactorVerified: false,
    };
  }

  /**
   * Validate session
   */
  validateSession(session: SecureSession): { valid: boolean; reason?: string } {
    if (!session.isActive) {
      return { valid: false, reason: 'Session is inactive' };
    }

    if (new Date() > session.expiresAt) {
      return { valid: false, reason: 'Session has expired' };
    }

    return { valid: true };
  }

  /**
   * Refresh session expiry
   */
  refreshSession(session: SecureSession): SecureSession {
    return {
      ...session,
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
    };
  }

  /**
   * Generate secure token
   */
  generateToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }
}

// Export singleton instances
export const twoFactorService = new TwoFactorService();
export const sessionSecurityService = new SessionSecurityService();
