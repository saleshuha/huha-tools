// Simplified ZPL generator without fabric.js dependencies
export interface ZPLSettings {
  dpi: 203 | 300;
  labelWidth: number;
  labelHeight: number;
}

export function generateSimpleZPL(settings: ZPLSettings, content: string = "Sample Label"): string {
  return `^XA
^PW${settings.labelWidth}
^LL${settings.labelHeight}
^FO50,50^A0N,50,50^FD${content}^FS
^XZ`;
}

export function getLabelSizePresets(dpi: 203 | 300) {
  return {
    '4x6': { width: 4 * dpi, height: 6 * dpi },
    '4x3': { width: 4 * dpi, height: 3 * dpi },
    '2x1': { width: 2 * dpi, height: 1 * dpi }
  };
}