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
    // If already connecting, return the existing promise (prevent multiple parallel connections)
    if (this.connectionPromise && !forceReconnect) {
      console.log('🔄 Connection already in progress, waiting for result...');
      return this.connectionPromise;
    }

    // If already connected and not forcing reconnect, return true
    if (this.isConnected && !forceReconnect) {
      console.log('✅ Already connected to QZ Tray');
      return true;
    }

    console.log('🚀 Initiating QZ Tray connection...');
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

      // Ensure security is initialized - but don't override if already set up globally
      if (!window.qzSecurityInitialized) {
        console.log('🔐 Setting up QZ security (fallback - should already be done globally)...');
        
        // Use simple auto-approve setup to avoid excessive signing requests
        window.qz.security.setCertificatePromise(function(resolve: any, reject: any) {
          console.log('📜 QZ Certificate requested (auto-approve fallback)');
          resolve(); // Auto-approve to prevent dialogs
        });

        window.qz.security.setSignaturePromise(function(toSign: any) {
          return function(resolve: any, reject: any) {
            console.log('✍️ QZ Signature requested (auto-approve fallback)');
            resolve(); // Auto-approve to prevent signing dialogs
          };
        });
        
        window.qzSecurityInitialized = true;
        console.log('✅ QZ security initialized with auto-approve (no signing required)');
      } else {
        console.log('✅ Using existing global QZ security setup (no additional signing needed)');
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