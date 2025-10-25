import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";

console.log('🚀 Sunsky API Edge Function - Clean Implementation');

// ============================================
// CORS Configuration
// ============================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Standardized CORS response helper
function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// ============================================
// Supabase Client Setup
// ============================================
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ Environment ready:', { hasUrl: !!supabaseUrl, hasServiceKey: !!supabaseServiceKey });

// ============================================
// MD5 Hash Implementation (for Sunsky signature)
// ============================================
async function md5(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// Sunsky API Signature Generation
// ============================================
// Per Sunsky docs:
// 1. Sort parameters by key alphabetically
// 2. Concatenate values (keep whitespace)
// 3. Append '@' + secret
// 4. Calculate MD5 hash
async function generateSignature(
  params: Record<string, any>,
  key: string,
  secret: string
): Promise<string> {
  // Add key to params
  const allParams = { ...params, key };
  
  // Sort keys alphabetically
  const sortedKeys = Object.keys(allParams).sort();
  
  // Concatenate values
  const valueString = sortedKeys.map(k => String(allParams[k])).join('');
  
  // Append @secret
  const stringToHash = `${valueString}@${secret}`;
  
  console.log('🔐 Signature generation:', {
    sortedKeys,
    valueStringLength: valueString.length,
    hasSecret: !!secret
  });
  
  return await md5(stringToHash);
}

// ============================================
// Get User Credentials
// ============================================
async function getCredentials(userId: string, apiId?: string) {
  console.log('🔑 Fetching credentials for user:', userId, 'apiId:', apiId);
  
  // Try user-specific credentials first
  if (apiId) {
    const { data, error } = await supabase
      .from('sunsky_credentials')
      .select('api_key, api_secret')
      .eq('id', apiId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (!error && data) {
      console.log('✅ Found user credentials (ID)');
      return { key: data.api_key, secret: data.api_secret };
    }
  }
  
  // Try any active credential for user
  const { data, error } = await supabase
    .from('sunsky_credentials')
    .select('api_key, api_secret')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!error && data) {
    console.log('✅ Found user credentials (any)');
    return { key: data.api_key, secret: data.api_secret };
  }
  
  // Fallback to environment variables
  const envKey = Deno.env.get('SUNSKY_API_KEY');
  const envSecret = Deno.env.get('SUNSKY_API_SECRET');
  
  if (envKey && envSecret) {
    console.log('✅ Using environment credentials');
    return { key: envKey, secret: envSecret };
  }
  
  throw new Error('No Sunsky API credentials found');
}

// ============================================
// Call Sunsky API
// ============================================
async function callSunskyAPI(
  endpoint: string,
  params: Record<string, any>,
  key: string,
  secret: string,
  expectBinary = false
) {
  const baseUrl = 'https://open.sunsky-online.com';
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`📡 Calling Sunsky API: ${endpoint}${expectBinary ? ' (binary response)' : ''}`);
  
  // Generate signature
  const signature = await generateSignature(params, key, secret);
  
  // Build form data
  const formData = new URLSearchParams();
  formData.append('key', key);
  formData.append('signature', signature);
  
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      formData.append(k, String(v));
    }
  }
  
  console.log('📤 Request params:', Object.keys(params));
  
  // Make request
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });
  
  console.log(`📥 Response status: ${response.status}, content-type: ${response.headers.get('content-type')}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sunsky API error: ${response.status} ${errorText}`);
  }
  
  // For binary responses (like ZIP files), return the response object
  if (expectBinary) {
    return response;
  }
  
  // For JSON responses, parse the text
  const responseText = await response.text();
  
  try {
    const data = JSON.parse(responseText);
    
    if (data.result === 'error') {
      const errorMsg = data.messages?.join(', ') || data.message || 'Sunsky API error';
      throw new Error(errorMsg);
    }
    
    return data;
  } catch (e) {
    // Check if response is a plain text error from Sunsky
    if (responseText.includes('NO_PERMISSION_DUE_TO_USER_STATUS')) {
      throw new Error('Invalid Sunsky API credentials or account not active. Please verify your API key and secret are correct and your Sunsky account is in good standing.');
    }
    
    // If it's already our custom error, rethrow it
    if (e instanceof Error && !e.message.includes('JSON')) {
      throw e;
    }
    
    console.error('❌ Failed to parse response:', responseText.substring(0, 500));
    throw new Error(`Invalid response from Sunsky API. Please check your credentials.`);
  }
}

// ============================================
// Action Handlers
// ============================================

