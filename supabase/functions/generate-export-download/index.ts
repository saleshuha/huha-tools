import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportData {
  products: any[];
  totalFound: number;
  categories: Array<{ id: number; name: string; count: number }>;
  filters: any;
  columns: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { taskId } = await req.json();
    
    console.log('🔄 Generating download for task:', taskId);

    // Get the background task data
    const { data: task, error: taskError } = await supabase
      .from('background_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const metadata = task.metadata as any || {};
    const exportData = metadata.downloadableResults as ExportData;

    if (!exportData?.products || exportData.products.length === 0) {
      throw new Error('No export data found in task metadata');
    }

    console.log('📊 Processing export data:', {
      totalProducts: exportData.products.length,
      categories: exportData.categories?.length || 0
    });

    // Generate Excel file using SheetJS (compatible with Deno)
    // Import the XLSX library for Deno
    const { utils, write } = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');

    // Create workbook
    const workbook = utils.book_new();

    // Create main products sheet
    const productsData = exportData.products.map((product: any) => {
      const row: any = {};
      const columns = exportData.columns || ['itemNo', 'name', 'brandName', 'price', 'stock', 'status'];
      
      columns.forEach((column: string) => {
        switch (column) {
          case 'itemNo':
            row['Item Number'] = product.itemNo || product.sku || '';
            break;
          case 'name':
            row['Product Name'] = product.name || product.title || '';
            break;
          case 'brandName':
            row['Brand'] = product.brandName || '';
            break;
          case 'price':
            row['Price'] = product.price || '';
            break;
          case 'stock':
            row['Stock'] = product.stock || '';
            break;
          case 'status':
            row['Status'] = product.status || '';
            break;
          case 'leadTime':
            row['Lead Time'] = product.leadTime || '';
            break;
          case 'warehouse':
            row['Warehouse'] = product.warehouse || '';
            break;
          case 'moq':
            row['MOQ'] = product.moq || '';
            break;
          case 'categoryId':
            row['Category ID'] = product.categoryId || '';
            break;
          case 'categoryName':
            row['Category'] = product.categoryName || '';
            break;
          case 'images':
            row['Images'] = Array.isArray(product.images) ? product.images.join(', ') : product.images || '';
            break;
          case 'description':
            row['Description'] = product.description || '';
            break;
          case 'specifications':
            row['Specifications'] = typeof product.specifications === 'object' 
              ? JSON.stringify(product.specifications) 
              : product.specifications || '';
            break;
          default:
            row[column] = product[column] || '';
        }
      });
      return row;
    });

    const productsSheet = utils.json_to_sheet(productsData);
    utils.book_append_sheet(workbook, productsSheet, 'Products');

    // Create summary sheet
    const summaryData = [
      ['Export Summary', ''],
      ['Total Products', exportData.totalFound],
      ['Export Date', new Date().toISOString()],
      ['Categories', exportData.categories?.length || 0],
      ['Status Filter', exportData.filters?.status || 'All'],
      ['Category Filter', exportData.filters?.categoryName || 'All Categories'],
      ['', ''],
      ['Category Breakdown', '']
    ];

    // Add category breakdown
    if (exportData.categories && exportData.categories.length > 0) {
      exportData.categories.forEach(cat => {
        summaryData.push([cat.name, cat.count]);
      });
    }

    const summarySheet = utils.aoa_to_sheet(summaryData);
    utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create categories sheet if there are multiple categories
    if (exportData.categories && exportData.categories.length > 1) {
      const categoriesData = exportData.categories.map(cat => ({
        'Category ID': cat.id,
        'Category Name': cat.name,
        'Product Count': cat.count
      }));
      const categoriesSheet = utils.json_to_sheet(categoriesData);
      utils.book_append_sheet(workbook, categoriesSheet, 'Categories');
    }

    // Convert to buffer
    console.log('📝 Writing Excel file...');
    const excelBuffer = write(workbook, { type: 'array', bookType: 'xlsx' });

    // Create file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const statusName = exportData.filters?.status === 1 ? 'valid' : 
                      exportData.filters?.status === 2 ? 'deleted' :
                      exportData.filters?.status === 3 ? 'out-of-stock' :
                      exportData.filters?.status === 4 ? 'hidden' : 'unknown';
    const categoryName = exportData.filters?.categoryName && exportData.filters.categoryName !== 'All Categories' 
      ? `-${exportData.filters.categoryName.replace(/[^a-zA-Z0-9]/g, '-')}`
      : '';
    
    const fileName = `sunsky-export-${statusName}${categoryName}-${timestamp}.xlsx`;

    console.log('✅ Export file generated successfully:', {
      fileName,
      fileSize: excelBuffer.byteLength,
      totalProducts: exportData.totalFound
    });

    // Update the background task with the file information
    await supabase
      .from('background_tasks')
      .update({
        metadata: {
          ...metadata,
          fileName,
          fileSize: excelBuffer.byteLength,
          downloadReady: true,
          generatedAt: new Date().toISOString()
        }
      })
      .eq('id', taskId);

    // Create export history entry
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!userError && user) {
      const { error: historyError } = await supabase
        .from('export_history')
        .insert({
          user_id: user.id,
          export_type: 'unlimited_status_export',
          filters: exportData.filters,
          total_items: exportData.totalFound,
          status: 'completed',
          file_path: fileName,
          file_size: excelBuffer.byteLength,
          metadata: {
            background: true,
            categories: exportData.categories?.length || 0,
            concurrent: true,
            unlimited: true
          }
        });

      if (historyError) {
        console.error('Failed to create export history:', historyError);
      }
    }

    // Return the Excel file as a downloadable response
    return new Response(excelBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': excelBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Export download generation failed:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate export download',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});