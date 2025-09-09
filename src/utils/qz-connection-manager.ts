import { toast } from 'sonner';
import { QZCertificateManager } from './qz-certificate-manager';
import forge from 'node-forge';

declare global {
  interface Window {
    qz: any;
    qzSecurityInitialized?: boolean;
  }
}

interface ConnectionListener {
  (connected: boolean): void;
}

export class QZConnectionManager {
  private static instance: QZConnectionManager;
  private isConnected = false;
  private connectionPromise: Promise<boolean> | null = null;
  private listeners: ConnectionListener[] = [];
  private securityInitialized = false;

  static getInstance(): QZConnectionManager {
    if (!QZConnectionManager.instance) {
      QZConnectionManager.instance = new QZConnectionManager();
    }
    return QZConnectionManager.instance;
  }

  addConnectionListener(callback: ConnectionListener) {
    this.listeners.push(callback);
    // Immediately call with current status
    callback(this.isConnected);
  }

  removeConnectionListener(callback: ConnectionListener) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Mark security as initialized globally (called from main.tsx)
  markSecurityInitialized() {
    this.securityInitialized = true;
    console.log('🔐 QZ Tray security marked as globally initialized');
  }

  private notifyListeners(connected: boolean) {
    this.isConnected = connected;
    this.listeners.forEach(listener => listener(connected));
  }

  async connect(forceReconnect = false): Promise<boolean> {
    // If already connecting, return the existing promise
    if (this.connectionPromise && !forceReconnect) {
      return this.connectionPromise;
    }

    // If already connected and not forcing reconnect, return true
    if (this.isConnected && !forceReconnect) {
      return true;
    }

    // Check if global security is set up first
    if (!window.qzSecurityInitialized) {
      console.log('⏳ Waiting for global QZ security initialization...');
      // Wait a bit for global init
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!window.qzSecurityInitialized) {
        console.warn('⚠️ Global QZ security not initialized yet');
      }
    }

    this.connectionPromise = this.performConnection();
    const result = await this.connectionPromise;
    this.connectionPromise = null;
    return result;
  }

  private async performConnection(): Promise<boolean> {
    try {
      console.log('🔄 Connecting to QZ Tray...');

      // Check if QZ Tray script is loaded
      if (typeof window.qz === 'undefined') {
        throw new Error('QZ Tray script not loaded');
      }

      // Ensure security is initialized with persistent certificate
      if (!window.qzSecurityInitialized) {
        console.log('🔐 Setting up QZ security with persistent certificate...');
        
        // Get the best available certificate
        const cert = QZCertificateManager.getBestCertificate();
        
        if (cert) {
          console.log(`🔑 Using ${cert.commonName} certificate (fingerprint: ${cert.fingerprint.slice(0, 20)}...)`);
          
          // Set up security with stored certificate
          window.qz.security.setCertificatePromise(function(resolve: any, reject: any) {
            console.log('📜 QZ Certificate requested - providing stored certificate');
            resolve(cert.certificate);
          });

          window.qz.security.setSignaturePromise(function(toSign: any) {
            return function(resolve: any, reject: any) {
              try {
                console.log('✍️ QZ Signature requested - signing with stored private key');
                console.log('📝 Data to sign:', toSign.slice(0, 100) + '...');
                
                // Parse the private key using node-forge
                const privateKey = forge.pki.privateKeyFromPem(cert.privateKey);
                
                // Create message digest (SHA-512 for QZ Tray 2.1+)
                const md = forge.md.sha512.create();
                md.update(toSign, 'utf8');
                
                // Sign the hash
                const signature = privateKey.sign(md);
                
                // Convert to base64
                const signatureB64 = forge.util.encode64(signature);
                
                console.log('✅ Message signed successfully');
                console.log('🔏 Signature (first 50 chars):', signatureB64.slice(0, 50) + '...');
                
                resolve(signatureB64);
              } catch (error) {
                console.error('❌ Signing failed:', error);
                console.log('⚠️ Falling back to auto-approve');
                resolve(); // Fallback to auto-approve if signing fails
              }
            };
          });
        } else {
          console.warn('⚠️ No certificate available - using auto-approve fallback');
          
          // Fallback to auto-approve
          window.qz.security.setCertificatePromise(function(resolve: any, reject: any) {
            console.log('📜 QZ Certificate requested (fallback auto-approve)');
            resolve();
          });

          window.qz.security.setSignaturePromise(function(toSign: any) {
            return function(resolve: any, reject: any) {
              console.log('✍️ QZ Signature requested (fallback auto-approve)');
              resolve();
            };
          });
        }
        
        window.qzSecurityInitialized = true;
      }

      // Connect to QZ WebSocket - don't disconnect if already active
      if (!window.qz.websocket.isActive()) {
        let retries = 3;
        while (retries > 0) {
          try {
            console.log('🔌 Connecting to QZ WebSocket...');
            await window.qz.websocket.connect();
            break;
          } catch (err) {
            retries--;
            if (retries === 0) throw err;
            console.log(`🔄 Retry ${3 - retries}/3...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else {
        console.log('♻️ QZ WebSocket already active, reusing connection');
      }

      console.log('✅ QZ Tray connected successfully');
      this.isConnected = true;
      this.notifyListeners(true);
      return true;
      
    } catch (error) {
      console.error('❌ QZ Tray connection failed:', error);
      this.isConnected = false;
      this.notifyListeners(false);
      return false;
    }
  }

  async getPrinters(): Promise<string[]> {
    if (!this.isConnected) {
      console.log('🔄 Auto-connecting for printer discovery...');
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Could not connect to QZ Tray for printer discovery');
      }
    }
    
    try {
      console.log('🖨️ Getting printers...');
      const printers = await window.qz.printers.find();
      console.log('🖨️ Found printers:', printers);
      return printers || [];
    } catch (error) {
      console.error('❌ Failed to get printers:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for signing/trust related errors
      if (errorMsg.includes('sign') || errorMsg.includes('certificate') || errorMsg.includes('trust')) {
        throw new Error('TRUST_ERROR: QZ Tray blocked unsigned access. Please allow and trust this website in QZ Tray.');
      }
      
      throw new Error(`Failed to get printers: ${errorMsg}`);
    }
  }

  async getDefaultPrinter(): Promise<string | null> {
    if (!this.isConnected) {
      console.log('🔄 Auto-connecting for default printer...');
      const connected = await this.connect();
      if (!connected) {
        return null;
      }
    }
    
    try {
      return await window.qz.printers.getDefault();
    } catch (error) {
      console.error('❌ Failed to get default printer:', error);
      return null;
    }
  }

  async print(zplCode: string, printerName?: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('QZ Tray not connected');
    }
    
    try {
      const printer = printerName || await this.getDefaultPrinter();
      if (!printer) {
        throw new Error('No printer available');
      }
      
      const config = window.qz.configs.create(printer);
      const data = [{
        type: 'raw',
        format: 'plain',
        data: zplCode
      }];
      
      return await window.qz.print(config, data);
    } catch (error) {
      console.error('❌ Print failed:', error);
      throw new Error(`Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const connected = await this.connect(true);
      if (!connected) {
        return {
          success: false,
          message: 'Failed to connect to QZ Tray',
          details: { error: 'connection_failed' }
        };
      }

      const printers = await this.getPrinters();
      
      return {
        success: true,
        message: `QZ Tray connected! Found ${printers.length} printer(s).`,
        details: { printers: printers.length, printerList: printers }
      };

    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : error }
      };
    }
  }
}

export const qzConnectionManager = QZConnectionManager.getInstance();