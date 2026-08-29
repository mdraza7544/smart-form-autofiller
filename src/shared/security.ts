// ─── SecurityService ───────────────────────────────────────────────────────
// AES-256-GCM encryption/decryption for profile import/export.
// Uses PBKDF2 for key derivation from user-supplied password.

export class SecurityService {
  private readonly SALT_LENGTH = 16;
  private readonly IV_LENGTH   = 12;
  private readonly ITERATIONS  = 100_000;

  /**
   * Encrypts a string using AES-256-GCM with a user password.
   * Returns: Uint8Array = [salt(16) | iv(12) | ciphertext(...)]
   */
  async encrypt(data: string, password: string): Promise<Uint8Array<ArrayBuffer>> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH)) as Uint8Array<ArrayBuffer>;
    const iv   = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH)) as Uint8Array<ArrayBuffer>;

    const key = await this.deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data),
    );

    // Concatenate: salt + iv + ciphertext
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength) as Uint8Array<ArrayBuffer>;
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    return result;
  }

  /**
   * Decrypts data encrypted by encrypt().
   * Throws on wrong password or corrupted data.
   */
  async decrypt(buffer: Uint8Array<ArrayBuffer>, password: string): Promise<string> {
    const salt       = buffer.slice(0, this.SALT_LENGTH) as Uint8Array<ArrayBuffer>;
    const iv         = buffer.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH) as Uint8Array<ArrayBuffer>;
    const ciphertext = buffer.slice(this.SALT_LENGTH + this.IV_LENGTH) as Uint8Array<ArrayBuffer>;

    const key = await this.deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(decrypted);
  }

  // ── Key Derivation ────────────────────────────────────────────────────

  private async deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: this.ITERATIONS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }
}

export const securityService = new SecurityService();
