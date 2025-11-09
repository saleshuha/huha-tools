import { supabase } from '@/integrations/supabase/client';
import { generatePOLabelZPL } from './po-label-printer';
import { toast } from 'sonner';
import qz from 'qz-tray';

export interface AutoPrintConfig {
  enabled: boolean;
  preferDirectPrint: boolean;
  defaultPrinter?: string;
  showPreview?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  item: {
    asin?: string;
    sku_code?: string;
    model_number?: string;
    title?: string;
    quantity: number;
    serial_number?: string;
    supplier_name?: string;
  };
  po_allocations?: Array<{
    po_number: string;
    quantity: number;
  }>;
  inventory_id?: string;
  template_type: 'po' | 'inventory';
}

export interface LabelTemplate {
  id: string;
  name: string;
  elements: any[];
  settings: any;
}

/**
 * Get appropriate label template based on result type
 */
export async function getTemplateForResult(result: ProcessingResult): Promise<LabelTemplate | null> {
  try {
    let query = supabase
      .from('label_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (result.template_type === 'po') {
      // Search for PO-related templates
      query = query.or('name.ilike.%po%,name.ilike.%purchase%,description.ilike.%po%');
    } else {
      // Search for inventory-related templates
      query = query.or('name.ilike.%inventory%,name.ilike.%warehouse%,name.ilike.%stock%');
    }

    const { data, error } = await query.limit(1).single();

    if (error || !data) {
      console.warn(`No ${result.template_type} template found, trying any template...`);
      
      // Fallback to any available template
      const { data: fallback } = await supabase
        .from('label_templates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return fallback;
    }

    return data;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

/**
 * Automatically print label after processing
 */
export async function autoPrintLabel(
  result: ProcessingResult,
  config: AutoPrintConfig
): Promise<boolean> {
  if (!config.enabled) {
    return false;
  }

  try {
    // Get appropriate template
    const template = await getTemplateForResult(result);
    
    if (!template) {
      toast.error('No label template found. Please create one in Label Designer.');
      return false;
    }

    // Build print item data
    const printItem = {
      asin: result.item.asin || 'N/A',
      title: result.item.title || 'No Title',
      quantity: result.item.quantity,
      poNumbers: result.po_allocations?.map(a => a.po_number) || [],
      model_number: result.item.model_number,
      sku_code: result.item.sku_code,
      serialNumber: result.item.serial_number,
      fulfilledFromStock: result.template_type === 'po',
      inventorySource: result.template_type === 'inventory' ? 'ASIN' : undefined
    };

    // Generate ZPL
    const zpl = generatePOLabelZPL(printItem, {
      dpi: 203,
      labelWidth: 4,
      labelHeight: 2,
      includeImages: false,
      includeBarcode: true
    });

    // Print based on config
    if (config.preferDirectPrint && config.defaultPrinter) {
      return await printDirectly(zpl, config.defaultPrinter);
    } else {
      return await downloadPDF(zpl, printItem.asin);
    }
  } catch (error) {
    console.error('Auto-print error:', error);
    toast.error('Failed to auto-print label');
    return false;
  }
}

/**
 * Print directly to thermal printer via QZ Tray
 */
async function printDirectly(zpl: string, printerName: string): Promise<boolean> {
  try {
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const config = qz.configs.create(printerName);
    await qz.print(config, [zpl]);
    
    toast.success('Label printed successfully');
    return true;
  } catch (error) {
    console.error('Direct print error:', error);
    toast.error('Failed to print. Is QZ Tray connected?');
    return false;
  }
}

/**
 * Download label as PDF
 */
async function downloadPDF(zpl: string, filename: string): Promise<boolean> {
  try {
    // Convert ZPL to blob and download
    const blob = new Blob([zpl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `label-${filename}-${Date.now()}.zpl`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Label downloaded');
    return true;
  } catch (error) {
    console.error('PDF download error:', error);
    toast.error('Failed to download label');
    return false;
  }
}

/**
 * Get auto-print config from localStorage
 */
export function getAutoPrintConfig(): AutoPrintConfig {
  return {
    enabled: localStorage.getItem('stock-receiving-auto-print') === 'true',
    preferDirectPrint: localStorage.getItem('stock-receiving-direct-print') === 'true',
    defaultPrinter: localStorage.getItem('stock-receiving-default-printer') || undefined,
    showPreview: localStorage.getItem('stock-receiving-show-preview') === 'true'
  };
}

/**
 * Save auto-print config to localStorage
 */
export function saveAutoPrintConfig(config: AutoPrintConfig): void {
  localStorage.setItem('stock-receiving-auto-print', String(config.enabled));
  localStorage.setItem('stock-receiving-direct-print', String(config.preferDirectPrint));
  if (config.defaultPrinter) {
    localStorage.setItem('stock-receiving-default-printer', config.defaultPrinter);
  }
  localStorage.setItem('stock-receiving-show-preview', String(config.showPreview));
}