async function handleSearchProducts(params: any, key: string, secret: string) {
  console.log('🔍 Search Products:', params);
  
  const searchParams: Record<string, any> = {
    lang: params.lang || 'en',
    page: params.page || 1,
    pageSize: Math.min(params.pageSize || 100, 100),
    status: params.status || 1
  };
  
  // Optional filters
  if (params.categoryId) searchParams.categoryId = params.categoryId;
  if (params.brandName) searchParams.brandName = params.brandName;
  if (params.keyword) searchParams.keyword = params.keyword;
  if (params.gmtModifiedStart) searchParams.gmtModifiedStart = params.gmtModifiedStart;
  if (params.leadTimeLevel) searchParams.leadTimeLevel = params.leadTimeLevel;
  
  const result = await callSunskyAPI('/openapi/product!search.do', searchParams, key, secret);
  
  return {
    result: 'success',
    data: {
      products: result.data || [],
      total: result.total || 0,
      totalResults: result.total || 0, // Add for compatibility
      pageCount: result.pageCount || 0,
      page: searchParams.page,
      pageSize: searchParams.pageSize
    }
  };
}

async function handleGetProductDetails(params: any, key: string, secret: string) {
  console.log('📦 Get Product Details:', params.itemNo);
  
  if (!params.itemNo) {
    throw new Error('itemNo is required');
  }
  
  const detailParams = {
    lang: params.lang || 'en',
    itemNo: params.itemNo
  };
  
  const result = await callSunskyAPI('/openapi/product!detail.do', detailParams, key, secret);
  
  return {
    result: 'success',
    data: result.data || result
  };
}

async function handleGetCategories(params: any, key: string, secret: string) {
  console.log('📂 Get Categories:', params);
  
  const categoryParams: Record<string, any> = {
    lang: params.lang || 'en'
  };
  
  if (params.parentId !== undefined) {
    categoryParams.parentId = params.parentId;
  }
  if (params.gmtModifiedStart) {
    categoryParams.gmtModifiedStart = params.gmtModifiedStart;
  }
  
  const result = await callSunskyAPI('/openapi/category!getChildren.do', categoryParams, key, secret);
  
  return {
    result: 'success',
    data: result.data || []
  };
}

async function handleGetBrands(_params: any, key: string, secret: string) {
  console.log('🏷️ Get Brands - extracting from products');
  
  // Search all products and extract unique brands
  const searchParams = {
    lang: 'en',
    page: 1,
    pageSize: 100,
    status: 1
  };
  
  const result = await callSunskyAPI('/openapi/product!search.do', searchParams, key, secret);
  
  const brands = new Set<string>();
  // Handle both array and object response formats
  const products = Array.isArray(result.data) ? result.data : (result.data?.products || []);
  
  for (const product of products) {
    if (product.brandName) {
      brands.add(product.brandName);
    }
  }
  
  return {
    result: 'success',
    data: Array.from(brands).sort().map(name => ({ name }))
  };
}

async function handleGetCountries(_params: any, key: string, secret: string) {
  console.log('🌍 Get Countries');
  
  const result = await callSunskyAPI('/openapi/order!getCountries.do', {}, key, secret);
  
  return {
    result: 'success',
    data: result.data || []
  };
}

async function handleCreateOrder(params: any, key: string, secret: string) {
  console.log('🛒 Create Order:', params);
  
  // Handle both direct params and wrapped in orderData
  const orderData = params.orderData || params;
  
  if (!orderData.deliveryAddress || !orderData.items) {
    throw new Error('deliveryAddress and items are required');
  }
  
  // Build order params according to Sunsky API docs
  const orderParams: Record<string, any> = {
    useBalanceOnly: orderData.useBalanceOnly || false
  };
  
  // Optional fields
  if (orderData.siteNumber) orderParams.siteNumber = orderData.siteNumber;
  if (orderData.vatNumber) orderParams.vatNumber = orderData.vatNumber;
  if (orderData.eoriNumber) orderParams.eoriNumber = orderData.eoriNumber;
  if (orderData.iossNumber) orderParams.iossNumber = orderData.iossNumber;
  if (orderData.coupon) orderParams.coupon = orderData.coupon;
  
  // Delivery address
  const addr = orderData.deliveryAddress;
  orderParams['deliveryAddress.countryId'] = addr.countryId;
  orderParams['deliveryAddress.state'] = addr.state;
  orderParams['deliveryAddress.city'] = addr.city;
  orderParams['deliveryAddress.address'] = addr.address;
  orderParams['deliveryAddress.postcode'] = addr.postcode;
  orderParams['deliveryAddress.receiver'] = addr.receiver;
  orderParams['deliveryAddress.shippingWayId'] = addr.shippingWayId;
  
  if (addr.company) orderParams['deliveryAddress.company'] = addr.company;
  if (addr.address2) orderParams['deliveryAddress.address2'] = addr.address2;
  if (addr.telephone) orderParams['deliveryAddress.telephone'] = addr.telephone;
  if (addr.email) orderParams['deliveryAddress.email'] = addr.email;
  if (addr.shipment) orderParams['deliveryAddress.shipment'] = addr.shipment;
  
  // Items
  orderData.items.forEach((item: any, index: number) => {
    const i = index + 1;
    orderParams[`items.${i}.itemNo`] = item.itemNo;
    orderParams[`items.${i}.qty`] = item.qty;
    if (item.remark) orderParams[`items.${i}.remark`] = item.remark;
  });
  
  const result = await callSunskyAPI('/openapi/order!createOrder.do', orderParams, key, secret);
  
  return {
    result: 'success',
    data: result.data || result
  };
}

