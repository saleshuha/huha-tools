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

      // Check if QZ Tray script is loaded
      if (typeof window.qz === 'undefined') {
        console.log('⚠️ QZ Tray script not found, attempting to load...');
        await this.loadQZScript();
      }

      // Wait a moment for script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Attempt connection through QZTrayPrinter
      const connected = await QZTrayPrinter.connect();
      
      if (connected) {
        console.log('✅ QZ Connection Manager: Connected successfully');
        this.isConnected = true;
        this.notifyListeners();
        return true;
      } else {
        throw new Error('Connection returned false');
      }
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
    return QZTrayPrinter.getPrinters();
  }

  async getDefaultPrinter(): Promise<string | null> {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return null;
      }
    }
    return QZTrayPrinter.getDefaultPrinter();
  }

  async print(zplCode: string, printerName?: string): Promise<void> {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('QZ Tray not connected');
      }
    }
    return QZTrayPrinter.printZPL(zplCode, { printerName });
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