import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

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
  secret: string
) {
  const baseUrl = 'https://open.sunsky-online.com';
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`📡 Calling Sunsky API: ${endpoint}`);
  
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
  
  const responseText = await response.text();
  console.log(`📥 Response status: ${response.status}, length: ${responseText.length}`);
  
  if (!response.ok) {
    throw new Error(`Sunsky API error: ${response.status} ${responseText}`);
  }
  
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
    pageSize: Math.min(params.pageSize || 10, 100),
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
  
  if (!params.deliveryAddress || !params.items) {
    throw new Error('deliveryAddress and items are required');
  }
  
  // Build order params according to Sunsky API docs
  const orderParams: Record<string, any> = {
    useBalanceOnly: params.useBalanceOnly || false
  };
  
  // Optional fields
  if (params.siteNumber) orderParams.siteNumber = params.siteNumber;
  if (params.vatNumber) orderParams.vatNumber = params.vatNumber;
  if (params.eoriNumber) orderParams.eoriNumber = params.eoriNumber;
  if (params.iossNumber) orderParams.iossNumber = params.iossNumber;
  if (params.coupon) orderParams.coupon = params.coupon;
  
  // Delivery address
  const addr = params.deliveryAddress;
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
  params.items.forEach((item: any, index: number) => {
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
  console.log('📄 Get Order Details:', params.number);
  
  if (!params.number) {
    throw new Error('order number is required');
  }
  
  const result = await callSunskyAPI('/openapi/order!getOrderDetails.do', { number: params.number }, key, secret);
  
  return {
    result: 'success',
    data: result.data || result
  };
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
      case 'createOrder':
      case 'getOrders':
      case 'getOrderDetails':
      case 'testCredentials': {
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
          
          case 'createOrder':
            result = await handleCreateOrder(params, credentials.key, credentials.secret);
            break;
          
          case 'getOrders':
            result = await handleGetOrders(params, credentials.key, credentials.secret);
            break;
          
          case 'getOrderDetails':
            result = await handleGetOrderDetails(params, credentials.key, credentials.secret);
            break;
          
          case 'testCredentials':
            result = await handleTestCredentials(params, credentials.key, credentials.secret);
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
