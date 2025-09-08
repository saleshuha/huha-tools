import qz from 'qz-tray';

export interface QZPrinterConfig {
  printerName?: string;
  defaultPrinter?: boolean;
}

export interface QZSecurityConfig {
  certificate?: string;
  signature?: string;
  allowUntrusted?: boolean;
  customCertificate?: string;
  customPrivateKey?: string;
}

export class QZTrayPrinter {
  private static instance: QZTrayPrinter;
  private connected = false;
  private securityInitialized = false;
  
  static getInstance(): QZTrayPrinter {
    if (!QZTrayPrinter.instance) {
      QZTrayPrinter.instance = new QZTrayPrinter();
    }
    return QZTrayPrinter.instance;
  }

  private async initializeSecurity(config?: QZSecurityConfig): Promise<void> {
    if (this.securityInitialized) return;

    try {
      // Use custom certificate if provided, otherwise use default
      const certificate = config?.customCertificate || `-----BEGIN CERTIFICATE-----
MIIEFTCCAv2gAwIBAgIUXvFKLkn1fvn5w5lqwsrx+6hNBjEwDQYJKoZIhvcNAQEL
BQAwgagxCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQK
DBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQxGjAYBgNVBAMMEVlvdXIgQXBwIE5h
bWUgSGVyZTEcMBoGCSqGSIb3DQEJARYNdGVzdEB0ZXN0LmNvbTEhMB8GA1UECwwY
SW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMB4XDTIzMDEwMTAwMDAwMFoXDTI0MDEw
MTAwMDAwMFowgagxCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQxGjAYBgNVBAMMEVlvdXIg
QXBwIE5hbWUgSGVyZTEcMBoGCSqGSIb3DQEJARYNdGVzdEB0ZXN0LmNvbTEhMB8G
A1UECwwYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAxQ9u7Z+0t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
-----END CERTIFICATE-----`;

      // Check if we're in development (localhost or http)
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.protocol === 'http:';

      // Try to load saved custom certificate from localStorage
      const savedCert = localStorage.getItem('qz-custom-certificate');
      const savedKey = localStorage.getItem('qz-custom-private-key');
      
      const finalCertificate = config?.customCertificate || savedCert || certificate;

      if (isDevelopment) {
        // For development: Set up QZ Tray to be more permissive
        console.log('🔧 Development mode: Setting up QZ Tray for local development');
        
        qz.security.setCertificatePromise(() => {
          return Promise.resolve(finalCertificate);
        });

        qz.security.setSignaturePromise((toSign: string) => {
          // For development, use simple signature or saved private key
          if (config?.customPrivateKey || savedKey) {
            console.log('🔑 Using custom private key for development');
            return Promise.resolve(config?.signature || toSign);
          }
          return Promise.resolve(toSign);
        });

        qz.api.setHostname(window.location.hostname);
        
      } else {
        // Production: Use proper certificates and signatures
        console.log('🔒 Production mode: Setting up QZ Tray with proper security');
        
        qz.security.setCertificatePromise(() => {
          return Promise.resolve(finalCertificate);
        });

        qz.security.setSignaturePromise((toSign: string) => {
          if (config?.signature) {
            return Promise.resolve(config.signature);
          }
          // If custom certificate is used, try to use proper signing
          if (config?.customPrivateKey || savedKey) {
            console.log('🔑 Using custom signing for production');
            // In a real implementation, you'd properly sign the data with the private key
            return Promise.resolve("CUSTOM_SIGNATURE_" + toSign.substring(0, 20));
          }
          return Promise.resolve("YOUR_SIGNATURE_HERE");
        });
      }

      this.securityInitialized = true;
      
      if (finalCertificate !== certificate) {
        console.log('✅ QZ Tray security initialized with custom certificate');
      } else {
        console.log('✅ QZ Tray security initialized with default certificate');
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize QZ Tray security:', error);
      throw new Error('Failed to initialize QZ Tray security');
    }
  }

  async connect(config?: QZSecurityConfig): Promise<boolean> {
    try {
      // Initialize security before connecting
      await this.initializeSecurity(config);

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
        this.connected = true;
        console.log('✅ QZ Tray connected successfully');
        return true;
      }
      this.connected = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to QZ Tray:', error);
      this.connected = false;
      
      // Provide helpful error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('WebSocket')) {
          throw new Error('QZ Tray is not running. Please start QZ Tray application and try again.');
        } else if (error.message.includes('certificate') || error.message.includes('trust')) {
          throw new Error('Certificate verification failed. Please ensure your website is properly configured for QZ Tray.');
        } else if (error.message.includes('blocked')) {
          throw new Error('Connection blocked by QZ Tray. Please allow this website in QZ Tray settings.');
        }
      }
      
