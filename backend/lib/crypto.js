const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

if (!process.env.RELAYER_SECRET) {
  console.warn('Warning: RELAYER_SECRET not set. Order encryption will fail.');
}

const KEY = process.env.RELAYER_SECRET
  ? crypto.scryptSync(process.env.RELAYER_SECRET, 'darx-salt-v1', 32)
  : null;

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string in the format: iv:authTag:ciphertext (all hex-encoded)
 */
function encrypt(text) {
  if (!KEY) throw new Error('RELAYER_SECRET not configured');
  const str = String(text);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(str, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string produced by encrypt().
 * Expects format: iv:authTag:ciphertext (all hex-encoded)
 */
function decrypt(encrypted) {
  if (!KEY) throw new Error('RELAYER_SECRET not configured');
  const parts = encrypted.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  const [ivHex, tagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const ENCRYPTED_FIELDS = ['side', 'size', 'price', 'order_value', 'filled'];

/**
 * Encrypt sensitive fields of an order object (mutates a copy).
 * Non-sensitive fields (id, user_address, status, asset, etc.) are left as-is.
 */
function encryptOrder(order) {
  const encrypted = { ...order };
  for (const field of ENCRYPTED_FIELDS) {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      encrypted[field] = encrypt(String(encrypted[field]));
    }
  }
  return encrypted;
}

/**
 * Decrypt sensitive fields of an order object (mutates a copy).
 * Returns the order with plaintext values restored.
 */
function decryptOrder(order) {
  const decrypted = { ...order };
  for (const field of ENCRYPTED_FIELDS) {
    if (decrypted[field] !== undefined && decrypted[field] !== null) {
      try {
        const val = decrypt(String(decrypted[field]));
        if (['size', 'price', 'order_value', 'filled'].includes(field)) {
          decrypted[field] = parseFloat(val);
        } else {
          decrypted[field] = val;
        }
      } catch {
        // Field may not be encrypted (legacy data), leave as-is
      }
    }
  }
  return decrypted;
}

/**
 * Decrypt an array of orders.
 */
function decryptOrders(orders) {
  return orders.map(decryptOrder);
}

module.exports = { encrypt, decrypt, encryptOrder, decryptOrder, decryptOrders, ENCRYPTED_FIELDS };