async function handleGetOrders(params: any, key: string, secret: string) {
  console.log('📋 Get Orders:', params);
  
  const orderParams: Record<string, any> = {
    page: params.page || 1,
    pageSize: Math.min(params.pageSize || 40, 100)
  };
  
  if (params.status) orderParams.status = params.status;
  if (params.siteNumber) orderParams.siteNumber = params.siteNumber;
  if (params.gmtCreatedStart) orderParams.gmtCreatedStart = params.gmtCreatedStart;
  if (params.gmtCreatedEnd) orderParams.gmtCreatedEnd = params.gmtCreatedEnd;
  
  const result = await callSunskyAPI('/openapi/order!getOrderList.do', orderParams, key, secret);
  
  return {
    result: 'success',
    data: {
      orders: result.data || [],
      total: result.total || 0,
      pageCount: result.pageCount || 0
    }
  };
}

async function handleGetOrderDetails(params: any, key: string, secret: string) {
  const orderNumber = params.orderNumber || params.number;
  console.log('📄 Get Order Details:', orderNumber);
  
  if (!orderNumber) {
    throw new Error('order number is required');
  }
  
  const result = await callSunskyAPI('/openapi/order!getOrderDetails.do', { number: orderNumber }, key, secret);
  
  return {
    result: 'success',
    data: result.data || result
  };
}

