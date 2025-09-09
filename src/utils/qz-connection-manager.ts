import { toast } from 'sonner';

declare global {
  interface Window {
    qz: any;
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

      // Set up QZ Tray security for unsigned/demo mode according to official docs
      // This triggers the trust dialog for unsigned access
      window.qz.security.setCertificatePromise(function(resolve, reject) {
        // For unsigned access - resolve with empty/null to trigger trust dialog
        resolve();
      });

      window.qz.security.setSignaturePromise(function(toSign) {
        return function(resolve, reject) {
          // For unsigned access - resolve with empty/null to trigger trust dialog
          resolve();
        };
      });

      // Clear any existing connection state to force fresh handshake
      if (window.qz.websocket.isActive()) {
        await window.qz.websocket.disconnect();
        // Wait for clean disconnect
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Connect to QZ WebSocket with retry logic
      if (!window.qz.websocket.isActive()) {
        let retries = 3;
        while (retries > 0) {
          try {
            await window.qz.websocket.connect();
            break;
          } catch (err) {
            retries--;
            if (retries === 0) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
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
      throw new Error('Not connected to QZ Tray. Please connect first.');
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
      return null;
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