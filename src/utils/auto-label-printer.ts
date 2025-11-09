import { supabase } from '@/integrations/supabase/client';
import { generateLabelZPL } from './zpl-generator';
import { QZConnectionManager } from './qz-connection-manager';
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
  elements?: any[];
  settings?: any;
  canvas_data?: {
    elements: any[];
  };
  width?: number;
  height?: number;
}

/**
 * Get appropriate label template based on result type
 */
export async function getTemplateForResult(
  result: ProcessingResult,
  preferredTemplateId?: string
): Promise<LabelTemplate | null> {
  try {
    // If a preferred template ID is provided, try to use it first
    if (preferredTemplateId) {
      const { data: preferredTemplate } = await supabase
        .from('label_templates')
        .select('id, name, canvas_data, width, height')
        .eq('id', preferredTemplateId)
        .single();
      
      if (preferredTemplate) {
        console.log('Using preferred template:', preferredTemplate.name);
        return preferredTemplate;
      }
    }

    // Fall back to searching by type
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

    const { data, error } = await query.select('id, name, canvas_data, width, height').limit(1).single();

    if (error || !data) {
      console.warn(`No ${result.template_type} template found, trying any template...`);
      
      // Fallback to any available template
      const { data: fallback } = await supabase
        .from('label_templates')
        .select('id, name, canvas_data, width, height')
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
 * Generate ZPL from template canvas data
 */
async function generateZPLFromTemplate(
  template: LabelTemplate,
  data: Record<string, any>
): Promise<string> {
  // Extract elements from template
  const elements = template.canvas_data?.elements || [];
  
  // Calculate proper label dimensions (convert canvas pixels to inches, then to dots)
  const canvasDPI = 96;
  const widthInInches = (template.width || 400) / canvasDPI;
  const heightInInches = (template.height || 300) / canvasDPI;
  
  // Use standard 4x3 inch labels (common for inventory/PO labels)
  const labelWidthDots = 4 * 203;  // 4 inches at 203 DPI
  const labelHeightDots = 3 * 203; // 3 inches at 203 DPI
  
  // Calculate scale factors to map canvas pixels to label dots
  const scaleX = labelWidthDots / (template.width || 400);
  const scaleY = labelHeightDots / (template.height || 300);
  
  // Map template elements to ZPL elements with proper scaling
  const zplElements = elements.map((element: any) => {
    const dataValue = data[element.dataColumn] || element.text || '';
    
    return {
      type: element.type,
      x: Math.round(element.x * scaleX),           // Scale X position
      y: Math.round(element.y * scaleY),           // Scale Y position
      width: Math.round((element.width || 100) * scaleX),   // Scale width
      height: Math.round((element.height || 50) * scaleY),  // Scale height
      content: String(dataValue),
      fontSize: Math.round((element.fontSize || 12) * scaleY), // Scale font size
      fontFamily: element.fontFamily || 'Arial',
      barcodeType: element.barcodeType,
      showBarcodeText: element.showText || false,
      alignment: element.alignment || 'left'
    };
  });

  // Generate ZPL with proper label dimensions
  return generateLabelZPL(zplElements, {
    dpi: 203,
    labelWidth: labelWidthDots,
    labelHeight: labelHeightDots
  });
}

/**
 * Automatically print label after processing
 */
export async function autoPrintLabel(
  result: ProcessingResult,
  config: AutoPrintConfig,
  preferredTemplateId?: string
): Promise<boolean> {
  if (!config.enabled) {
    console.log('[Auto-Print] Disabled in config');
    return false;
  }

  try {
    console.log('[Auto-Print] Starting...', { templateType: result.template_type });
    
    // Get appropriate template
    const template = await getTemplateForResult(result, preferredTemplateId);
    
    if (!template) {
      toast.error('No label template found. Create one in Label Designer.');
      return false;
    }

    console.log('[Auto-Print] Using template:', template.name);

    // Build data mapping for template elements
    const templateData: Record<string, any> = {
      ASIN: result.item.asin || 'N/A',
      'SKU Code': result.item.sku_code || 'N/A',
      'Model Number': result.item.model_number || 'N/A',
      Title: result.item.title || 'No Title',
      Quantity: result.item.quantity,
      Serial: result.item.serial_number || 'N/A',
      'Serial Number': result.item.serial_number || 'N/A',
      Supplier: result.item.supplier_name || 'N/A',
      Status: result.template_type === 'po' ? 'Fulfilled' : 'In Stock',
      Date: new Date().toLocaleDateString()
    };

    // For PO items, add PO-specific data
    if (result.template_type === 'po' && result.po_allocations?.length > 0) {
      const poNumbers = result.po_allocations.map(a => a.po_number).join(', ');
      templateData['PO Number'] = poNumbers;
      templateData['PO Numbers'] = poNumbers;
    }

    console.log('[Auto-Print] Template data:', templateData);

    // Generate ZPL from template
    const zpl = await generateZPLFromTemplate(template, templateData);
    console.log('[Auto-Print] Generated ZPL length:', zpl.length);

    // Always direct print (no download fallback as per user requirement)
    if (!config.preferDirectPrint || !config.defaultPrinter) {
      toast.error('Direct printing not configured', {
        description: 'Go to Receive Stock settings to enable QZ Tray and select a printer',
        duration: 5000
      });
      return false;
    }

    console.log('[Auto-Print] Direct print to:', config.defaultPrinter);
    return await printDirectly(zpl, config.defaultPrinter);
  } catch (error) {
    console.error('[Auto-Print] Error:', error);
    toast.error(`Failed to print: ${error.message}`);
    return false;
  }
}

/**
 * Print directly to thermal printer via QZ Tray
 */
async function printDirectly(zpl: string, printerName: string): Promise<boolean> {
  try {
    console.log('[Direct Print] Printing to:', printerName);
    
    // Use the same reliable method as inventory page
    const qzManager = QZConnectionManager.getInstance();
    await qzManager.print(zpl, printerName);
    
    toast.success(`Label printed to ${printerName}`);
    return true;
  } catch (error) {
    console.error('[Direct Print] Error:', error);
    
    if (error.message?.includes('Unable to establish connection')) {
      toast.error('QZ Tray not connected. Please start QZ Tray and try again.');
    } else if (error.message?.includes('Printer')) {
      toast.error(`Printer "${printerName}" not found. Check printer settings.`);
    } else {
      toast.error(`Print failed: ${error.message}`);
    }
    
    return false;
  }
}

/**
 * Download label as PDF - DISABLED per user requirement
 */
async function downloadPDF(zpl: string, filename: string): Promise<boolean> {
  // User specifically requested NO downloading, only direct printing
  console.warn('[Download] Download disabled - direct print only');
  toast.error('Direct printing failed. Please enable QZ Tray and select a printer.');
  return false;
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
