import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface InventoryItem {
  sku?: string;
  asin?: string;
  quantity: number;
  serial_number?: string;
  bin_serial_number?: string;
}

interface Integration {
  id: string;
  user_id: string;
  vendor_name: string;
  transport_method: string;
  sftp_host?: string;
  sftp_port?: number;
  sftp_username?: string;
  sftp_remote_path?: string;
  country: string;
  primary_key_type: string;
  feed_schedule: string;
  is_active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration_id, user_id, force_country } = await req.json();

    console.log('Generating vendor inventory feed', { integration_id, user_id, force_country });

    // Get integration configuration
    const { data: integration, error: integrationError } = await supabase
      .from('vendor_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('user_id', user_id)
      .single();

    if (integrationError || !integration) {
      throw new Error(`Integration not found: ${integrationError?.message}`);
    }

    const targetCountry = force_country || integration.country;
    console.log('Using country:', targetCountry);

    // Get current inventory based on primary key type
    let inventoryData: InventoryItem[] = [];
    
    if (integration.primary_key_type === 'SKU') {
      const { data: skuInventory, error: skuError } = await supabase
        .from('sku_inventory')
        .select('sku_number, quantity, bin_serial_number')
        .eq('user_id', user_id)
        .eq('country', targetCountry)
        .eq('status', 'in-stock')
        .gt('quantity', 0);

      if (skuError) throw new Error(`SKU inventory error: ${skuError.message}`);
      
      inventoryData = (skuInventory || []).map(item => ({
        sku: item.sku_number,
        quantity: item.quantity,
        bin_serial_number: item.bin_serial_number
      }));
    } else {
      const { data: asinInventory, error: asinError } = await supabase
        .from('asin_inventory')
        .select('asin, sku, quantity, serial_number')
        .eq('user_id', user_id)
        .eq('country', targetCountry)
        .eq('status', 'in-stock')
        .gt('quantity', 0);

      if (asinError) throw new Error(`ASIN inventory error: ${asinError.message}`);
      
      inventoryData = (asinInventory || []).map(item => ({
        asin: item.asin,
        sku: item.sku,
        quantity: item.quantity,
        serial_number: item.serial_number
      }));
    }

    console.log(`Found ${inventoryData.length} inventory items`);

    // Get item mappings for vendor-specific identifiers
    const { data: mappings } = await supabase
      .from('vendor_item_mappings')
      .select('*')
      .eq('integration_id', integration_id)
      .eq('country', targetCountry)
      .eq('is_active', true);

    const mappingLookup = new Map();
    (mappings || []).forEach(mapping => {
      const key = mapping.internal_sku || mapping.internal_asin;
      if (key) {
        mappingLookup.set(key, mapping);
      }
    });

    // Generate XML inventory feed
    const timestamp = new Date().toISOString();
    const fileName = `inventory_${targetCountry}_${Date.now()}.xml`;
    
    const xmlContent = generateInventoryXML(inventoryData, mappingLookup, integration, timestamp);
    
    console.log('Generated XML content, length:', xmlContent.length);

    // Store XML file in Supabase Storage (create bucket if needed)
    const bucketName = 'vendor-feeds';
    const filePath = `${user_id}/${fileName}`;

    // Try to create bucket (will fail silently if exists)
    await supabase.storage.createBucket(bucketName, { public: false });

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, xmlContent, {
        contentType: 'application/xml',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to store XML file: ${uploadError.message}`);
    }

    // Log the feed generation
    const { data: feedLog, error: logError } = await supabase
      .from('vendor_feed_logs')
      .insert({
        user_id,
        integration_id,
        feed_type: 'inventory',
        file_name: fileName,
        file_path: filePath,
        status: 'generated',
        total_items: inventoryData.length
      })
      .select()
      .single();

    if (logError) {
      console.error('Feed log error:', logError);
      throw new Error(`Failed to log feed: ${logError.message}`);
    }

    // Get signed URL for download
    const { data: signedUrl } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    return new Response(JSON.stringify({
      success: true,
      feed_log_id: feedLog.id,
      file_name: fileName,
      file_path: filePath,
      total_items: inventoryData.length,
      download_url: signedUrl?.signedUrl,
      country: targetCountry,
      primary_key_type: integration.primary_key_type
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vendor-inventory-feed:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateInventoryXML(inventoryData: InventoryItem[], mappingLookup: Map<string, any>, integration: Integration, timestamp: string): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<Message>
  <MessageID>INV_${Date.now()}</MessageID>
  <MessageType>Inventory</MessageType>
  <Version>1.0</Version>
  <TimeStamp>${timestamp}</TimeStamp>
  <Sender>
    <Name>Inventory Management System</Name>
    <Country>${integration.country}</Country>
  </Sender>
  <Inventory>`;

  const footer = `
  </Inventory>
</Message>`;

  const items = inventoryData.map(item => {
    const primaryId = integration.primary_key_type === 'SKU' ? item.sku : item.asin;
    const mapping = mappingLookup.get(primaryId);
    
    const vendorSku = mapping?.vendor_sku || item.sku || '';
    const vendorAsin = mapping?.vendor_asin || item.asin || '';
    const upc = mapping?.upc || '';
    
    return `
    <Item>
      <SKU>${escapeXml(vendorSku)}</SKU>
      ${vendorAsin ? `<ASIN>${escapeXml(vendorAsin)}</ASIN>` : ''}
      ${upc ? `<UPC>${escapeXml(upc)}</UPC>` : ''}
      <Quantity>${item.quantity}</Quantity>
      <Status>InStock</Status>
      <LastUpdated>${timestamp}</LastUpdated>
      ${item.serial_number ? `<SerialNumber>${escapeXml(item.serial_number)}</SerialNumber>` : ''}
      ${item.bin_serial_number ? `<BinLocation>${escapeXml(item.bin_serial_number)}</BinLocation>` : ''}
    </Item>`;
  }).join('');

  return header + items + footer;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}