async function handleGetAllOrders(userId: string, params: any, key: string, secret: string) {
  console.log('📋 Get All Orders and Sync to Database', {
    dateRange: params.gmtCreatedStart ? `${params.gmtCreatedStart} to ${params.gmtCreatedEnd}` : 'All time'
  });
  
  const orderParams: Record<string, any> = {
    page: 1,
    pageSize: 100 // Max allowed
  };
  
  // Add date filters if provided
  if (params.gmtCreatedStart) orderParams.gmtCreatedStart = params.gmtCreatedStart;
  if (params.gmtCreatedEnd) orderParams.gmtCreatedEnd = params.gmtCreatedEnd;
  
  const skipOrderNumbers = new Set(params.skipDeliveredOrders || []);
  const allOrders = [];
  let page = 1;
  let hasMore = true;
  
  // Fetch all pages
  while (hasMore) {
    orderParams.page = page;
    const result = await callSunskyAPI('/openapi/order!getOrderList.do', orderParams, key, secret);
    
    console.log('📥 Full API Response:', JSON.stringify(result, null, 2).substring(0, 500));
    
    // The response structure is: { result: "success", data: { list: [...], total: X, pageCount: Y } }
    let orders = [];
    let total = 0;
    let pageCount = 1;
    
    if (result.data) {
      // Extract the actual list from result.data
      if (Array.isArray(result.data.result)) {
        orders = result.data.result;  // Sunsky API returns orders here
      } else if (Array.isArray(result.data.list)) {
        orders = result.data.list;
      } else if (Array.isArray(result.data.orders)) {
        orders = result.data.orders;
      } else if (Array.isArray(result.data)) {
        orders = result.data;
      }
      
      // Extract pagination info
      total = result.data.total || result.total || 0;
      pageCount = result.data.pageCount || result.pageCount || 1;
    }
    
    console.log(`📦 Page ${page}/${pageCount}: ${orders.length} orders (${total} total)`);
    
    if (!Array.isArray(orders)) {
      console.error('❌ Orders is not an array. Response data keys:', Object.keys(result.data || {}));
      throw new Error('Invalid response format from Sunsky API - expected array of orders');
    }
    
    for (const order of orders) {
      if (!skipOrderNumbers.has(order.number)) {
        allOrders.push(order);
      }
    }
    
    hasMore = page < pageCount && orders.length > 0;
    page++;
    
    if (page > 100) { // Safety limit
      console.warn('⚠️ Reached page limit of 100');
      break;
    }
  }
  
  console.log(`✅ Fetched ${allOrders.length} orders (${skipOrderNumbers.size} skipped)`);
  
  // Now save orders to database with their items
  for (const order of allOrders) {
    try {
      // Fetch order details to get items
      const detailsResult = await callSunskyAPI('/openapi/order!getOrderDetails.do', { number: order.number }, key, secret);
      const fullOrder = detailsResult.data || detailsResult;
      
      // Save order to database
      const { error: orderError } = await supabase
        .from('sunsky_orders')
        .upsert({
          user_id: userId,
          number: fullOrder.number,
          status: String(fullOrder.status),
          site_number: fullOrder.siteNumber,
          gmt_created: fullOrder.gmtCreated,
          total: fullOrder.totalAmount,
          currency: 'USD',
          shipping_company: fullOrder.deliveryAddress?.shippingWay?.name,
          tracking_number: fullOrder.trackingNumber,
          tracking_url: fullOrder.deliveryAddress?.shippingWay?.queryUrl,
          raw: fullOrder,
          status_last_updated_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          sunsky_credentials_id: params.apiId
        }, {
          onConflict: 'user_id,number'
        });
      
      if (orderError) {
        console.error(`❌ Error saving order ${order.number}:`, orderError);
        continue;
      }
      
      // Save order items and fetch their images
      if (fullOrder.detailList && fullOrder.detailList.length > 0) {
        const items = fullOrder.detailList.map((item: any) => ({
          user_id: userId,
          order_number: fullOrder.number,
          sku_code: item.itemNo,
          model_number: item.itemNo,
          title: item.title,
          quantity: item.qty,
          unit_price: item.price,
          currency: 'USD',
          item_status: '0',
          status_last_updated_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          raw: item
        }));
        
        const { error: itemsError } = await supabase
          .from('sunsky_order_items')
          .upsert(items, {
            onConflict: 'user_id,order_number,sku_code'
          });
        
        if (itemsError) {
          console.error(`❌ Error saving items for order ${order.number}:`, itemsError);
        }
        
        // Fetch and save product images for each item
        for (const item of fullOrder.detailList) {
          try {
            console.log(`🖼️ Fetching images for ${item.itemNo}...`);
            
            // Get product details with images
            const itemDetailsResult = await callSunskyAPI('/openapi/item!getItemDetail.do', {
              itemNo: item.itemNo
            }, key, secret);
            
            const itemDetails = itemDetailsResult.data || itemDetailsResult;
            
            // Extract images from the response
            let images: any[] = [];
            if (itemDetails.imageList && Array.isArray(itemDetails.imageList)) {
              images = itemDetails.imageList;
            } else if (itemDetails.images && Array.isArray(itemDetails.images)) {
              images = itemDetails.images;
            } else if (itemDetails.data?.imageList && Array.isArray(itemDetails.data.imageList)) {
              images = itemDetails.data.imageList;
            }
            
            // Save images to database
            if (images.length > 0) {
              const imageRecords = images.map((img: any, index: number) => {
                let imageUrl = '';
                if (typeof img === 'string') {
                  imageUrl = img;
                } else if (img.url) {
                  imageUrl = img.url;
                } else if (img.imageUrl) {
                  imageUrl = img.imageUrl;
                }
                
                return {
                  user_id: userId,
                  item_no: item.itemNo,
                  image_url: imageUrl,
                  image_order: index,
                  image_type: index === 0 ? 'main' : 'additional',
                  download_status: 'pending'
                };
              }).filter(record => record.image_url); // Only keep records with valid URLs
              
              if (imageRecords.length > 0) {
                const { error: imageError } = await supabase
                  .from('sunsky_product_images')
                  .upsert(imageRecords, {
                    onConflict: 'user_id,item_no,image_order',
                    ignoreDuplicates: true
                  });
                
                if (imageError) {
                  console.error(`❌ Error saving images for ${item.itemNo}:`, imageError);
                } else {
                  console.log(`✅ Saved ${imageRecords.length} images for ${item.itemNo}`);
                }
              }
            }
          } catch (imgError) {
            console.error(`⚠️ Failed to fetch images for ${item.itemNo}:`, imgError);
            // Don't fail the whole order sync if image fetch fails
          }
        }
      }
      
    } catch (err) {
      console.error(`❌ Error processing order ${order.number}:`, err);
    }
  }
  
  return {
    result: 'success',
    data: {
      orders: allOrders,
      skippedCount: skipOrderNumbers.size
    }
  };
}

