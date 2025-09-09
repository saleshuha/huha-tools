interface StoredCertificate {
  certificate: string;
  privateKey: string;
  fingerprint: string;
  commonName: string;
  createdAt: string;
  expiresAt: string;
}

interface CertificateStatus {
  hasCustomCertificate: boolean;
  hasBuiltInCertificate: boolean;
  currentCertificate: StoredCertificate | null;
  isExpired: boolean;
}

export class QZCertificateManager {
  private static readonly STORAGE_KEY = 'qz-tray-certificate';
  private static readonly DEV_CERT_KEY = 'qz-tray-dev-cert';
  
  // Built-in development certificate (consistent across sessions)
  private static readonly DEV_CERTIFICATE = {
    certificate: `-----BEGIN CERTIFICATE-----
MIIEFTCCAv2gAwIBAgIUDEV123456789ABCDEFwDQYJKoZIhvcNAQELBQAwgagx
CzAJBgNVBAYTAlVTMRIwEAYDVQQIDAlsb2NhbGhvc3QxEjAQBgNVBAcMCWxvY2Fs
aG9zdDEaMBgGA1UECgwRTGFiZWwgUHJpbnRpbmcgQXBwMRMwEQYDVQQLDApEZXZl
bG9wbWVudDESMBAGA1UEAwwJbG9jYWxob3N0MR4wHAYJKoZIhvcNAQkBFg9kZXZA
bGFiZWxhcHAuY29tMB4XDTIzMDEwMTAwMDAwMFoXDTI1MDEwMTAwMDAwMFowgagx
CzAJBgNVBAYTAlVTMRIwEAYDVQQIDAlsb2NhbGhvc3QxEjAQBgNVBAcMCWxvY2Fs
aG9zdDEaMBgGA1UECgwRTGFiZWwgUHJpbnRpbmcgQXBwMRMwEQYDVQQLDApEZXZl
bG9wbWVudDESMBAGA1UEAwwJbG9jYWxob3N0MR4wHAYJKoZIhvcNAQkBFg9kZXZA
bGFiZWxhcHAuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234
567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456
789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789A
BCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789ABCDEF
GHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJ
KLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKLMN
OPQRSTUVWXYZ
-----END CERTIFICATE-----`,
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDXYZ123456789A
BCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789ABCD
EFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789ABCDEFG
HIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJ
KLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKLM
NOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKLMNOP
QRSTUVWXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr
stuvwxyz123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEFGHIJ
KLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789ABCDEFGHIJKL
MNOPQRSTUVWXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789ABC
DEFGHIJKLMNOPQRSTUVWXYZ123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234
56789ABCDEFGHIJKLMNOPQRSTUVWXYZ
-----END PRIVATE KEY-----`,
    fingerprint: 'AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD',
    commonName: 'localhost',
    createdAt: '2023-01-01T00:00:00Z',
    expiresAt: '2025-01-01T00:00:00Z'
  };

  /**
   * Get the current certificate status
   */
  static getCertificateStatus(): CertificateStatus {
    const customCert = this.getStoredCertificate();
    const devCert = this.getDevCertificate();
    
    const currentCert = customCert || devCert;
    const isExpired = currentCert ? new Date(currentCert.expiresAt) < new Date() : true;
    
    return {
      hasCustomCertificate: !!customCert,
      hasBuiltInCertificate: !!devCert,
      currentCertificate: currentCert,
      isExpired
    };
  }

  /**
   * Get stored custom certificate
   */
  static getStoredCertificate(): StoredCertificate | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get stored certificate:', error);
      return null;
    }
  }

  /**
   * Store a custom certificate
   */
  static storeCertificate(certificate: StoredCertificate): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(certificate));
      console.log('✅ Certificate stored successfully');
    } catch (error) {
      console.error('Failed to store certificate:', error);
      throw new Error('Failed to store certificate');
    }
  }

  /**
   * Get development certificate (creates if not exists)
   */
  static getDevCertificate(): StoredCertificate | null {
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (!isDev) return null;

    try {
      let devCert = localStorage.getItem(this.DEV_CERT_KEY);
      
      if (!devCert) {
        // Create dev certificate with consistent identity
        const certData = {
          ...this.DEV_CERTIFICATE,
          commonName: hostname
        };
        localStorage.setItem(this.DEV_CERT_KEY, JSON.stringify(certData));
        console.log('🔧 Created development certificate for', hostname);
        return certData;
      }
      
      return JSON.parse(devCert);
    } catch (error) {
      console.error('Failed to get development certificate:', error);
      return null;
    }
  }

  /**
   * Get the best available certificate (custom first, then dev)
   */
  static getBestCertificate(): StoredCertificate | null {
    const status = this.getCertificateStatus();
    
    // Prefer custom certificate if available and not expired
    if (status.hasCustomCertificate && !status.isExpired) {
      return this.getStoredCertificate();
    }
    
    // Fall back to development certificate
    if (status.hasBuiltInCertificate) {
      return this.getDevCertificate();
    }
    
    return null;
  }

  /**
   * Clear stored custom certificate
   */
  static clearStoredCertificate(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Cleared stored certificate');
    } catch (error) {
      console.error('Failed to clear certificate:', error);
    }
  }

  /**
   * Clear development certificate
   */
  static clearDevCertificate(): void {
    try {
      localStorage.removeItem(this.DEV_CERT_KEY);
      console.log('🗑️ Cleared development certificate');
    } catch (error) {
      console.error('Failed to clear dev certificate:', error);
    }
  }

  /**
   * Clear all certificates
   */
  static clearAllCertificates(): void {
    this.clearStoredCertificate();
    this.clearDevCertificate();
  }

  /**
   * Import certificate from generated data
   */
  static importGeneratedCertificate(certificate: any, commonName: string): void {
    const storedCert: StoredCertificate = {
      certificate: certificate.certificate,
      privateKey: certificate.privateKey,
      fingerprint: certificate.fingerprint,
      commonName,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    };
    
    this.storeCertificate(storedCert);
  }

  /**
   * Check if certificate needs renewal (within 30 days of expiry)
   */
  static needsRenewal(): boolean {
    const status = this.getCertificateStatus();
    if (!status.currentCertificate) return true;
    
    const expiryDate = new Date(status.currentCertificate.expiresAt);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    return expiryDate < thirtyDaysFromNow;
  }
}