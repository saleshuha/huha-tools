import QZTrayPrinter from './qz-tray-printer';

declare global {
  interface Window {
    qz: any;
  }
}

export class QZConnectionManager {
  private static instance: QZConnectionManager;
  private isConnected = false;
  private connectionPromise: Promise<boolean> | null = null;
  private listeners: ((connected: boolean) => void)[] = [];

  static getInstance(): QZConnectionManager {
    if (!QZConnectionManager.instance) {
      QZConnectionManager.instance = new QZConnectionManager();
    }
    return QZConnectionManager.instance;
  }

  addConnectionListener(callback: (connected: boolean) => void) {
    this.listeners.push(callback);
    // Immediately call with current status
    callback(this.isConnected);
  }

  removeConnectionListener(callback: (connected: boolean) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isConnected));
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
      console.log('🔄 QZ Connection Manager: Attempting to connect...');

      // Check if QZ Tray script is loaded (it should be in index.html)
      if (typeof window.qz === 'undefined') {
        console.error('❌ QZ Tray script not loaded. Please check index.html');
        throw new Error('QZ Tray script not available');
      }

      console.log('📡 QZ script found, attempting direct connection...');
      
      // Initialize QZ security with proper global setup
      console.log('🔐 Setting up QZ security...');
      
      // Set up certificate promise (for development, use empty cert)
      window.qz.security.setCertificatePromise(function(resolve: Function) {
        resolve(""); // Empty certificate for development
      });
      
      // Set up signature promise (for development, use empty signature)
      window.qz.security.setSignaturePromise(function(toSign: string) {
        return ""; // Return empty signature directly for development
      });
      
      // Use the global qz object directly with simpler connection
      if (!window.qz.websocket.isActive()) {
        await new Promise((resolve, reject) => {
          window.qz.websocket.connect().then(() => {
            console.log('✅ QZ WebSocket connected successfully');
            resolve(true);
          }).catch((error: any) => {
            console.error('❌ QZ WebSocket connection failed:', error);
            reject(error);
          });
        });
      }

      console.log('✅ QZ Connection Manager: Connected successfully');
      this.isConnected = true;
      this.notifyListeners();
      return true;
      
    } catch (error) {
      console.error('❌ QZ Connection Manager: Connection failed:', error);
      this.isConnected = false;
      this.notifyListeners();
      
      // Provide specific error guidance
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('🔍 Connection error details:', errorMessage);
      
      return false;
    }
  }

  private async loadQZScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="qz-tray"]');
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.5/qz-tray.js';
      script.onload = () => {
        console.log('✅ QZ Tray script loaded dynamically');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Failed to load QZ Tray script');
        reject(new Error('Failed to load QZ Tray script'));
      };
      document.head.appendChild(script);
    });
  }

  async getPrinters(): Promise<string[]> {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('QZ Tray not connected');
      }
    }
    
    try {
      return await window.qz.printers.find();
    } catch (error) {
      console.error('❌ Failed to get printers:', error);
      return [];
    }
  }

  async getDefaultPrinter(): Promise<string | null> {
    if (!this.isConnected) {
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
      const connected = await this.connect();
      if (!connected) {
        throw new Error('QZ Tray not connected');
      }
    }
    
    try {
      // Print directly using QZ without the wrapper
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
      console.error('❌ Direct print failed:', error);
      throw new Error(`Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🧪 Testing QZ Tray connection...');

      // Test 1: Check if QZ script is loaded
      if (typeof window.qz === 'undefined') {
        return {
          success: false,
          message: 'QZ Tray script not loaded. Please ensure QZ Tray script is available.',
          details: { step: 'script_check', error: 'qz object undefined' }
        };
      }

      // Test 2: Attempt connection
      const connected = await this.connect(true); // Force reconnect for test
      if (!connected) {
        return {
          success: false,
          message: 'Failed to connect to QZ Tray. Please ensure QZ Tray application is running.',
          details: { step: 'connection_test', error: 'connection_failed' }
        };
      }

      // Test 3: Get printers
      const printers = await this.getPrinters();
      
      return {
        success: true,
        message: `QZ Tray connected successfully! Found ${printers.length} printer(s).`,
        details: { 
          step: 'complete', 
          printers: printers.length,
          printerList: printers 
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { 
          step: 'error', 
          error: error instanceof Error ? error.message : error 
        }
      };
    }
  }
}

export const qzConnectionManager = QZConnectionManager.getInstance();