async function handleGetPricesAndFreights(params: any, key: string, secret: string) {
  console.log('💰 Get Prices and Freights:', params);
  
  if (!params.deliveryAddress || !params.items) {
    throw new Error('deliveryAddress and items are required');
  }
  
  // Delivery address
  const addr = params.deliveryAddress;
  
  // Validate required delivery address fields
  if (!addr.countryId) {
    throw new Error('deliveryAddress.countryId is required');
  }
  if (!addr.city) {
    throw new Error('deliveryAddress.city is required');
  }
  if (!addr.postcode) {
    throw new Error('deliveryAddress.postcode is required');
  }
  
  // Validate items
  if (!Array.isArray(params.items) || params.items.length === 0) {
    throw new Error('At least one item is required');
  }
  
  console.log('📋 Request details:', {
    countryId: addr.countryId,
    city: addr.city,
    postcode: addr.postcode,
    itemCount: params.items.length
  });
  
  // Build request params according to Sunsky API docs
  // NOTE: For getPricesAndFreights, parameters are NOT prefixed with "deliveryAddress."
  // That prefix is only for createOrder!
  const requestParams: Record<string, any> = {};
  
  // countryId and state are top-level parameters (not deliveryAddress.*)
  requestParams['countryId'] = String(addr.countryId);
  
  // Only include state if it has a meaningful value
  if (addr.state && addr.state.trim()) {
    requestParams['state'] = addr.state.trim();
  }
  
  // Items
  params.items.forEach((item: any, index: number) => {
    const i = index + 1;
    requestParams[`items.${i}.itemNo`] = item.itemNo;
    requestParams[`items.${i}.qty`] = item.qty;
  });
  
  console.log('📤 Requesting prices and freights with params:', {
    countryId: addr.countryId,
    city: addr.city,
    itemCount: params.items.length
  });
  
  try {
    const result = await callSunskyAPI('/openapi/order!getPricesAndFreights.do', requestParams, key, secret);
    
    return {
      result: 'success',
      data: result.data || result
    };
  } catch (error: any) {
    // Check if this is an ITEM_NOT_EXIST error
    const errorMessage = error.message || '';
    if (errorMessage.includes('ITEM_NOT_EXIST')) {
      // Return error as a structured response instead of throwing
      // This allows the frontend to handle it gracefully
      return {
        result: 'error',
        message: 'ITEM_NOT_EXIST',
        messages: ['ITEM_NOT_EXIST'],
        originalError: 'ITEM_NOT_EXIST',
        details: 'One or more items are not available in Sunsky catalog'
      };
    }
    
    // For other errors, re-throw to be handled by the main error handler
    throw error;
  }
}

async function handleTestCredentials(_params: any, key: string, secret: string) {
  console.log('🧪 Test Credentials');
  
  // Simple test: fetch categories
  const result = await callSunskyAPI('/openapi/category!getChildren.do', { lang: 'en', parentId: 0 }, key, secret);
  
  return {
    result: 'success',
    message: 'Credentials are valid',
    data: { categoriesFound: result.data?.length || 0 }
  };
}

