import qz from 'qz-tray';

export interface QZPrinterConfig {
  printerName?: string;
  defaultPrinter?: boolean;
}

export interface QZSecurityConfig {
  certificate?: string;
  signature?: string;
  allowUntrusted?: boolean;
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

  private async initializeSecurity(): Promise<void> {
    if (this.securityInitialized) return;

    try {
      // Production certificate (replace with your actual certificate)
      const certificate = `-----BEGIN CERTIFICATE-----
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

      if (isDevelopment) {
        // For development: Set up QZ Tray to be more permissive
        console.log('🔧 Development mode: Setting up QZ Tray for local development');
        
        // Set security to be more lenient for development
        qz.security.setCertificatePromise(() => {
          return Promise.resolve(certificate);
        });

        qz.security.setSignaturePromise((toSign: string) => {
          return Promise.resolve(toSign); // For development, just return the string
        });

        // Set a more user-friendly message for development
        qz.api.setHostname(window.location.hostname);
        
      } else {
        // Production: Use proper certificates and signatures
        console.log('🔒 Production mode: Setting up QZ Tray with proper security');
        
        qz.security.setCertificatePromise(() => {
          return Promise.resolve(certificate);
        });

        // In production, you should implement proper signature verification
        qz.security.setSignaturePromise((toSign: string) => {
          // This should be replaced with your actual signature verification
          // For now, returning a placeholder
          return Promise.resolve("YOUR_SIGNATURE_HERE");
        });
      }

      this.securityInitialized = true;
      console.log('✅ QZ Tray security initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize QZ Tray security:', error);
      throw new Error('Failed to initialize QZ Tray security');
    }
  }

  async connect(): Promise<boolean> {
    try {
      // Initialize security before connecting
      await this.initializeSecurity();

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

  isConnected(): boolean {
    return this.connected && qz.websocket.isActive();
  }
}

export default QZTrayPrinter.getInstance();