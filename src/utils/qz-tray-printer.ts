import qz from 'qz-tray';

export interface QZPrinterConfig {
  printerName?: string;
  defaultPrinter?: boolean;
}

export class QZTrayPrinter {
  private static instance: QZTrayPrinter;
  private connected = false;
  
  static getInstance(): QZTrayPrinter {
    if (!QZTrayPrinter.instance) {
      QZTrayPrinter.instance = new QZTrayPrinter();
    }
    return QZTrayPrinter.instance;
  }

  async connect(): Promise<boolean> {
    try {
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
      throw new Error('Failed to connect to QZ Tray. Please ensure QZ Tray is running.');
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