async function handleDownloadImages(userId: string, params: any, key: string, secret: string) {
  console.log('📥 Download Images - Starting:', { userId, itemCount: params.itemNos?.length });
  
  const { itemNos, size, watermark, jobId } = params;
  
  if (!itemNos || !Array.isArray(itemNos) || itemNos.length === 0) {
    throw new Error('itemNos array is required');
  }

  // Update job status to processing if jobId provided
  if (jobId) {
    await supabase
      .from('sunsky_import_jobs')
      .update({
        status: 'processing',
        processed_items: 0,
        success_count: 0,
        error_count: 0
      })
      .eq('id', jobId);
  }
  
  console.log(`📦 Processing ${itemNos.length} items using Sunsky official image API`);
  
  const results = [];
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  
  for (const itemNo of itemNos) {
    try {
      console.log(`🔍 [${itemNo}] Fetching images from Sunsky API`);
      
      // Call Sunsky's official image API - returns ZIP file
      const imageParams = {
        itemNo: itemNo,
        size: size || 800,
        watermark: watermark || ''
      };
      
      const response = await callSunskyAPI(
        '/openapi/product!getImages.do',
        imageParams,
        key,
        secret,
        true // Expect binary response
      );
      
      // Check if response is successful
      if (!response.ok) {
        console.warn(`⚠️ [${itemNo}] No images available (${response.status})`);
        results.push({
          itemNo,
          status: 'failed',
          error: 'No images available for this product'
        });
        continue;
      }
      
      // Get ZIP file data
      console.log(`📦 [${itemNo}] Downloading ZIP file`);
      const zipData = await response.arrayBuffer();
      const zipSizeKB = (zipData.byteLength / 1024).toFixed(2);
      console.log(`✅ [${itemNo}] Downloaded ZIP: ${zipSizeKB}KB`);
      
      // Extract images from ZIP
      console.log(`📂 [${itemNo}] Extracting images from ZIP`);
      const zip = await JSZip.loadAsync(zipData);
      
      // Get all image files from ZIP
      const imageFiles = Object.keys(zip.files).filter(name => 
        !zip.files[name].dir && name.match(/\.(jpg|jpeg|png|gif)$/i)
      );
      
      console.log(`📸 [${itemNo}] Found ${imageFiles.length} images in ZIP`);
      
      if (imageFiles.length === 0) {
        console.warn(`⚠️ [${itemNo}] ZIP file contains no images`);
        results.push({
          itemNo,
          status: 'failed',
          error: 'ZIP file contains no images'
        });
        continue;
      }
      
      // Process each image
      let savedImagesCount = 0;
      let thumbnailPublicUrl = '';
      
      for (let i = 0; i < imageFiles.length; i++) {
        const fileName = imageFiles[i];
        const imageType = i === 0 ? 'thumbnail' : 'gallery';
        
        try {
          console.log(`🖼️ [${itemNo}] Processing image ${i + 1}/${imageFiles.length}: ${fileName}`);
          
          // Extract image data
          const imageBlob = await zip.files[fileName].async('arraybuffer');
          const imageSizeKB = (imageBlob.byteLength / 1024).toFixed(2);
          console.log(`✅ [${itemNo}] Extracted ${imageSizeKB}KB`);
          
          // Determine file extension
          const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
          
          // Generate storage path
          const storagePath = `sunsky-images/${userId}/${itemNo}/image_${i}.${ext}`;
          
          console.log(`📤 [${itemNo}] Uploading to storage: ${storagePath}`);
          
          // Upload to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(storagePath, imageBlob, {
              contentType: contentType,
              upsert: true
            });
          
          if (uploadError) {
            console.error(`❌ [${itemNo}] Storage upload failed:`, JSON.stringify(uploadError));
            continue;
          }
          
          console.log(`✅ [${itemNo}] Uploaded successfully`);
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(storagePath);
          
          console.log(`🔗 [${itemNo}] Public URL: ${publicUrl}`);
          
          // Store first image's public URL as thumbnail
          if (i === 0) {
            thumbnailPublicUrl = publicUrl;
          }
          
          // Save to database
          console.log(`💾 [${itemNo}] Saving image record to database`);
          const { error: dbError } = await supabase
            .from('sunsky_product_images')
            .upsert({
              user_id: userId,
              item_no: itemNo,
              image_url: `sunsky-zip/${fileName}`,
              storage_path: storagePath,
              image_order: i,
              image_type: imageType,
              download_status: 'completed',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,item_no,image_order'
            });
          
          if (dbError) {
            console.error(`❌ [${itemNo}] Database insert failed:`, JSON.stringify(dbError));
          } else {
            console.log(`✅ [${itemNo}] Database record saved`);
            savedImagesCount++;
          }
          
        } catch (imgError: any) {
          console.error(`❌ [${itemNo}] Error processing image ${fileName}:`, imgError.message);
        }
      }
      
      // Update sunsky_skus table
      if (savedImagesCount > 0) {
        console.log(`🔄 [${itemNo}] Updating SKU record with ${savedImagesCount} images`);
        
        const { error: updateError } = await supabase
          .from('sunsky_skus')
          .update({
            thumbnail_url: thumbnailPublicUrl,
            image_count: savedImagesCount,
            images_downloaded: true,
            images_download_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('sku_code', itemNo);
        
        if (updateError) {
          console.error(`❌ [${itemNo}] Failed to update SKU record:`, JSON.stringify(updateError));
        } else {
          console.log(`✅ [${itemNo}] SKU record updated`);
        }
      }
      
      results.push({
        itemNo,
        status: 'success',
        imageCount: savedImagesCount
      });
      
      processedCount++;
      successCount++;
      
      // Update job progress
      if (jobId) {
        await supabase
          .from('sunsky_import_jobs')
          .update({
            processed_items: processedCount,
            success_count: successCount,
            error_count: errorCount
          })
          .eq('id', jobId);
      }
      
      console.log(`✅ [${itemNo}] Complete: ${savedImagesCount} images saved`);
      
    } catch (error: any) {
      console.error(`❌ [${itemNo}] Fatal error:`, error.message);
      results.push({
        itemNo,
        status: 'failed',
        error: error.message
      });
      
      processedCount++;
      errorCount++;
      
      // Update job progress
      if (jobId) {
        await supabase
          .from('sunsky_import_jobs')
          .update({
            processed_items: processedCount,
            success_count: successCount,
            error_count: errorCount
          })
          .eq('id', jobId);
      }
    }
  }
  
  const finalSuccessCount = results.filter(r => r.status === 'success').length;
  
  // Mark job as completed
  if (jobId) {
    await supabase
      .from('sunsky_import_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: results.length,
        success_count: finalSuccessCount,
        error_count: results.length - finalSuccessCount
      })
      .eq('id', jobId);
  }
  
  console.log(`✅ Download Complete: ${finalSuccessCount}/${results.length} items processed successfully`);
  
  return {
    result: 'success',
    data: {
      total: results.length,
      success: finalSuccessCount,
      failed: results.length - finalSuccessCount,
      results
    }
  };
}

