/**
 * OMNI-CRM Security Module
 * Double-Layer Base64 Encryption + Device Fingerprinting
 */

import * as crypto from 'crypto';

// ============================================
// ENCRYPTION CONSTANTS
// ============================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'omni-crm-secret-key-2024';
const IV_LENGTH = 16;

// ============================================
// DOUBLE-LAYER BASE64 ENCRYPTION
// ============================================

/**
 * Layer 1: AES-256-CBC Encryption
 * Layer 2: Base64 Encoding
 */
export function encryptData(data: string): string {
  try {
    // Layer 1: AES Encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV + encrypted data
    const combined = iv.toString('hex') + ':' + encrypted;
    
    // Layer 2: Double Base64 Encoding
    const base64Layer1 = Buffer.from(combined).toString('base64');
    const base64Layer2 = Buffer.from(base64Layer1).toString('base64');
    
    return base64Layer2;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt Double-Layer Base64 Encrypted Data
 */
export function decryptData(encryptedData: string): string {
  try {
    // Layer 2: Double Base64 Decoding
    const base64Layer1 = Buffer.from(encryptedData, 'base64').toString('utf8');
    const combined = Buffer.from(base64Layer1, 'base64').toString('utf8');
    
    // Split IV and encrypted data
    const [ivHex, encrypted] = combined.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    // Layer 1: AES Decryption
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// ============================================
// DEVICE FINGERPRINT (HID - Hardware ID)
// ============================================

export interface DeviceFingerprint {
  hardwareId: string;
  deviceName?: string;
  deviceType?: string;
  osType?: string;
  browserType?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  canvas?: string;
  webgl?: string;
}

/**
 * Generate Hardware ID from device characteristics
 */
export function generateHardwareId(fingerprint: Omit<DeviceFingerprint, 'hardwareId'>): string {
  const components = [
    fingerprint.deviceName || '',
    fingerprint.deviceType || '',
    fingerprint.osType || '',
    fingerprint.browserType || '',
    fingerprint.screenResolution || '',
    fingerprint.timezone || '',
    fingerprint.language || '',
    fingerprint.canvas || '',
    fingerprint.webgl || '',
  ].join('|');
  
  // Create SHA-256 hash of components
  const hash = crypto.createHash('sha256').update(components).digest('hex');
  
  // Format as UUID-like string
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32),
  ].join('-').toUpperCase();
}

/**
 * Verify device fingerprint matches stored HID
 */
export function verifyHardwareId(
  storedHid: string, 
  fingerprint: Omit<DeviceFingerprint, 'hardwareId'>
): boolean {
  const generatedHid = generateHardwareId(fingerprint);
  return storedHid === generatedHid;
}

// ============================================
// REQUEST SIGNATURE
// ============================================

/**
 * Sign API request with timestamp and signature
 */
export function signRequest(payload: string, timestamp: number): string {
  const data = `${payload}:${timestamp}:${ENCRYPTION_KEY}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify API request signature
 */
export function verifyRequestSignature(
  payload: string, 
  timestamp: number, 
  signature: string,
  maxAgeMs: number = 300000 // 5 minutes
): { valid: boolean; error?: string } {
  // Check timestamp age
  const now = Date.now();
  if (Math.abs(now - timestamp) > maxAgeMs) {
    return { valid: false, error: 'Request expired' };
  }
  
  // Verify signature
  const expectedSignature = signRequest(payload, timestamp);
  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }
  
  return { valid: true };
}

// ============================================
// PASSWORD UTILITIES
// ============================================

/**
 * Hash password with bcrypt-like approach
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate session token
 */
export function generateSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(24).toString('hex');
  return `${timestamp}.${random}`;
}

// ============================================
// IP & USER AGENT UTILITIES
// ============================================

/**
 * Parse user agent string
 */
export function parseUserAgent(userAgent: string): {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
} {
  const result = {
    browser: 'Unknown',
    browserVersion: '',
    os: 'Unknown',
    osVersion: '',
    deviceType: 'desktop',
  };
  
  // Detect browser
  if (userAgent.includes('Firefox/')) {
    result.browser = 'Firefox';
    result.browserVersion = userAgent.match(/Firefox\/(\d+\.?\d*)/)?.[1] || '';
  } else if (userAgent.includes('Edg/')) {
    result.browser = 'Edge';
    result.browserVersion = userAgent.match(/Edg\/(\d+\.?\d*)/)?.[1] || '';
  } else if (userAgent.includes('Chrome/')) {
    result.browser = 'Chrome';
    result.browserVersion = userAgent.match(/Chrome\/(\d+\.?\d*)/)?.[1] || '';
  } else if (userAgent.includes('Safari/')) {
    result.browser = 'Safari';
    result.browserVersion = userAgent.match(/Version\/(\d+\.?\d*)/)?.[1] || '';
  }
  
  // Detect OS
  if (userAgent.includes('Windows NT 10')) {
    result.os = 'Windows';
    result.osVersion = '10';
  } else if (userAgent.includes('Windows NT 6.3')) {
    result.os = 'Windows';
    result.osVersion = '8.1';
  } else if (userAgent.includes('Mac OS X')) {
    result.os = 'macOS';
    result.osVersion = userAgent.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
  } else if (userAgent.includes('Android')) {
    result.os = 'Android';
    result.osVersion = userAgent.match(/Android (\d+\.?\d*)/)?.[1] || '';
    result.deviceType = 'mobile';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    result.os = 'iOS';
    result.osVersion = userAgent.match(/OS (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
    result.deviceType = userAgent.includes('iPad') ? 'tablet' : 'mobile';
  } else if (userAgent.includes('Linux')) {
    result.os = 'Linux';
  }
  
  return result;
}

/**
 * Validate IP address format
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }
  
  return ipv6Regex.test(ip);
}

// ============================================
// ENCRYPT API RESPONSE WRAPPER
// ============================================

/**
 * Encrypt and wrap API response
 */
export function secureResponse(data: unknown): { encrypted: string; timestamp: number } {
  const payload = JSON.stringify(data);
  const encrypted = encryptData(payload);
  return {
    encrypted,
    timestamp: Date.now(),
  };
}

/**
 * Decrypt and parse API request body
 */
export function parseSecureRequest(encryptedBody: string): unknown {
  const decrypted = decryptData(encryptedBody);
  return JSON.parse(decrypted);
}
