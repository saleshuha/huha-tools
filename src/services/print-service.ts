import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { LabelDoc, LabelElement, LabelDataset, PrintSettings } from '@/types/label';
import { resolveMappedContent, mmToPx, pxToMM } from '@/utils/label-serializer';

export class PrintService {
  /**
   * Generate PDF for single or bulk labels
   */
  static async generatePDF(
    document: LabelDoc,
    dataset: LabelDataset | null,
    settings: PrintSettings
  ): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: settings.orientation,
      unit: 'mm',
      format: settings.paperSize === 'custom' ? [document.size.width, document.size.height] : settings.paperSize,
    });

    const isBulk = dataset && dataset.data.length > 0;
    const totalLabels = isBulk ? dataset.data.length * settings.copies : settings.copies;

    let currentPage = 1;
    let labelsOnCurrentPage = 0;

    for (let labelIndex = 0; labelIndex < totalLabels; labelIndex++) {
      const dataRow = isBulk ? dataset.data[labelIndex % dataset.data.length] : [];
      
      // Add new page if needed
      if (labelsOnCurrentPage >= settings.labelsPerPage && labelIndex > 0) {
        pdf.addPage();
        currentPage++;
        labelsOnCurrentPage = 0;
      }

      // Calculate label position on page
      const labelX = settings.margin + (labelsOnCurrentPage % 2) * (document.size.width + 10);
      const labelY = settings.margin + Math.floor(labelsOnCurrentPage / 2) * (document.size.height + 10);

      // Render each element
      for (const element of document.elements) {
        await this.renderElementToPDF(pdf, element, dataset, dataRow, labelX, labelY);
      }

      labelsOnCurrentPage++;
    }

    return pdf.output('blob');
  }

  /**
   * Generate ZPL code for Zebra printers
   */
  static generateZPL(
    document: LabelDoc,
    dataset: LabelDataset | null,
    settings: PrintSettings
  ): string {
    const isBulk = dataset && dataset.data.length > 0;
    const totalLabels = isBulk ? dataset.data.length * settings.copies : settings.copies;

    let zpl = '';

    for (let labelIndex = 0; labelIndex < totalLabels; labelIndex++) {
      const dataRow = isBulk ? dataset.data[labelIndex % dataset.data.length] : [];
      
      zpl += '^XA\n'; // Start of label
      
      // Set print darkness (0-30, default 10)
      if (settings.darkness !== undefined && settings.darkness >= 0 && settings.darkness <= 30) {
        zpl += `~SD${settings.darkness.toString().padStart(2, '0')}\n`;
      }
      
      // Set label size with proper margins
      const labelWidth = this.mmToDots(document.size.width, settings.dpi);
      const labelHeight = this.mmToDots(document.size.height, settings.dpi);
      console.log('Label dimensions:', { 
        labelWidthMM: document.size.width, 
        labelHeightMM: document.size.height,
        labelWidthDots: labelWidth,
        labelHeightDots: labelHeight,
        dpi: settings.dpi
      });
      zpl += `^LL${labelHeight}\n`;
      zpl += `^PW${labelWidth}\n`;

      // Render each element
      for (const element of document.elements) {
        zpl += this.renderElementToZPL(element, dataset, dataRow, settings.dpi, document.size);
      }

      zpl += '^XZ\n'; // End of label
    }

    return zpl;
  }

  /**
   * Generate HTML preview
   */
  static generateHTMLPreview(
    document: LabelDoc,
    dataset: LabelDataset | null,
    maxLabels: number = 10
  ): string {
    const isBulk = dataset && dataset.data.length > 0;
    const totalLabels = Math.min(isBulk ? dataset.data.length : 1, maxLabels);

    let html = `
      <html>
        <head>
          <title>Label Preview</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .label { 
              border: 1px solid #ccc; 
              margin: 10px; 
              position: relative; 
              display: inline-block;
              width: ${document.size.width}mm;
              height: ${document.size.height}mm;
              background: white;
            }
            .element { position: absolute; }
            .text { font-family: Arial; }
            .barcode, .qr { text-align: center; }
          </style>
        </head>
        <body>
    `;

    for (let labelIndex = 0; labelIndex < totalLabels; labelIndex++) {
      const dataRow = isBulk ? dataset.data[labelIndex] : [];
      
      html += `<div class="label">`;
      
      for (const element of document.elements) {
        html += this.renderElementToHTML(element, dataset, dataRow);
      }
      
      html += `</div>`;
    }

    html += `</body></html>`;
    return html;
  }

  private static async renderElementToPDF(
    pdf: jsPDF,
    element: LabelElement,
    dataset: LabelDataset | null,
    dataRow: any[],
    offsetX: number,
    offsetY: number
  ): Promise<void> {
    const x = offsetX + pxToMM(element.x);
    const y = offsetY + pxToMM(element.y);
    const width = pxToMM(element.width);
    const height = pxToMM(element.height);

    switch (element.type) {
      case 'text':
        const content = resolveMappedContent(element, dataRow, dataset?.headers || []);
        pdf.setFontSize(element.fontSize || 12);
        pdf.setTextColor(element.color || '#000000');
        pdf.text(content, x, y + height / 2);
        break;

      case 'multitext':
        const multiContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        pdf.setFontSize(element.fontSize || 10);
        pdf.setTextColor(element.color || '#000000');
        
        // Split text into lines that fit within the element width
        const lines = pdf.splitTextToSize(multiContent, width);
        const lineHeight = (element.lineHeight || 1.2) * (element.fontSize || 10) * 0.352778; // Convert to mm
        
        lines.forEach((line: string, index: number) => {
          pdf.text(line, x, y + (index + 1) * lineHeight);
        });
        break;

      case 'rectangle':
        pdf.setFillColor(element.fill || '#ffffff');
        pdf.setDrawColor(element.stroke || '#000000');
        pdf.rect(x, y, width, height, element.fill ? 'FD' : 'S');
        break;

      case 'circle':
        const radius = Math.min(width, height) / 2;
        pdf.setFillColor(element.fill || '#ffffff');
        pdf.setDrawColor(element.stroke || '#000000');
        pdf.circle(x + radius, y + radius, radius, element.fill ? 'FD' : 'S');
        break;

      case 'barcode':
        const barcodeContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        // For PDF, we'll add barcode as text for now
        pdf.setFontSize(10);
        pdf.text(`*${barcodeContent}*`, x, y + height / 2);
        break;

      case 'qr':
        const qrContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        // For PDF, we'll add QR as text for now
        pdf.setFontSize(8);
        pdf.text(`QR: ${qrContent}`, x, y + height / 2);
        break;
    }
  }

  private static renderElementToZPL(
    element: LabelElement,
    dataset: LabelDataset | null,
    dataRow: any[],
    dpi: number,
    labelSizeMM?: { width: number; height: number }
  ): string {
    // Direct coordinate conversion - elements are already positioned correctly on canvas
    // Canvas uses pixel coordinates that directly correspond to the label's millimeter dimensions
    // Convert from canvas pixels to ZPL dots using proper scaling
    
    if (!labelSizeMM) {
      console.warn('Label size not provided for ZPL conversion');
      return '';
    }

    // Calculate the scale factor between canvas pixels and actual millimeters
    const canvasWidthPx = mmToPx(labelSizeMM.width);  // Canvas width in pixels
    const canvasHeightPx = mmToPx(labelSizeMM.height); // Canvas height in pixels
    
    // Convert element position from canvas pixels to millimeters proportionally
    const elementXMM = (element.x / canvasWidthPx) * labelSizeMM.width;
    const elementYMM = (element.y / canvasHeightPx) * labelSizeMM.height;
    const elementWidthMM = (element.width / canvasWidthPx) * labelSizeMM.width;
    const elementHeightMM = (element.height / canvasHeightPx) * labelSizeMM.height;
    
    // Convert to ZPL dots
    let x = Math.round(this.mmToDots(elementXMM, dpi));
    let y = Math.round(this.mmToDots(elementYMM, dpi));
    
    // Ensure elements don't exceed label boundaries
    const maxX = this.mmToDots(labelSizeMM.width, dpi);
    const maxY = this.mmToDots(labelSizeMM.height, dpi);
    const elementWidthDots = Math.round(this.mmToDots(elementWidthMM, dpi));
    const elementHeightDots = Math.round(this.mmToDots(elementHeightMM, dpi));
    
    // Constrain position to label bounds
    x = Math.max(0, Math.min(x, maxX - elementWidthDots));
    y = Math.max(0, Math.min(y, maxY - elementHeightDots));

    console.log('Element positioning:', { 
      type: element.type,
      originalX: element.x, 
      originalY: element.y,
      elementWidth: element.width,
      elementHeight: element.height,
      elementXMM,
      elementYMM,
      elementWidthMM,
      elementHeightMM,
      constrainedX: x, 
      constrainedY: y,
      labelSizeMM,
      dpi 
    });

    switch (element.type) {
      case 'text':
        const content = resolveMappedContent(element, dataRow, dataset?.headers || []);
        console.log('Text element mapping:', { 
          element: element.dataColumn, 
          headers: dataset?.headers, 
          dataRow, 
          resolved: content 
        });
        // Fix font sizing for ZPL - use element's font size or reasonable default based on element height
        const baseFontSize = element.fontSize || 12; // Use element's font size as base
        const fontSize = Math.max(10, Math.min(50, Math.round(baseFontSize * elementHeightMM / 5))); // Scale reasonably
        return `^FO${x},${y}^A0N,${fontSize},${Math.round(fontSize * 0.8)}^FD${content}^FS\n`;

      case 'multitext':
        const multiContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        console.log('Multitext element mapping:', { 
          element: element.dataColumn, 
          headers: dataset?.headers, 
          dataRow, 
          resolved: multiContent 
        });
        // Fix multitext font sizing for ZPL
        const multiBaseFontSize = element.fontSize || 10;
        const multiFontSize = Math.max(8, Math.min(40, Math.round(multiBaseFontSize * elementHeightMM / 6)));
        const lineHeight = Math.round(multiFontSize * 1.2);
        
        // Better line wrapping for ZPL - use character width estimation
        const estimatedCharWidth = multiFontSize * 0.6; // Estimate character width in dots
        const maxCharsPerLine = Math.floor(elementWidthDots / estimatedCharWidth);
        let zplOutput = '';
        
        // Split content into lines that fit within the element width
        const words = multiContent.split(' ');
        let currentLine = '';
        let lines: string[] = [];
        
        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (testLine.length > maxCharsPerLine && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        
        if (currentLine) lines.push(currentLine);
        
        lines.forEach((line, index) => {
          const lineY = y + (index * lineHeight);
          zplOutput += `^FO${x},${lineY}^A0N,${multiFontSize},${Math.round(multiFontSize * 0.8)}^FD${line}^FS\n`;
        });
        
        return zplOutput;

      case 'rectangle':
        return `^FO${x},${y}^GB${elementWidthDots},${elementHeightDots},${element.strokeWidth || 1}^FS\n`;

      case 'barcode':
        const barcodeContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        console.log('Barcode element mapping:', { 
          element: element.dataColumn, 
          headers: dataset?.headers, 
          dataRow, 
          resolved: barcodeContent 
        });
        // Use actual element dimensions for barcode
        return `^FO${x},${y}^BY2,3,${elementHeightDots}^BCN,,Y,N^FD${barcodeContent}^FS\n`;

      case 'qr':
        const qrContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        // Scale QR code based on element size
        const qrScale = Math.max(2, Math.min(10, Math.round(elementWidthMM / 10)));
        return `^FO${x},${y}^BQN,2,${qrScale}^FDQA,${qrContent}^FS\n`;

      default:
        return '';
    }
  }

  private static renderElementToHTML(
    element: LabelElement,
    dataset: LabelDataset | null,
    dataRow: any[]
  ): string {
    const style = `
      left: ${pxToMM(element.x)}mm;
      top: ${pxToMM(element.y)}mm;
      width: ${pxToMM(element.width)}mm;
      height: ${pxToMM(element.height)}mm;
      font-size: ${element.fontSize || 12}px;
      color: ${element.color || '#000000'};
    `;

    switch (element.type) {
      case 'text':
        const content = resolveMappedContent(element, dataRow, dataset?.headers || []);
        return `<div class="element text" style="${style}">${content}</div>`;

      case 'multitext':
        const multiContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        const multiStyle = `
          ${style} 
          line-height: ${element.lineHeight || 1.2}; 
          word-wrap: break-word; 
          white-space: pre-wrap; 
          overflow: hidden;
          text-align: ${element.textAlign || 'left'};
          font-family: ${element.fontFamily || 'Arial'};
        `;
        return `<div class="element text" style="${multiStyle}">${multiContent}</div>`;

      case 'rectangle':
        const rectStyle = `${style} background: ${element.fill || 'transparent'}; border: ${element.strokeWidth || 1}px solid ${element.stroke || '#000000'};`;
        return `<div class="element" style="${rectStyle}"></div>`;

      case 'circle':
        const circleStyle = `${style} background: ${element.fill || 'transparent'}; border: ${element.strokeWidth || 1}px solid ${element.stroke || '#000000'}; border-radius: 50%;`;
        return `<div class="element" style="${circleStyle}"></div>`;

      case 'barcode':
        const barcodeContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        return `<div class="element barcode" style="${style}">*${barcodeContent}*</div>`;

      case 'qr':
        const qrContent = resolveMappedContent(element, dataRow, dataset?.headers || []);
        return `<div class="element qr" style="${style}">QR: ${qrContent}</div>`;

      default:
        return '';
    }
  }

  private static mmToDots(mm: number, dpi: number): number {
    return Math.round(mm * dpi / 25.4);
  }
}