/**
 * Global QZ Tray Security Initializer
 * Handles QZ Tray security setup once globally to prevent repeated prompts
 */

declare global {
  interface Window {
    qz: any;
  }
}

interface QZGlobalConfig {
  certificate?: string;
  privateKey?: string;
}

class QZGlobal {
  private static instance: QZGlobal;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {}

  static getInstance(): QZGlobal {
    if (!QZGlobal.instance) {
      QZGlobal.instance = new QZGlobal();
    }
    return QZGlobal.instance;
  }

  /**
   * Initialize QZ Tray security globally - call this once at app startup
   */
  async initializeGlobally(config?: QZGlobalConfig): Promise<boolean> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return true if already initialized
    if (this.isInitialized) {
      return true;
    }

    this.initPromise = this._performInitialization(config);
    return this.initPromise;
  }

  private async _performInitialization(config?: QZGlobalConfig): Promise<boolean> {
    try {
      // Wait for QZ Tray to be available
      await this.waitForQZ();

      console.log('🌐 Initializing QZ Tray security globally...');

      // Get saved certificate or use provided one
      const savedCert = this.getSavedCertificate();
      const certificate = config?.certificate || savedCert?.certificate;
      const privateKey = config?.privateKey || savedCert?.privateKey;

      if (certificate && privateKey) {
        // Use custom certificate
        console.log('🔐 Using custom certificate for QZ signing');
        this.setupCustomCertificate(certificate, privateKey);
      } else {
        // Use null promises for unsigned mode
        console.log('🔓 Using unsigned mode for QZ (will prompt for trust)');
        this.setupUnsignedMode();
      }

      this.isInitialized = true;
      console.log('✅ QZ Tray security initialized globally');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize QZ Tray security:', error);
      this.initPromise = null; // Reset so we can retry
      return false;
    }
  }

  private async waitForQZ(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds
      
      const checkQZ = () => {
        attempts++;
        if (window.qz && window.qz.websocket) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('QZ Tray not available after 5 seconds'));
        } else {
          setTimeout(checkQZ, 100);
        }
      };
      
      checkQZ();
    });
  }

  private setupCustomCertificate(certificate: string, privateKey: string): void {
    window.qz.security.setCertificatePromise((resolve: Function, reject: Function) => {
      resolve(certificate);
    });

    window.qz.security.setSignaturePromise((toSign: string, resolve: Function, reject: Function) => {
      try {
        // In a real implementation, you would sign the data with the private key
        // For demo purposes, we'll use a simplified approach
        const signature = this.signData(toSign, privateKey);
        resolve(signature);
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupUnsignedMode(): void {
    // Use proper null/undefined promises for unsigned mode
    window.qz.security.setCertificatePromise((resolve: Function, reject: Function) => {
      resolve(null); // Explicitly pass null for no certificate
    });

    window.qz.security.setSignaturePromise((toSign: string, resolve: Function, reject: Function) => {
      resolve(null); // Explicitly pass null for no signature
    });
  }

  private signData(data: string, privateKey: string): string {
    // Simplified signing - in production, use proper crypto library
    // For demo purposes, return empty string (unsigned mode)
    return "";
  }

  private getSavedCertificate(): { certificate: string; privateKey: string } | null {
    try {
      const cert = localStorage.getItem('qz_certificate');
      const key = localStorage.getItem('qz_private_key');
      
      if (cert && key) {
        return { certificate: cert, privateKey: key };
      }
    } catch (error) {
      console.warn('Failed to load saved certificate:', error);
    }
    return null;
  }

  /**
   * Save custom certificate for future use
   */
  saveCertificate(certificate: string, privateKey: string): void {
    try {
      localStorage.setItem('qz_certificate', certificate);
      localStorage.setItem('qz_private_key', privateKey);
      console.log('💾 Certificate saved successfully');
    } catch (error) {
      console.error('Failed to save certificate:', error);
    }
  }

  /**
   * Clear saved certificate
   */
  clearSavedCertificate(): void {
    try {
      localStorage.removeItem('qz_certificate');
      localStorage.removeItem('qz_private_key');
      console.log('🗑️ Certificate cleared');
    } catch (error) {
      console.error('Failed to clear certificate:', error);
    }
  }

  /**
   * Check if QZ security has been initialized
   */
  isSecurityInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const qzGlobal = QZGlobal.getInstance();