// ============================================
// Credential Management Handlers
// ============================================

async function handleAddApiKey(userId: string, params: any, supabaseClient: any) {
  console.log('➕ Add API Key:', params.name);
  
  const { apiKey, apiSecret, name } = params;
  
  if (!apiKey || !apiSecret || !name) {
    throw new Error('apiKey, apiSecret, and name are required');
  }
  
  // Extract last 4 characters for display
  const keyLast4 = apiKey.slice(-4);
  
  // Insert credentials using service role client for write operations
  const { data, error } = await supabase
    .from('sunsky_credentials')
    .insert({
      user_id: userId,
      name,
      api_key: apiKey,
      api_secret: apiSecret,
      key_last4: keyLast4,
      is_active: true
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to save credentials:', error);
    throw new Error(`Failed to save credentials: ${error.message}`);
  }
  
  console.log('✅ Credentials saved:', data.id);
  
  return {
    result: 'success',
    message: 'API key added successfully',
    data: {
      id: data.id,
      name: data.name,
      key_last4: data.key_last4
    }
  };
}

async function handleDeleteApiKey(userId: string, apiId: string, supabaseClient: any) {
  console.log('🗑️ Delete API Key:', apiId);
  
  if (!apiId) {
    throw new Error('apiId is required');
  }
  
  // Verify ownership and delete using service role client
  const { error } = await supabase
    .from('sunsky_credentials')
    .delete()
    .eq('id', apiId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('❌ Failed to delete credentials:', error);
    throw new Error(`Failed to delete credentials: ${error.message}`);
  }
  
  console.log('✅ Credentials deleted');
  
  return {
    result: 'success',
    message: 'API key deleted successfully'
  };
}

async function handleToggleApiKey(userId: string, apiId: string, isActive: boolean, supabaseClient: any) {
  console.log('🔄 Toggle API Key:', apiId, 'active:', isActive);
  
  if (!apiId || isActive === undefined) {
    throw new Error('apiId and isActive are required');
  }
  
  // Verify ownership and update using service role client
  const { error } = await supabase
    .from('sunsky_credentials')
    .update({ 
      is_active: isActive,
      last_tested: isActive ? new Date().toISOString() : undefined
    })
    .eq('id', apiId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('❌ Failed to update credentials:', error);
    throw new Error(`Failed to update credentials: ${error.message}`);
  }
  
  console.log('✅ Credentials updated');
  
  return {
    result: 'success',
    message: `API key ${isActive ? 'activated' : 'deactivated'} successfully`
  };
}

async function handleListApiKeys(userId: string, supabaseClient: any) {
  console.log('📋 List API Keys for user:', userId);
  
  // Use service role client to fetch credentials
  const { data, error } = await supabase
    .from('sunsky_credentials')
    .select('id, name, key_last4, is_active, last_tested, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Failed to fetch credentials:', error);
    throw new Error(`Failed to fetch credentials: ${error.message}`);
  }
  
  console.log(`✅ Found ${data.length} credentials`);
  
  return {
    result: 'success',
    data: data || []
  };
}