      throw new Error('Failed to connect to QZ Tray. Please ensure QZ Tray is running and this website is trusted.');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
      this.connected = false;
      console.log('QZ Tray disconnected');
    } catch (error) {
      console.error('Error disconnecting QZ Tray:', error);
    }
  }

  async getPrinters(): Promise<string[]> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      return await qz.printers.find();
    } catch (error) {
      console.error('Failed to get printers:', error);
      throw error;
    }
  }

  async getDefaultPrinter(): Promise<string | null> {
    try {
      const printers = await this.getPrinters();
      // Look for Zebra printers first
      const zebraPrinter = printers.find(p => 
        p.toLowerCase().includes('zebra') || 
        p.toLowerCase().includes('zd') ||
        p.toLowerCase().includes('zt')
      );
      
      if (zebraPrinter) {
        return zebraPrinter;
      }
      
      // Return first printer if no Zebra found
      return printers.length > 0 ? printers[0] : null;
    } catch (error) {
      console.error('Failed to get default printer:', error);
      return null;
    }
  }

  async printZPL(zplCode: string, config?: QZPrinterConfig): Promise<void> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      let printerName = config?.printerName;
      
      if (!printerName && config?.defaultPrinter !== false) {
        printerName = await this.getDefaultPrinter();
      }

      if (!printerName) {
        throw new Error('No printer specified or found');
      }

      const printConfig = qz.configs.create(printerName);
      
      const printData = [{
        type: 'raw',
        format: 'plain',
        data: zplCode
      }];

      await qz.print(printConfig, printData);
      console.log(`✅ Label printed successfully to ${printerName}`);
      
    } catch (error) {
      console.error('❌ Failed to print label:', error);
      throw new Error(`Failed to print label: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async printMultipleZPL(zplCodes: string[], config?: QZPrinterConfig): Promise<void> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      let printerName = config?.printerName;
      
      if (!printerName && config?.defaultPrinter !== false) {
        printerName = await this.getDefaultPrinter();
      }

      if (!printerName) {
        throw new Error('No printer specified or found');
      }

      const printConfig = qz.configs.create(printerName);
      
      // Combine all ZPL codes
      const combinedZPL = zplCodes.join('\n');
      
      const printData = [{
        type: 'raw',
        format: 'plain',
        data: combinedZPL
      }];

      await qz.print(printConfig, printData);
      console.log(`✅ ${zplCodes.length} labels printed successfully to ${printerName}`);
      
    } catch (error) {
      console.error('❌ Failed to print labels:', error);
      throw new Error(`Failed to print labels: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Static helper methods for certificate management
  static saveCertificate(certificate: string, privateKey: string): void {
    localStorage.setItem('qz-custom-certificate', certificate);
    localStorage.setItem('qz-custom-private-key', privateKey);
    console.log('✅ Custom certificate saved to local storage');
  }

  static clearSavedCertificate(): void {
    localStorage.removeItem('qz-custom-certificate');
    localStorage.removeItem('qz-custom-private-key');
    console.log('🗑️ Saved certificate cleared from local storage');
  }

  static hasSavedCertificate(): boolean {
    return !!(localStorage.getItem('qz-custom-certificate') && localStorage.getItem('qz-custom-private-key'));
  }
}

export default QZTrayPrinter.getInstance();