import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface ExcelExportOptions {
  data: any[];
  categoriesMap: Map<number, { name: string; products: any[] }>;
  config: {
    status: number;
    categoryName: string;
    columns: string[];
    apiKeys: number;
    pageSize: number;
  };
  fileName?: string;
  saveToStorage?: boolean;
}

export const getProductStatusText = (status: number): string => {
  switch (status) {
    case 1: return 'Valid';
    case 2: return 'Deleted';
    case 3: return 'Out of Stock';
    case 4: return 'Hidden (too old)';
    default: return 'Unknown';
  }
};

export const generateExcelFile = async (options: ExcelExportOptions): Promise<string | null> => {
  try {
    const { data, categoriesMap, config, fileName, saveToStorage = false } = options;
    
    const workbook = XLSX.utils.book_new();

    // Create summary sheet
    const summaryData = [
      ['Sunsky Export Summary'],
      ['Export Date', new Date().toLocaleString()],
      ['Status Filter', getProductStatusText(config.status)],
      ['Category Filter', config.categoryName],
      ['Total Products', data.length.toString()],
      ['Total Categories', categoriesMap.size.toString()],
      ['API Keys Used', config.apiKeys.toString()],
      ['Page Size', config.pageSize.toString()],
      [],
      ['Category Breakdown'],
      ['Category', 'Product Count']
    ];

    // Add category breakdown
    Array.from(categoriesMap.entries())
      .sort(([,a], [,b]) => b.products.length - a.products.length)
      .forEach(([categoryId, categoryInfo]) => {
        summaryData.push([categoryInfo.name, categoryInfo.products.length.toString()]);
      });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create main products sheet with selected columns
    const productsData = [config.columns];

    data.forEach((product: any) => {
      const row = config.columns.map(column => {
        switch (column) {
          case 'status':
            return getProductStatusText(product.status);
          case 'dimensions':
            return `${product.unitLength || ''}x${product.unitWidth || ''}x${product.unitHeight || ''}`;
          case 'pack_dimensions':
            return `${product.packLength || ''}x${product.packWidth || ''}x${product.packHeight || ''}`;
          case 'category':
            const categoryInfo = categoriesMap.get(product.categoryId);
            return categoryInfo?.name || 'Uncategorized';
          case 'price':
            return product.price ? `$${product.price}` : '';
          case 'weight':
            return product.weight ? `${product.weight}g` : '';
          default:
            return product[column] || '';
        }
      });
      productsData.push(row);
    });

    const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'All Products');

    // Create category-specific sheets (top 10 categories)
    const sortedCategories = Array.from(categoriesMap.entries())
      .sort(([,a], [,b]) => b.products.length - a.products.length)
      .slice(0, 10);

    // Track used sheet names to prevent duplicates
    const usedSheetNames = new Set(['Summary', 'All Products']);

    sortedCategories.forEach(([categoryId, categoryInfo]) => {
      const categoryData = [config.columns];
      
      categoryInfo.products.forEach((product: any) => {
        const row = config.columns.map(column => {
          switch (column) {
            case 'status':
              return getProductStatusText(product.status);
            case 'dimensions':
              return `${product.unitLength || ''}x${product.unitWidth || ''}x${product.unitHeight || ''}`;
            case 'pack_dimensions':
              return `${product.packLength || ''}x${product.packWidth || ''}x${product.packHeight || ''}`;
            case 'category':
              return categoryInfo.name;
            case 'price':
              return product.price ? `$${product.price}` : '';
            case 'weight':
              return product.weight ? `${product.weight}g` : '';
            default:
              return product[column] || '';
          }
        });
        categoryData.push(row);
      });

      const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
      
      // Generate unique sheet name
      let baseSheetName = (categoryInfo.name || 'Uncategorized').substring(0, 30).replace(/[\\/*?:"<>|]/g, '');
      let sheetName = baseSheetName;
      let counter = 1;
      
      // Append counter if name already exists
      while (usedSheetNames.has(sheetName)) {
        sheetName = `${baseSheetName.substring(0, 27)}_${counter}`;
        counter++;
      }
      
      usedSheetNames.add(sheetName);
      XLSX.utils.book_append_sheet(workbook, categorySheet, sheetName);
    });

    // Generate the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const defaultFileName = fileName || `sunsky-export-${getProductStatusText(config.status).toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;

    if (saveToStorage) {
      // Save to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const filePath = `${user.id}/${defaultFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sunsky-exports')
        .upload(filePath, blob, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true
        });

      if (uploadError) throw uploadError;

      return filePath;
    } else {
      // Download immediately
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return null; // No file path for direct downloads
    }
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw error;
  }
};