// ============================================
// Main Handler
// ============================================
serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`\n🔷 [${requestId}] ${req.method} ${req.url}`);
  
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('✅ CORS preflight');
      return new Response(null, { headers: corsHeaders });
    }
    
    // Only accept POST
    if (req.method !== 'POST') {
      return corsResponse({
        result: 'error',
        message: 'Method not allowed'
      }, 405);
    }
    
    // Parse request body
    const body = await req.json();
    const { action, apiId, ...params } = body;
    
    console.log(`📦 Action: ${action}, ApiId: ${apiId || 'none'}`);
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({
        result: 'error',
        message: 'Missing authorization header'
      }, 401);
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return corsResponse({
        result: 'error',
        message: 'Unauthorized'
      }, 401);
    }
    
    console.log(`✅ User authenticated: ${user.id}`);
    
    // Route to action handler
    let result;
    
    // Handle credential management actions (don't need Sunsky credentials)
    switch (action) {
      case 'addApiKey':
        result = await handleAddApiKey(user.id, params, supabaseClient);
        break;
      
      case 'deleteApiKey':
        result = await handleDeleteApiKey(user.id, apiId, supabaseClient);
        break;
      
      case 'toggleApiKeyActive':
        result = await handleToggleApiKey(user.id, apiId, params.isActive, supabaseClient);
        break;
      
      case 'listApiKeys':
        result = await handleListApiKeys(user.id, supabaseClient);
        break;
      
      case 'getCredentialsStatus':
        // Check if user has any active credentials
        console.log('🔍 Checking credentials status for user:', user.id);
        const { data: credentialsCheck, error: credCheckError } = await supabase
          .from('sunsky_credentials')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);
        
        console.log('📊 Credentials check result:', { 
          hasData: !!credentialsCheck, 
          count: credentialsCheck?.length || 0,
          error: credCheckError 
        });
        
        result = {
          result: 'success',
          hasCredentials: credentialsCheck && credentialsCheck.length > 0
        };
        console.log('✅ Returning credentials status:', result);
        break;
      
      // Handle ping/connection test
      case 'ping':
        result = { result: 'success', message: 'Edge function is running' };
        break;
      
      // All other actions need Sunsky credentials
      case 'searchProducts':
      case 'getProductDetails':
      case 'getCategories':
      case 'getBrands':
      case 'getCountries':
      case 'getPricesAndFreights':
      case 'createOrder':
      case 'getOrders':
      case 'getAllOrders':
      case 'getOrderDetails':
      case 'testCredentials':
      case 'download_images': {
        // Get credentials for Sunsky API calls
        const credentials = await getCredentials(user.id, apiId);
        
        switch (action) {
          case 'searchProducts':
            result = await handleSearchProducts(params, credentials.key, credentials.secret);
            break;
          
          case 'getProductDetails':
            result = await handleGetProductDetails(params, credentials.key, credentials.secret);
            break;
          
          case 'getCategories':
            result = await handleGetCategories(params, credentials.key, credentials.secret);
            break;
          
          case 'getBrands':
            result = await handleGetBrands(params, credentials.key, credentials.secret);
            break;
          
          case 'getCountries':
            result = await handleGetCountries(params, credentials.key, credentials.secret);
            break;
          
          case 'getPricesAndFreights':
            result = await handleGetPricesAndFreights(params, credentials.key, credentials.secret);
            break;
          
          case 'createOrder':
            result = await handleCreateOrder(params, credentials.key, credentials.secret);
            break;
          
          case 'getOrders':
            result = await handleGetOrders(params, credentials.key, credentials.secret);
            break;
          
          case 'getAllOrders':
            result = await handleGetAllOrders(user.id, params, credentials.key, credentials.secret);
            break;
          
          case 'getOrderDetails':
            result = await handleGetOrderDetails(params, credentials.key, credentials.secret);
            break;
          
          case 'testCredentials':
            result = await handleTestCredentials(params, credentials.key, credentials.secret);
            break;
          
          case 'download_images':
            result = await handleDownloadImages(user.id, params, credentials.key, credentials.secret);
            break;
        }
        break;
      }
      
      default:
        return corsResponse({
          result: 'error',
          message: `Unknown action: ${action}`
        }, 400);
    }
    
    console.log(`✅ [${requestId}] Success`);
    return corsResponse(result);
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);
    return corsResponse({
      result: 'error',
      message: error.message || 'Internal server error',
      details: error.toString()
    }, 500);
  }
});
