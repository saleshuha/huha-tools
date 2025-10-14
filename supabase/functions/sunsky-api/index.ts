import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5/dist/main/index.js";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

console.log('🚀 Sunsky API Edge Function Initialized');

// CORS headers for security  
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('✅ Environment variables loaded:', {
  hasUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// MD5 implementation for Sunsky API signature
async function md5(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate SHA-256 hash for API key
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Level 9 rate limits from Sunsky API documentation
const DEFAULT_RATE_LIMITS = {
  "category.getChildren": { minute: 480, day: 1000000 },
  "product.search": { minute: 480, day: 1000000 },
  "product.detail": { minute: 480, day: 1000000 },
  "order.getCountries": { minute: 480, day: 1000000 },
  "order.getPricesAndFreights": { minute: 480, day: 1000000 },
  "order.createOrder": { minute: 100, day: 10000 }
};

// Get rate limits from environment or use defaults
function getRateLimits(): Record<string, { minute: number; day: number }> {
  const rateLimitsEnv = Deno.env.get('SUNSKY_RATE_LIMITS');
  if (rateLimitsEnv) {
    try {
      return JSON.parse(rateLimitsEnv);
    } catch (error) {
      console.error('Failed to parse SUNSKY_RATE_LIMITS, using defaults:', error);
    }
  }
  return DEFAULT_RATE_LIMITS;
}

// Get endpoint key from URL path
function getEndpointKey(url: string): string {
  if (url.includes('category!getChildren.do')) return 'category.getChildren';
  if (url.includes('product!search.do')) return 'product.search';
  if (url.includes('product!detail.do')) return 'product.detail';
  if (url.includes('order!getCountries.do')) return 'order.getCountries';
  if (url.includes('order!getPricesAndFreights.do')) return 'order.getPricesAndFreights';
  if (url.includes('order!createOrder.do')) return 'order.createOrder';
  return 'unknown';
}

// Rate limiting check
async function rateLimitCheck(
  keyHash: string,
  endpoint: string,
  minuteLimit: number,
  dayLimit: number,
  userId?: string
): Promise<void> {
  const now = new Date();
  
  // Round down to minute and day windows
  const minuteWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
  const dayWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  
  // Check and increment minute counter
  const { data: minuteUsage, error: minuteError } = await supabase
    .from('sunsky_api_usage')
    .select('count')
    .eq('key_hash', keyHash)
    .eq('endpoint', endpoint)
    .eq('period', 'minute')
    .eq('window_start', minuteWindow.toISOString())
    .single();

  let currentMinuteCount = 0;
  
  if (minuteError && minuteError.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Rate limit minute check error:', minuteError);
  } else if (minuteUsage) {
    currentMinuteCount = minuteUsage.count;
  }

  // Check if we're already at the limit
  if (currentMinuteCount >= minuteLimit) {
    const resetSeconds = 60 - now.getSeconds();
    throw new Error(JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Minute limit of ${minuteLimit} requests exceeded. Try again in ${resetSeconds} seconds.`,
      retryAfter: resetSeconds,
      headers: {
        'Retry-After': resetSeconds.toString(),
        'X-RateLimit-Endpoint': endpoint,
        'X-RateLimit-Limit-Minute': minuteLimit.toString(),
        'X-RateLimit-Remaining-Minute': '0',
        'X-RateLimit-Reset-Seconds': resetSeconds.toString()
      }
    }));
  }

  // Increment minute counter
  const { error: minuteUpsertError } = await supabase
    .from('sunsky_api_usage')
    .upsert({
      key_hash: keyHash,
      endpoint,
      period: 'minute',
      window_start: minuteWindow.toISOString(),
      count: currentMinuteCount + 1,
      user_id: userId,
      last_request: now.toISOString()
    }, {
      onConflict: 'key_hash,endpoint,period,window_start'
    });

  if (minuteUpsertError) {
    console.error('Rate limit minute upsert error:', minuteUpsertError);
  }

  // Check and increment day counter
  const { data: dayUsage, error: dayError } = await supabase
    .from('sunsky_api_usage')
    .select('count')
    .eq('key_hash', keyHash)
    .eq('endpoint', endpoint)
    .eq('period', 'day')
    .eq('window_start', dayWindow.toISOString())
    .single();

  let currentDayCount = 0;
  
  if (dayError && dayError.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Rate limit day check error:', dayError);
  } else if (dayUsage) {
    currentDayCount = dayUsage.count;
  }

  // Check if we're already at the daily limit
  if (currentDayCount >= dayLimit) {
    const midnight = new Date(dayWindow);
    midnight.setDate(midnight.getDate() + 1);
    const resetSeconds = Math.floor((midnight.getTime() - now.getTime()) / 1000);
    
    throw new Error(JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Daily limit of ${dayLimit} requests exceeded. Try again in ${Math.floor(resetSeconds / 3600)} hours.`,
      retryAfter: resetSeconds,
      headers: {
        'Retry-After': resetSeconds.toString(),
        'X-RateLimit-Endpoint': endpoint,
        'X-RateLimit-Limit-Day': dayLimit.toString(),
        'X-RateLimit-Remaining-Day': '0',
        'X-RateLimit-Reset-Seconds': resetSeconds.toString()
      }
    }));
  }

  // Increment day counter
  const { error: dayUpsertError } = await supabase
    .from('sunsky_api_usage')
    .upsert({
      key_hash: keyHash,
      endpoint,
      period: 'day',
      window_start: dayWindow.toISOString(),
      count: currentDayCount + 1,
      user_id: userId,
      last_request: now.toISOString()
    }, {
      onConflict: 'key_hash,endpoint,period,window_start'
    });

  if (dayUpsertError) {
    console.error('Rate limit day upsert error:', dayUpsertError);
  }
}

// Generate both lowercase and uppercase MD5 for testing
async function md5Both(text: string): Promise<{ lower: string; upper: string }> {
  const lower = await md5(text);
  return { lower, upper: lower.toUpperCase() };
}

// Generate signature for Sunsky API (exact format from documentation)
async function generateSignature(params: Record<string, any>, key: string, secret: string): Promise<string> {
  // Validate inputs
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid API key: key must be a non-empty string');
  }
  if (!secret || typeof secret !== 'string') {
    throw new Error('Invalid API secret: secret must be a non-empty string');
  }
  
  // Filter out empty values and signature/sign fields
  const filteredParams: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '' && k !== 'signature' && k !== 'sign') {
      filteredParams[k] = String(v);
    }
  });
  
  // Add key to parameters
  filteredParams.key = key;
  
  // Sort by parameter names using ASCII comparison (exact JavaScript equivalent of Python's sorted())
  const sortedEntries = Object.entries(filteredParams).sort(([a], [b]) => {
    // ASCII byte comparison - exact match to Python's default string sorting
    return a < b ? -1 : a > b ? 1 : 0;
  });
  
  // Concatenate only VALUES in sorted order (keep whitespaces as per documentation)
  const valueString = sortedEntries.map(([_, value]) => value).join('');
  
  // Append '@' and secret
  const stringToHash = valueString + '@' + secret;
  
  // Safe logging (mask sensitive data)
  const maskedKey = key.substring(0, 4) + '***';
  const maskedValueString = valueString.replace(key, maskedKey);
  console.log('Parameters for signature (sorted):', Object.fromEntries(sortedEntries.map(([k, v]) => [k, k === 'key' ? maskedKey : v])));
  console.log('Value string (masked):', maskedValueString);
  console.log('String to hash (masked):', maskedValueString + '@***');
  
  // Generate signature using lowercase MD5
  const signature = await md5(stringToHash);
  console.log('Generated signature:', signature);
  
  return signature;
}

// Get API credentials for user (user-specific first, then fallback to env)
async function getApiCredentials(userId: string, apiId?: string): Promise<{ key: string; secret: string }> {
  const encryptionKey = Deno.env.get('SUNSKY_CRED_ENC_KEY');
  
  // If specific API ID is provided, use those credentials
  if (apiId) {
    const { data: specificCredentials } = await supabase
      .from('sunsky_credentials')
      .select('api_key_encrypted, api_secret_encrypted, api_key, api_secret')
      .eq('id', apiId)
      .eq('user_id', userId)
      .single();

    if (specificCredentials) {
      let key = '', secret = '';
      
      // Try encrypted credentials first, fallback to plaintext
      if (specificCredentials.api_key_encrypted && specificCredentials.api_secret_encrypted && encryptionKey) {
        try {
          const { data: decryptedKey } = await supabase.rpc('pgp_sym_decrypt_bytea', {
            message: specificCredentials.api_key_encrypted,
            passphrase: encryptionKey
          });
          
          const { data: decryptedSecret } = await supabase.rpc('pgp_sym_decrypt_bytea', {
            message: specificCredentials.api_secret_encrypted,
            passphrase: encryptionKey
          });
          
          key = decryptedKey;
          secret = decryptedSecret;
        } catch (error) {
          console.error('Failed to decrypt credentials, trying plaintext fallback:', error);
          key = specificCredentials.api_key;
          secret = specificCredentials.api_secret;
        }
      } else {
        key = specificCredentials.api_key;
        secret = specificCredentials.api_secret;
      }

      if (key && secret) {
        console.log('Using specific Sunsky credentials for API ID:', apiId.substring(0, 8) + '...');
        return { key, secret };
      }
    }
  }

  // Try to get user-specific credentials (active ones)
  const { data: userCredentialsList, error: credentialsError } = await supabase
    .from('sunsky_credentials')
    .select('api_key_encrypted, api_secret_encrypted, api_key, api_secret')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  // Take the first active credential if available
  const userCredentials = userCredentialsList?.[0] || null;

  console.log('User credentials query result:', { 
    hasCredentials: !!userCredentials, 
    error: credentialsError?.message,
    userId: userId.substring(0, 8) + '...' 
  });

  if (userCredentials) {
    let key = '', secret = '';
    
    // Try encrypted credentials first, fallback to plaintext
    if (userCredentials.api_key_encrypted && userCredentials.api_secret_encrypted && encryptionKey) {
      try {
        const { data: decryptedKey } = await supabase.rpc('pgp_sym_decrypt_bytea', {
          message: userCredentials.api_key_encrypted,
          passphrase: encryptionKey
        });
        
        const { data: decryptedSecret } = await supabase.rpc('pgp_sym_decrypt_bytea', {
          message: userCredentials.api_secret_encrypted,
          passphrase: encryptionKey
        });
        
        key = decryptedKey;
        secret = decryptedSecret;
      } catch (error) {
        console.error('Failed to decrypt credentials, trying plaintext fallback:', error);
        key = userCredentials.api_key;
        secret = userCredentials.api_secret;
      }
    } else {
      key = userCredentials.api_key;
      secret = userCredentials.api_secret;
    }

    if (key && secret) {
      console.log('Using user-specific Sunsky credentials');
      return { key, secret };
    }
  }

  // Fallback to environment variables
  const envKey = Deno.env.get('SUNSKY_API_KEY');
  const envSecret = Deno.env.get('SUNSKY_API_SECRET');
  
  console.log('Environment variables check:', { 
    hasKey: !!envKey, 
    keyLength: envKey?.length || 0,
    hasSecret: !!envSecret, 
    secretLength: envSecret?.length || 0 
  });
  
  if (!envKey || !envSecret) {
    console.error('Missing environment variables: SUNSKY_API_KEY or SUNSKY_API_SECRET');
    throw new Error('No Sunsky API credentials available. Please configure SUNSKY_API_KEY and SUNSKY_API_SECRET environment variables or add user credentials.');
  }

  console.log('Using environment Sunsky credentials');
  return {
    key: envKey,
    secret: envSecret
  };
}

// Make authenticated request to Sunsky API with retry logic for different signature formats and rate limiting
async function makeSunskyRequest(endpoint: string, params: Record<string, any>, key: string, secret: string, userId?: string) {
  // Get rate limits configuration
  const rateLimits = getRateLimits();
  const endpointKey = getEndpointKey(endpoint);
  const limits = rateLimits[endpointKey];
  
  if (limits && endpointKey !== 'unknown') {
    // Generate API key hash for rate limiting
    const keyHash = await sha256(key);
    
    // Check rate limits before making the request
    try {
      await rateLimitCheck(keyHash, endpointKey, limits.minute, limits.day, userId);
    } catch (error) {
      // Parse rate limit error and re-throw with proper formatting
      try {
        const rateLimitError = JSON.parse(error.message);
        const rateLimitResponse = new Response(JSON.stringify({
          result: 'error',
          message: rateLimitError.message,
          retryAfter: rateLimitError.retryAfter
        }), {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ...rateLimitError.headers
          }
        });
        throw rateLimitResponse;
      } catch (parseError) {
        // If not a rate limit error, re-throw original
        throw error;
      }
    }
  }

  // Generate signature using the official Sunsky format
  const signature = await generateSignature(params, key, secret);
  
  console.log(`Making request to: https://open.sunsky-online.com${endpoint}`);

  // First attempt: use 'signature' parameter with lowercase MD5
  let requestBody = new URLSearchParams({
    ...params,
    key,
    signature
  });

  let response = await fetch(`https://open.sunsky-online.com${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: requestBody
  });

  if (!response.ok) {
    throw new Error(`Sunsky API HTTP error: ${response.status} ${response.statusText}`);
  }

  let result = await response.json();

  // If we get signature error, retry with uppercase MD5 and 'sign' parameter
  if (result.result === 'error' && result.messages?.[0] === 'NO_PERMISSION_DUE_TO_SIGNATURE') {
    console.log('Retrying with uppercase MD5 and "sign" parameter...');
    
    const upperSignature = signature.toUpperCase();
    requestBody = new URLSearchParams({
      ...params,
      key,
      sign: upperSignature // Try 'sign' instead of 'signature'
    });

    response = await fetch(`https://open.sunsky-online.com${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: requestBody
    });

    if (!response.ok) {
      throw new Error(`Sunsky API HTTP error: ${response.status} ${response.statusText}`);
    }

    result = await response.json();
  }

  // Don't throw on Sunsky API errors - let the caller handle them
  if (result.result === 'error') {
    console.error('Sunsky API Error:', result);
  }

  console.log('Sunsky API Success:', result.result);
  return result;
}

// Convert USD price to user's currency
async function convertCurrency(priceUSD: number, userCountry: string): Promise<number> {
  const { data: exchangeRate } = await supabase.rpc('get_exchange_rate', {
    from_currency: 'USD',
    to_currency: userCountry === 'KSA' ? 'SAR' : 'AED'
  });
  
  return priceUSD * (exchangeRate || 1);
}

// Handle image download for products
async function handleImageDownload(body: any, userId: string): Promise<Response> {
  const { itemNos, size = 800, watermark, apiId } = body;

  if (!itemNos || !Array.isArray(itemNos) || itemNos.length === 0) {
    return new Response(JSON.stringify({ 
      result: 'error', 
      message: 'itemNos array is required and must not be empty' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get API credentials
    const credentials = await getApiCredentials(userId, apiId);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each item
    for (const itemNo of itemNos) {
      try {
        // Build parameters for image download
        const params: Record<string, any> = { itemNo };
        if (size) params.size = size;
        if (watermark) params.watermark = watermark;

        // Make request to Sunsky API for images
        const response = await fetch(`https://open.sunsky-online.com/openapi/product!getImages.do`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            ...params,
            key: credentials.key,
            signature: await generateSignature(params, credentials.key, credentials.secret)
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Get the ZIP file as array buffer
        const zipData = await response.arrayBuffer();
        
        // Extract images from ZIP using JSZip
        const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
        const zip = await JSZip.loadAsync(zipData);
        
        const imageFiles = Object.keys(zip.files).filter(name => 
          !zip.files[name].dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
        );

        let imageOrder = 0;
        for (const fileName of imageFiles) {
          const file = zip.files[fileName];
          const imageData = await file.async('base64');
          const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
          
          // Upload to Supabase Storage
          const storagePath = `${userId}/${itemNo}/${imageOrder}_${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('sunsky-images')
            .upload(storagePath, Buffer.from(imageData, 'base64'), {
              contentType: mimeType,
              upsert: true
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('sunsky-images')
            .getPublicUrl(storagePath);

          // Save to database
          await supabase
            .from('sunsky_product_images')
            .upsert({
              user_id: userId,
              item_no: itemNo,
              image_url: publicUrl,
              image_order: imageOrder,
              image_type: imageOrder === 0 ? 'main' : 'detail',
              storage_path: storagePath,
              download_status: 'completed'
            }, {
              onConflict: 'user_id,item_no,image_order'
            });

          imageOrder++;
        }

        // Update SKU with image info
        if (imageOrder > 0) {
          const { data: { publicUrl: thumbnailUrl } } = supabase.storage
            .from('sunsky-images')
            .getPublicUrl(`${userId}/${itemNo}/0_${imageFiles[0]}`);

          await supabase
            .from('sunsky_skus')
            .update({
              images_downloaded: true,
              images_download_date: new Date().toISOString(),
              thumbnail_url: thumbnailUrl,
              image_count: imageOrder
            })
            .eq('user_id', userId)
            .eq('sku_code', itemNo);
        }

        results.push({
          itemNo,
          status: 'success',
          imageCount: imageOrder
        });
        successCount++;

      } catch (error) {
        console.error(`Error downloading images for ${itemNo}:`, error);
        
        // Save error to database
        await supabase
          .from('sunsky_product_images')
          .upsert({
            user_id: userId,
            item_no: itemNo,
            image_url: '',
            image_order: 0,
            download_status: 'failed',
            download_error: error.message
          }, {
            onConflict: 'user_id,item_no,image_order'
          });

        results.push({
          itemNo,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    return new Response(JSON.stringify({
      result: 'success',
      data: {
        total: itemNos.length,
        success: successCount,
        errors: errorCount,
        results
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Image download error:', error);
    return new Response(JSON.stringify({
      result: 'error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Process a chunk of products (helper function for chunked processing)
async function processProductChunk(
  products: any[], 
  credentials: any, 
  userId: string, 
  userCountry: string, 
  jobId: string
): Promise<{ successCount: number; errorCount: number }> {
  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      // Create job item record
      await supabase
        .from('sunsky_import_job_items')
        .insert({
          job_id: jobId,
          user_id: userId,
          item_no: product.itemNo,
          status: 'processing'
        });

      // Get detailed product info
      const detailResult = await makeSunskyRequest(
        '/openapi/product!detail.do',
        { lang: 'en', itemNo: product.itemNo },
        credentials.key,
        credentials.secret,
        userId
      );

      if (detailResult.result === 'success' && detailResult.data) {
        const productDetail = detailResult.data;
        
        // Convert price to user's currency
        const convertedCost = await convertCurrency(
          parseFloat(productDetail.price || 0),
          userCountry
        );

        // Insert/update SKU
        const { data: skuData, error: skuError } = await supabase
          .from('sunsky_skus')
          .upsert({
            user_id: userId,
            sku_code: productDetail.itemNo,
            title: productDetail.name,
            cost: convertedCost,
            weight: productDetail.unitWeight ? parseFloat(productDetail.unitWeight) : null,
            description: `Imported from Sunsky - Lead Time: ${productDetail.leadTime || 'N/A'}`,
            currency: userCountry === 'KSA' ? 'SAR' : 'AED',
            country: userCountry
          }, { 
            onConflict: 'user_id,sku_code',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (skuError) {
          throw skuError;
        }

        // Update job item as success
        await supabase
          .from('sunsky_import_job_items')
          .update({
            status: 'completed',
            sku_code: skuData.sku_code,
            title: skuData.title,
            cost: skuData.cost,
            weight: skuData.weight,
            currency: skuData.currency,
            processed_at: new Date().toISOString()
          })
          .eq('job_id', jobId)
          .eq('item_no', product.itemNo);

        successCount++;
      }
    } catch (error) {
      errorCount++;
      
      // Update job item as failed
      await supabase
        .from('sunsky_import_job_items')
        .update({
          status: 'error',
          error_message: error.message
        })
        .eq('job_id', jobId)
        .eq('item_no', product.itemNo);

      // Log error
      await supabase
        .from('sunsky_import_logs')
        .insert({
          job_id: jobId,
          user_id: userId,
          level: 'error',
          message: `Failed to process item ${product.itemNo}`,
          context: { error: error.message }
        });
    }
  }

  return { successCount, errorCount };
}

// Background job processor
async function processImportJob(job: any, userId: string, userCountry: string) {
  try {
    const credentials = await getApiCredentials(userId);
    
    // Update job status to processing
    await supabase
      .from('sunsky_import_jobs')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString() 
      })
      .eq('id', job.id);

    let products: any[] = [];
    const { type, criteria } = job;

    // Log job start
    await supabase
      .from('sunsky_import_logs')
      .insert({
        job_id: job.id,
        user_id: userId,
        level: 'info',
        message: `Starting import job: ${type}`,
        context: criteria
      });

    if (type === 'category') {
      const searchParams: any = {
        lang: 'en',
        pageSize: 100,
        page: 1,
        status: 1
      };
      
      if (criteria.categoryId) searchParams.categoryId = criteria.categoryId;
      if (criteria.dateFrom) searchParams.dateFrom = criteria.dateFrom;
      if (criteria.dateTo) searchParams.dateTo = criteria.dateTo;
      if (criteria.gmtModifiedStart) searchParams.gmtModifiedStart = criteria.gmtModifiedStart;

      // First, get total count without fetching all items
      try {
        const firstResult = await makeSunskyRequest('/openapi/product!search.do', searchParams, credentials.key, credentials.secret, userId);
        
        if (firstResult.result === 'success' && firstResult.data?.result) {
          // Estimate total based on first page
          const estimatedTotal = Math.max(firstResult.data.result.length, 1000); // Conservative estimate
          
          // Update job with estimated total
          await supabase
            .from('sunsky_import_jobs')
            .update({ 
              total_items: estimatedTotal,
              processed_items: 0
            })
            .eq('id', job.id);
            
          console.log(`Job ${job.id}: Estimated ${estimatedTotal} total items`);
        }
      } catch (error) {
        console.error('Error getting initial count:', error);
      }
    }

    // Process items in chunks of 200
    const CHUNK_SIZE = 200;
    let successCount = 0;
    let errorCount = 0;
    let currentChunk = 0;
    
    // Handle different import types
    if (type === 'category') {
      const searchParams: any = {
        lang: 'en',
        pageSize: 100,
        page: 1,
        status: 1
      };
      
      if (criteria.categoryId) searchParams.categoryId = criteria.categoryId;
      if (criteria.dateFrom) searchParams.dateFrom = criteria.dateFrom;
      if (criteria.dateTo) searchParams.dateTo = criteria.dateTo;
      if (criteria.gmtModifiedStart) searchParams.gmtModifiedStart = criteria.gmtModifiedStart;

      let currentPage = 1;
      let hasMorePages = true;
      let currentChunkItems: any[] = [];

      while (hasMorePages) {
        // Check if job is paused or cancelled before fetching next page
        const { data: currentJob } = await supabase
          .from('sunsky_import_jobs')
          .select('paused, cancelled, status')
          .eq('id', job.id)
          .single();
        
        if (currentJob?.cancelled) {
          console.log(`Job ${job.id} cancelled, stopping processing`);
          await supabase
            .from('sunsky_import_jobs')
            .update({ 
              status: 'cancelled',
              success_count: successCount,
              error_count: errorCount,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);
          return;
        }
        
        if (currentJob?.paused) {
          console.log(`Job ${job.id} paused, stopping processing`);
          await supabase
            .from('sunsky_import_jobs')
            .update({ 
              status: 'paused',
              success_count: successCount,
              error_count: errorCount
            })
            .eq('id', job.id);
          return;
        }

        searchParams.page = currentPage;
        
        try {
          const result = await makeSunskyRequest('/openapi/product!search.do', searchParams, credentials.key, credentials.secret, userId);
          
          if (result.result === 'success' && result.data?.result) {
            currentChunkItems.push(...result.data.result);
            
            // Process chunk when we have enough items or no more pages
            if (currentChunkItems.length >= CHUNK_SIZE || result.data.result.length < searchParams.pageSize) {
              const chunkResults = await processProductChunk(currentChunkItems.slice(0, CHUNK_SIZE), credentials, userId, userCountry, job.id);
              successCount += chunkResults.successCount;
              errorCount += chunkResults.errorCount;
              
              // Update progress
              await supabase
                .from('sunsky_import_jobs')
                .update({ 
                  processed_items: successCount + errorCount,
                  success_count: successCount,
                  error_count: errorCount
                })
                .eq('id', job.id);
              
              // Remove processed items from chunk
              currentChunkItems = currentChunkItems.slice(CHUNK_SIZE);
              currentChunk++;
              
              console.log(`Job ${job.id}: Processed chunk ${currentChunk}, Success: ${chunkResults.successCount}, Errors: ${chunkResults.errorCount}`);
            }
            
            // Check if there are more pages
            hasMorePages = result.data.result.length === searchParams.pageSize;
            currentPage++;
          } else {
            hasMorePages = false;
          }
        } catch (error) {
          if (error instanceof Response && error.status === 429) {
            // Rate limit hit, stop for now
            await supabase
              .from('sunsky_import_logs')
              .insert({
                job_id: job.id,
                user_id: userId,
                level: 'warning',
                message: 'Rate limit hit during product search',
                context: { page: currentPage, chunk: currentChunk }
              });
            break;
          }
          throw error;
        }
      }
      
      // Process any remaining items in the last chunk
      if (currentChunkItems.length > 0) {
        const chunkResults = await processProductChunk(currentChunkItems, credentials, userId, userCountry, job.id);
        successCount += chunkResults.successCount;
        errorCount += chunkResults.errorCount;
      }
    } else if (type === 'po_search') {
      // Handle PO model number search
      console.log(`Processing PO search with ${job.total_items} model numbers`);
      
      // Get unique model numbers from PO orders in the database
      const { data: poOrders, error: poError } = await supabase
        .from('po_orders')
        .select('model_number')
        .eq('user_id', userId)
        .in('status', ['pending', 'ordered', 'shipped'])
        .not('model_number', 'is', null);
        
      if (poError || !poOrders) {
        throw new Error('Failed to fetch PO orders: ' + poError?.message);
      }
      
      // Extract unique model numbers
      const modelNumbers = [...new Set(poOrders.map(po => po.model_number).filter(mn => mn && mn.trim() !== ''))];
      
      console.log(`Found ${modelNumbers.length} unique model numbers from PO orders`);
      
      if (!modelNumbers.length) {
        throw new Error('No model numbers found in PO orders');
      }
      
      // Update job with correct total
      await supabase
        .from('sunsky_import_jobs')
        .update({ 
          total_items: modelNumbers.length,
          processed_items: 0
        })
        .eq('id', job.id);
      
      // Process each model number
      for (let i = 0; i < modelNumbers.length; i++) {
        const modelNumber = modelNumbers[i];
        
        // Check if job is cancelled or paused
        const { data: currentJob } = await supabase
          .from('sunsky_import_jobs')
          .select('paused, cancelled, status')
          .eq('id', job.id)
          .single();
        
        if (currentJob?.cancelled) {
          console.log(`Job ${job.id} cancelled, stopping processing`);
          await supabase
            .from('sunsky_import_jobs')
            .update({ 
              status: 'cancelled',
              success_count: successCount,
              error_count: errorCount,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);
          return;
        }
        
        if (currentJob?.paused) {
          console.log(`Job ${job.id} paused, stopping processing`);
          await supabase
            .from('sunsky_import_jobs')
            .update({ 
              status: 'paused',
              success_count: successCount,
              error_count: errorCount
            })
            .eq('id', job.id);
          return;
        }
        
        try {
          let foundMatch = false;
          let productDetail = null;
          
          // Strategy 1: Try direct product lookup first (treat model number as itemNo)
          try {
            console.log(`🔍 Trying direct lookup for model: ${modelNumber}`);
            const directResult = await makeSunskyRequest(
              '/openapi/product!detail.do',
              { lang: 'en', itemNo: modelNumber },
              credentials.key,
              credentials.secret,
              userId
            );
            
            if (directResult.result === 'success' && directResult.data) {
              productDetail = directResult.data;
              foundMatch = true;
              console.log(`✅ Direct match found: ${modelNumber}`);
            }
          } catch (directError) {
            console.log(`Direct lookup failed for ${modelNumber}:`, directError.message);
          }
          
          // Strategy 2: Search by category if direct lookup failed
          if (!foundMatch) {
            console.log(`🔍 Trying category search for model: ${modelNumber}`);
            
            // Try searching in popular electronics categories
            const searchCategories = [1032, 1042, 1052]; // Common electronics category IDs
            
            for (const categoryId of searchCategories) {
              try {
                const searchParams = {
                  lang: 'en',
                  categoryId: categoryId,
                  page: 1,
                  pageSize: 100,
                  status: 1
                };
                
                const searchResult = await makeSunskyRequest(
                  '/openapi/product!search.do', 
                  searchParams, 
                  credentials.key, 
                  credentials.secret, 
                  userId
                );
                
                if (searchResult.result === 'success' && searchResult.data?.result?.length > 0) {
                  const normalizedSearch = modelNumber.trim().toLowerCase().replace(/[-_\s]/g, '');
                  
                  // Look for matches in search results
                  for (const product of searchResult.data.result) {
                    const normalizedItem = (product.itemNo || '').trim().toLowerCase().replace(/[-_\s]/g, '');
                    const normalizedName = (product.name || '').trim().toLowerCase().replace(/[-_\s]/g, '');
                    
                    if (normalizedItem.includes(normalizedSearch) || 
                        normalizedName.includes(normalizedSearch) ||
                        normalizedSearch.includes(normalizedItem)) {
                      
                      // Get detailed product info
                      const detailResult = await makeSunskyRequest(
                        '/openapi/product!detail.do',
                        { lang: 'en', itemNo: product.itemNo },
                        credentials.key,
                        credentials.secret,
                        userId
                      );
                      
                      if (detailResult.result === 'success' && detailResult.data) {
                        productDetail = detailResult.data;
                        foundMatch = true;
                        console.log(`✅ Category match found: ${modelNumber} -> ${product.itemNo}`);
                        break;
                      }
                    }
                  }
                }
                
                if (foundMatch) break;
              } catch (categoryError) {
                console.log(`Category search failed for ${modelNumber} in category ${categoryId}:`, categoryError.message);
              }
            }
          }
          
          // Strategy 3: Try brand-based search if we can extract brand info
          if (!foundMatch && modelNumber.length > 3) {
            console.log(`🔍 Trying brand search for model: ${modelNumber}`);
            
            // Extract potential brand names from model number
            const potentialBrands = ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Google', 'Sony', 'LG'];
            const modelUpper = modelNumber.toUpperCase();
            
            for (const brand of potentialBrands) {
              if (modelUpper.includes(brand.toUpperCase())) {
                try {
                  const searchParams = {
                    lang: 'en',
                    brandName: brand,
                    page: 1,
                    pageSize: 50,
                    status: 1
                  };
                  
                  const searchResult = await makeSunskyRequest(
                    '/openapi/product!search.do', 
                    searchParams, 
                    credentials.key, 
                    credentials.secret, 
                    userId
                  );
                  
                  if (searchResult.result === 'success' && searchResult.data?.result?.length > 0) {
                    const normalizedSearch = modelNumber.trim().toLowerCase().replace(/[-_\s]/g, '');
                    
                    for (const product of searchResult.data.result) {
                      const normalizedItem = (product.itemNo || '').trim().toLowerCase().replace(/[-_\s]/g, '');
                      const normalizedName = (product.name || '').trim().toLowerCase().replace(/[-_\s]/g, '');
                      
                      if (normalizedItem.includes(normalizedSearch) || 
                          normalizedName.includes(normalizedSearch)) {
                        
                        const detailResult = await makeSunskyRequest(
                          '/openapi/product!detail.do',
                          { lang: 'en', itemNo: product.itemNo },
                          credentials.key,
                          credentials.secret,
                          userId
                        );
                        
                        if (detailResult.result === 'success' && detailResult.data) {
                          productDetail = detailResult.data;
                          foundMatch = true;
                          console.log(`✅ Brand match found: ${modelNumber} -> ${product.itemNo} (${brand})`);
                          break;
                        }
                      }
                    }
                  }
                  
                  if (foundMatch) break;
                } catch (brandError) {
                  console.log(`Brand search failed for ${modelNumber} with brand ${brand}:`, brandError.message);
                }
              }
            }
          }
          
          // If we found a match, process it
          if (foundMatch && productDetail) {
            // Convert price to user's currency
            const convertedCost = await convertCurrency(
              parseFloat(productDetail.price || 0),
              userCountry
            );
            
            // Insert/update SKU
            const { error: skuError } = await supabase
              .from('sunsky_skus')
              .upsert({
                user_id: userId,
                sku_code: productDetail.itemNo,
                title: productDetail.name,
                cost: convertedCost,
                weight: productDetail.unitWeight ? parseFloat(productDetail.unitWeight) : null,
                description: `Imported from Sunsky - Lead Time: ${productDetail.leadTime || 'N/A'}`,
                currency: userCountry === 'KSA' ? 'SAR' : 'AED',
                country: userCountry,
                product_data: productDetail
              }, { 
                onConflict: 'user_id,sku_code',
                ignoreDuplicates: false 
              });
            
            if (!skuError) {
              successCount++;
              console.log(`✅ Successfully imported: ${modelNumber} -> ${productDetail.itemNo}: ${productDetail.name}`);
            } else {
              errorCount++;
              console.error(`Failed to save SKU for ${modelNumber}:`, skuError);
            }
          } else {
            errorCount++;
            console.log(`❌ No product found for model: ${modelNumber}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error processing model ${modelNumber}:`, error.message);
        }
        
        // Update progress
        await supabase
          .from('sunsky_import_jobs')
          .update({ 
            processed_items: i + 1,
            success_count: successCount,
            error_count: errorCount
          })
          .eq('id', job.id);
          
        // Small delay to avoid overwhelming the API
        if (i < modelNumbers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // Check if job is paused or cancelled before processing each item
      const { data: currentJob } = await supabase
        .from('sunsky_import_jobs')
        .select('paused, cancelled, status')
        .eq('id', job.id)
        .single();
      
      if (currentJob?.cancelled) {
        console.log(`Job ${job.id} cancelled, stopping processing`);
        await supabase
          .from('sunsky_import_jobs')
          .update({ 
            status: 'cancelled',
            processed_items: i,
            success_count: successCount,
            error_count: errorCount,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        return;
      }
      
      if (currentJob?.paused) {
        console.log(`Job ${job.id} paused, stopping processing`);
        await supabase
          .from('sunsky_import_jobs')
          .update({ 
            status: 'paused',
            processed_items: i,
            success_count: successCount,
            error_count: errorCount
          })
          .eq('id', job.id);
        return;
      }
      
      try {
        // Create job item record
        await supabase
          .from('sunsky_import_job_items')
          .insert({
            job_id: job.id,
            user_id: userId,
            item_no: product.itemNo,
            status: 'processing'
          });

        // Get detailed product info
        const detailResult = await makeSunskyRequest(
          '/openapi/product!detail.do',
          { lang: 'en', itemNo: product.itemNo },
          credentials.key,
          credentials.secret,
          userId
        );

        if (detailResult.result === 'success' && detailResult.data) {
          const productDetail = detailResult.data;
          
          // Convert price to user's currency
          const convertedCost = await convertCurrency(
            parseFloat(productDetail.price || 0),
            userCountry
          );

          // Insert/update SKU
          const { data: skuData, error: skuError } = await supabase
            .from('sunsky_skus')
            .upsert({
              user_id: userId,
              sku_code: productDetail.itemNo,
              title: productDetail.name,
              cost: convertedCost,
              weight: productDetail.unitWeight ? parseFloat(productDetail.unitWeight) : null,
              description: `Imported from Sunsky - Lead Time: ${productDetail.leadTime || 'N/A'}`,
              currency: userCountry === 'KSA' ? 'SAR' : 'AED',
              country: userCountry
            }, { 
              onConflict: 'user_id,sku_code',
              ignoreDuplicates: false 
            })
            .select()
            .single();

          if (skuError) {
            throw skuError;
          }

          // Update job item as success
          await supabase
            .from('sunsky_import_job_items')
            .update({
              status: 'completed',
              sku_code: skuData.sku_code,
              title: skuData.title,
              cost: skuData.cost,
              weight: skuData.weight,
              currency: skuData.currency,
              processed_at: new Date().toISOString()
            })
            .eq('job_id', job.id)
            .eq('item_no', product.itemNo);

          successCount++;
        }
      } catch (error) {
        errorCount++;
        
        // Update job item as failed
        await supabase
          .from('sunsky_import_job_items')
          .update({
            status: 'error',
            error_message: error.message
          })
          .eq('job_id', job.id)
          .eq('item_no', product.itemNo);

        // Log error
        await supabase
          .from('sunsky_import_logs')
          .insert({
            job_id: job.id,
            user_id: userId,
            level: 'error',
            message: `Failed to process item ${product.itemNo}`,
            context: { error: error.message }
          });

        // Handle rate limits
        if (error instanceof Response && error.status === 429) {
          // Update job as paused due to rate limit
          await supabase
            .from('sunsky_import_jobs')
            .update({ 
              status: 'paused',
              processed_items: i + 1,
              success_count: successCount,
              error_count: errorCount,
              last_error: 'Rate limit reached'
            })
            .eq('id', job.id);
          
          return;
        }
      }

      // Update progress every 10 items
      if (i % 10 === 0) {
        await supabase
          .from('sunsky_import_jobs')
          .update({ 
            processed_items: i + 1,
            success_count: successCount,
            error_count: errorCount
          })
          .eq('id', job.id);
      }
    }

    // Mark job as completed
    await supabase
      .from('sunsky_import_jobs')
      .update({ 
        status: 'completed',
        processed_items: products.length,
        success_count: successCount,
        error_count: errorCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Log completion
    await supabase
      .from('sunsky_import_logs')
      .insert({
        job_id: job.id,
        user_id: userId,
        level: 'info',
        message: `Import job completed: ${successCount} success, ${errorCount} errors`
      });

  } catch (error) {
    // Mark job as failed
    await supabase
      .from('sunsky_import_jobs')
      .update({ 
        status: 'failed',
        last_error: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Log error
    await supabase
      .from('sunsky_import_logs')
      .insert({
        job_id: job.id,
        user_id: userId,
        level: 'error',
        message: `Import job failed: ${error.message}`
      });
  }
}

serve(async (req) => {
  // CORS MUST be handled first - before ANYTHING else
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`\n[${requestId}] ========== NEW REQUEST ==========`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);

  try {
    // Step 1: Parse request body
    let body;
    try {
      const rawBody = await req.text();
      console.log(`[${requestId}] Raw body length: ${rawBody.length} bytes`);
      body = JSON.parse(rawBody);
      console.log(`[${requestId}] ✅ Body parsed:`, { 
        action: body.action,
        keys: Object.keys(body),
        hasFilters: !!body.filters,
        hasApiId: !!body.apiId
      });
    } catch (e) {
      console.error(`[${requestId}] ❌ JSON parse error:`, e);
      return new Response(JSON.stringify({ 
        result: 'error', 
        message: 'Invalid JSON',
        requestId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const { action } = body;

    // Step 2: Health check (no auth needed)
    if (action === 'ping' || action === 'health') {
      console.log(`[${requestId}] 💚 Health check OK`);
      return new Response(JSON.stringify({ 
        result: 'success',
        message: 'Sunsky API is online',
        timestamp: new Date().toISOString(),
        requestId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 3: Validate action
    if (!action) {
      console.error(`[${requestId}] ❌ No action provided`);
      return new Response(JSON.stringify({ 
        result: 'error', 
        message: 'Action is required',
        requestId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Step 4: Authenticate
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error(`[${requestId}] ❌ No auth header`);
      return new Response(JSON.stringify({ 
        result: 'error', 
        message: 'Authorization required',
        requestId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        console.error(`[${requestId}] ❌ Auth failed:`, authError);
        return new Response(JSON.stringify({ 
          result: 'error', 
          message: 'Authentication failed',
          requestId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        });
      }
      userId = user.id;
      console.log(`[${requestId}] ✅ User authenticated: ${userId}`);
    } catch (e) {
      console.error(`[${requestId}] ❌ Auth exception:`, e);
      return new Response(JSON.stringify({ 
        result: 'error', 
        message: 'Authentication error',
        requestId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    // Step 5: Get user country
    console.log(`[${requestId}] 📍 Fetching user profile...`);
    let userCountry = 'UAE';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', userId)
        .maybeSingle();
      
      if (profile?.country) {
        userCountry = profile.country;
        console.log(`[${requestId}] ✅ User country: ${userCountry}`);
      }
    } catch (e) {
      console.warn(`[${requestId}] ⚠️ Profile fetch failed, using default country`);
    }

    // Step 6: Route action
    console.log(`[${requestId}] 🎯 Routing action: ${action}`);

    switch (action) {
      case 'saveCredentials': {
        const { apiKey, apiSecret } = requestData;

        console.log('Saving credentials for user:', user.id);

        if (!apiKey || !apiSecret) {
          throw new Error('API key and secret are required');
        }

        // Upsert user credentials
        const { error } = await supabase
          .from('sunsky_credentials')
          .upsert({
            user_id: user.id,
            api_key: apiKey,
            api_secret: apiSecret
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Database error saving credentials:', error);
          throw new Error(`Failed to save credentials: ${error.message}`);
        }

        return new Response(JSON.stringify({
          result: 'success',
          message: 'Credentials saved successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'testCredentials': {
        const { apiId } = requestData;
        const credentials = await getApiCredentials(user.id, apiId);
        
        // Test with a simple categories request
        const params = {
          lang: 'en',
          parentId: '0'
        };

        try {
          const result = await makeSunskyRequest('/openapi/category!getChildren.do', params, credentials.key, credentials.secret, user.id);
          
          if (result.result === 'success') {
            return new Response(JSON.stringify({
              result: 'success',
              message: 'API credentials are valid'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            throw new Error(result.messages?.[0] || 'Invalid API credentials');
          }
        } catch (error) {
          // Handle rate limit responses properly
          if (error instanceof Response && error.status === 429) {
            return error;
          }
          
          return new Response(JSON.stringify({
            result: 'error',
            message: 'Invalid API credentials: ' + error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'getCredentialsStatus': {
        console.log('Checking credentials for user:', user.id);
        
        // Check user-specific credentials first
        const { data: userCredentials, error: userError } = await supabase
          .from('sunsky_credentials')
          .select('api_key, api_secret')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        console.log('User credentials query result:', { userCredentials, userError });

        // If user has credentials, return true
        if (userCredentials?.api_key && userCredentials?.api_secret) {
          console.log('Found user-specific credentials');
          return new Response(JSON.stringify({
            result: 'success',
            hasCredentials: true,
            source: 'user_specific'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check environment variables as fallback
        const envKey = Deno.env.get('SUNSKY_API_KEY');
        const envSecret = Deno.env.get('SUNSKY_API_SECRET');
        
        console.log('Environment variables check:', { 
          hasEnvKey: !!envKey, 
          hasEnvSecret: !!envSecret,
          envKeyLength: envKey?.length || 0,
          envSecretLength: envSecret?.length || 0
        });
        
        const hasEnvCredentials = !!(envKey && envSecret);
        
        console.log('Final result:', { hasEnvCredentials });

        return new Response(JSON.stringify({
          result: 'success',
          hasCredentials: hasEnvCredentials,
          source: hasEnvCredentials ? 'environment' : 'none'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getCredentialsInfo': {
        const { data: userCredentials } = await supabase
          .from('sunsky_credentials')
          .select('api_key, api_secret')
          .eq('user_id', user.id)
          .single();

        return new Response(JSON.stringify({
          result: 'success',
          hasCredentials: !!userCredentials?.api_key,
          maskedApiKey: userCredentials?.api_key ? 
            userCredentials.api_key.substring(0, 4) + '***' + userCredentials.api_key.slice(-3) : null,
          hasSecret: !!userCredentials?.api_secret
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'debugSignature': {
        const { params: debugParams } = requestData;
        const credentials = await getApiCredentials(user.id);
        
        // Generate signature and return debug info
        const signature = await generateSignature(debugParams || {}, credentials.key, credentials.secret);
        
        // Filter and sort params like the signature function does
        const filteredParams: Record<string, string> = {};
        Object.entries(debugParams || {}).forEach(([k, v]) => {
          if (v !== null && v !== undefined && v !== '' && k !== 'signature' && k !== 'sign') {
            filteredParams[k] = String(v);
          }
        });
        filteredParams.key = credentials.key;
        
        const sortedEntries = Object.entries(filteredParams).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
        const valueString = sortedEntries.map(([_, value]) => value).join('');
        
        // Mask sensitive data for return
        const maskedKey = credentials.key.substring(0, 4) + '***';
        const maskedValueString = valueString.replace(credentials.key, maskedKey);
        
        return new Response(JSON.stringify({
          result: 'success',
          debug: {
            maskedParams: Object.fromEntries(sortedEntries.map(([k, v]) => [k, k === 'key' ? maskedKey : v])),
            maskedValueString,
            signature,
            signatureUpper: signature.toUpperCase()
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'search_products': {
        const { credentials_id, search_skus } = requestData;
        
        if (!search_skus || !Array.isArray(search_skus)) {
          throw new Error('search_skus array is required');
        }

        const credentials = await getApiCredentials(user.id, credentials_id);
        const availableSkus: string[] = [];
        
        // Check each SKU in the Sunsky catalog
        for (const sku of search_skus) {
          try {
            const result = await makeSunskyRequest('/openapi/product!detail.do', {
              lang: 'en',
              itemNo: sku
            }, credentials.key, credentials.secret, user.id);
            
            // If the API returns success and has data, the SKU exists
            if (result.result === 'success' && result.data) {
              availableSkus.push(sku);
            }
          } catch (error) {
            // Handle rate limit responses properly
            if (error instanceof Response && error.status === 429) {
              return error;
            }
            console.log(`SKU ${sku} not found or error checking:`, error.message);
            // Continue checking other SKUs
          }
        }

        return new Response(JSON.stringify({
          result: 'success',
          available_skus: availableSkus
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'searchProducts': {
        console.log(`[${requestId}] 📦 searchProducts action started`);
        console.log(`[${requestId}] 📦 Request data:`, JSON.stringify(requestData, null, 2));
        
        // Defensive extraction of parameters
        const apiId = requestData?.apiId;
        const filters = requestData?.filters || {};
        const requestPage = requestData?.page;
        const requestPageSize = requestData?.pageSize;
        
        console.log(`[${requestId}] 📦 Extracted values:`, { 
          apiId, 
          hasFilters: !!filters,
          filterKeys: Object.keys(filters),
          requestPage, 
          requestPageSize 
        });
        
        // Validate apiId
        if (!apiId) {
          console.error(`[${requestId}] ❌ Missing apiId parameter`);
          return new Response(JSON.stringify({ 
            result: 'error', 
            message: 'API credentials ID (apiId) is required for searching products',
            receivedData: { hasApiId: !!apiId, hasFilters: !!filters }
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Get credentials with error handling
        console.log(`[${requestId}] 🔑 Fetching API credentials...`);
        let credentials;
        try {
          credentials = await getApiCredentials(user.id, apiId);
          console.log(`[${requestId}] ✅ Credentials fetched successfully`);
        } catch (credError) {
          console.error(`[${requestId}] ❌ Failed to fetch credentials:`, credError);
          return new Response(JSON.stringify({ 
            result: 'error', 
            message: 'Failed to fetch API credentials. Please check your API key settings.',
            details: credError?.message || 'Unknown error'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const { 
          categoryId, 
          brandId,
          keyword,
          dateFrom,
          dateTo,
          pageSize = requestPageSize || 40, 
          page = requestPage || 1, 
          brandName,
          searchTerm,
          leadTimeLevel,
          status = 1, // Default to valid products only
          gmtModifiedStart,
          priceMin,
          priceMax,
          stockMin
        } = filters || {};

        const params: Record<string, any> = {
          lang: 'en',
          pageSize: Math.min(pageSize, 100),
          page,
          status
        };

        if (categoryId) params.categoryId = categoryId;
        if (brandId) params.brandId = brandId;
        // Note: keyword parameter is not supported by Sunsky API - use categoryId or brandName instead
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        if (brandName) params.brandName = brandName;
        if (leadTimeLevel) params.leadTimeLevel = leadTimeLevel;
        if (gmtModifiedStart) params.gmtModifiedStart = gmtModifiedStart;
        if (priceMin) params.priceMin = priceMin;
        if (priceMax) params.priceMax = priceMax;
        if (stockMin) params.stockMin = stockMin;

        console.log('🔍 Search params:', params);

        try {
          const result = await makeSunskyRequest('/openapi/product!search.do', params, credentials.key, credentials.secret, user.id);
        
          if (result.result === 'error') {
            console.error('Sunsky search error:', result);
            throw new Error(result.messages?.[0] || 'Sunsky API error');
          }

        // Convert prices for products if they exist
        try {
          if (result.result === 'success' && result.data?.result && result.data.result.length > 0) {
            // Get exchange rate once for all products
            const targetCurrency = userCountry === 'KSA' ? 'SAR' : 'AED';
            let exchangeRate = 1;
            
            try {
              const { data: rate } = await supabase.rpc('get_exchange_rate', {
                from_currency: 'USD',
                to_currency: targetCurrency
              });
              exchangeRate = rate || 1;
            } catch (error) {
              console.error('Exchange rate fetch error:', error);
              exchangeRate = targetCurrency === 'SAR' ? 3.75 : 3.67; // Fallback rates
            }
            
            // Apply conversion to all products
            for (const product of result.data.result) {
              if (product.price) {
                try {
                  const priceUSD = parseFloat(product.price);
                  product.convertedPrice = priceUSD * exchangeRate;
                  product.convertedCurrency = targetCurrency;
                } catch (error) {
                  console.error('Price conversion error:', error);
                  product.convertedPrice = parseFloat(product.price);
                  product.convertedCurrency = 'USD';
                }
              }
            }
          }
        } catch (conversionError) {
          console.error('Currency conversion failed, returning products without conversion:', conversionError);
          // Continue without currency conversion
        }

          return new Response(JSON.stringify({
            result: 'success',
            data: {
              products: result.data?.result || [],
              total: result.data?.total || 0
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          // Handle rate limit responses properly
          if (error instanceof Response && error.status === 429) {
            return error;
          }
          throw error;
        }
      }

      case 'getProductDetails': {
        const { apiId, itemNo, skuCode } = requestData;
        const credentials = await getApiCredentials(user.id, apiId);

        // Accept either itemNo or skuCode (they're the same thing)
        const productId = itemNo || skuCode;
        if (!productId) {
          throw new Error('itemNo or skuCode is required');
        }

        const params = {
          lang: 'en',
          itemNo: productId
        };

        try {
          const result = await makeSunskyRequest('/openapi/product!detail.do', params, credentials.key, credentials.secret, user.id);
        
        if (result.result === 'error') {
          throw new Error(result.messages?.[0] || 'Sunsky API error');
        }

        // Convert price to user's currency if needed
        if (result.data && result.data.price) {
          result.data.convertedPrice = await convertCurrency(parseFloat(result.data.price), userCountry);
          result.data.convertedCurrency = userCountry === 'KSA' ? 'SAR' : 'AED';
        }

          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          // Handle rate limit responses properly
          if (error instanceof Response && error.status === 429) {
            return error;
          }
          throw error;
        }
      }

      case 'importSKUs': {
        const credentials = await getApiCredentials(user.id);
        const { skus } = requestData;

        if (!Array.isArray(skus) || skus.length === 0) {
          throw new Error('skus array is required');
        }

        // Process each SKU and convert to our database format
        const processedSKUs = [];
        
        for (const sku of skus) {
          try {
            // Get detailed product information with rate limiting
            const productResult = await makeSunskyRequest(
              '/openapi/product!detail.do',
              { lang: 'en', itemNo: sku.itemNo },
              credentials.key,
              credentials.secret,
              user.id
            );

          if (productResult.result === 'success' && productResult.data) {
            const product = productResult.data;
            
            // Convert price to user's currency
            const convertedCost = await convertCurrency(
              parseFloat(product.price || 0),
              userCountry
            );
            
            // Store all product data as JSONB for complete information
            const fullProductData = {
              itemNo: product.itemNo,
              name: product.name,
              brandName: product.brandName,
              category: product.category,
              price: product.price,
              unitWeight: product.unitWeight,
              leadTime: product.leadTime,
              warehouse: product.warehouse,
              stock: product.stock,
              moq: product.moq,
              keywords: product.keywords,
              description: product.description,
              images: product.images,
              specifications: product.specifications,
              packageInfo: product.packageInfo,
              convertedPrice: convertedCost,
              convertedCurrency: userCountry === 'KSA' ? 'SAR' : 'AED'
            };

            processedSKUs.push({
              user_id: user.id,
              sku_code: product.itemNo,
              title: product.name,
              cost: convertedCost,
              weight: product.unitWeight ? parseFloat(product.unitWeight) : null,
              description: `Imported from Sunsky - Lead Time: ${product.leadTime || 'N/A'}`,
              currency: userCountry === 'KSA' ? 'SAR' : 'AED',
              country: userCountry,
              product_data: fullProductData
            });
          }
          } catch (error) {
            // Handle rate limit responses - if we hit rate limits during import, return partial results
            if (error instanceof Response && error.status === 429) {
              console.log(`Rate limit hit during import. Processed ${processedSKUs.length} SKUs so far.`);
              
              // Return partial results with rate limit info
              if (processedSKUs.length > 0) {
                  const { data: insertedSKUs, error: insertError } = await supabase
                    .from('sunsky_skus')
                    .upsert(processedSKUs, { 
                      onConflict: 'user_id,sku_code',
                      ignoreDuplicates: false 
                    })
                    .select();

                if (!insertError) {
                  const errorBody = await error.json();
                  return new Response(JSON.stringify({
                    result: 'partial_success',
                    message: `Rate limit reached. Successfully imported ${insertedSKUs.length} SKUs. ${errorBody.message}`,
                    data: {
                      imported: insertedSKUs.length,
                      skus: insertedSKUs,
                      rateLimitHit: true,
                      retryAfter: errorBody.retryAfter
                    }
                  }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
                }
              }
              return error;
            }
            
            console.error(`Error processing SKU ${sku.itemNo}:`, error);
            // Continue with other SKUs
          }
        }

        if (processedSKUs.length === 0) {
          throw new Error('No valid SKUs could be processed');
        }

        // Insert SKUs into database using upsert to handle duplicates
        const { data: insertedSKUs, error: insertError } = await supabase
          .from('sunsky_skus')
          .upsert(processedSKUs, { 
            onConflict: 'user_id,sku_code',
            ignoreDuplicates: false 
          })
          .select();

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw new Error('Failed to insert SKUs into database');
        }

        console.log(`Successfully imported ${insertedSKUs.length} SKUs`);

        return new Response(JSON.stringify({
          result: 'success',
          data: {
            imported: insertedSKUs.length,
            skus: insertedSKUs
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getCategories': {
        console.log('getCategories action called with data:', requestData);
        const { apiId } = requestData;
        const credentials = await getApiCredentials(user.id, apiId);
        const { parentId, lang = 'en', gmtModifiedStart, mode } = requestData;

        const params: Record<string, any> = {
          lang
        };

        // Handle top-level categories request - use parentId=0 for main categories
        if (mode === 'top' || parentId === 'root' || (parentId === null && mode !== 'subcategories')) {
          params.parentId = '0';
          console.log('Loading main categories with parentId=0');
        } else if (parentId !== null && parentId !== undefined && parentId !== 'all') {
          params.parentId = parentId.toString();
          console.log('Loading subcategories for parentId:', parentId);
        }

        // Add date filter if specified
        if (gmtModifiedStart) {
          params.gmtModifiedStart = gmtModifiedStart;
        }

        console.log('Getting categories with params:', params);

        try {
          const result = await makeSunskyRequest('/openapi/category!getChildren.do', params, credentials.key, credentials.secret, user.id);
        
          if (result.result === 'error') {
            throw new Error(result.messages?.[0] || 'Sunsky API error');
          }

          // Normalize response to match frontend expectations
          return new Response(JSON.stringify({
            success: true,
            data: result.data || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          // Handle rate limit responses properly
          if (error instanceof Response && error.status === 429) {
            return error;
          }
          
          return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Unknown error'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
      }

      case 'getBrands': {
        console.log('getBrands action called with data:', requestData);
        const { apiId, categoryId } = requestData;
        const credentials = await getApiCredentials(user.id, apiId);
        const { lang = 'en' } = requestData;

        const params = { lang };

        console.log('Getting brands with params:', params);

        try {
          const result = await makeSunskyRequest('/openapi/brand!getAll.do', params, credentials.key, credentials.secret, user.id);
        
          if (result.result === 'error') {
            throw new Error(result.messages?.[0] || 'Sunsky API error');
          }

          // Normalize response to match frontend expectations
          return new Response(JSON.stringify({
            success: true,
            data: result.data || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.log('Brand endpoint failed, trying fallback with product search...');
          
          // Handle rate limit responses properly
          if (error instanceof Response && error.status === 429) {
            return error;
          }
          
          // Fallback: Extract brands from products if brand endpoint fails
          try {
            const searchParams: Record<string, any> = {
              lang,
              page: 1,
              pageSize: 50
            };
            
            if (categoryId && categoryId !== 'all') {
              searchParams.categoryId = categoryId;
            }
            
            console.log('Fallback: searching products for brands with params:', searchParams);
            
            const productResult = await makeSunskyRequest('/openapi/product!search.do', searchParams, credentials.key, credentials.secret, user.id);
            
            if (productResult.result === 'success' && productResult.data?.result) {
              // Extract unique brands from products
              const brandSet = new Set<string>();
              const brands: any[] = [];
              
              productResult.data.result.forEach((product: any) => {
                if (product.brandName && !brandSet.has(product.brandName)) {
                  brandSet.add(product.brandName);
                  brands.push({
                    id: product.brandId || brands.length + 1,
                    name: product.brandName
                  });
                }
              });
              
              console.log(`Fallback successful: extracted ${brands.length} brands from products`);
              
              return new Response(JSON.stringify({
                success: true,
                data: brands
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
          }
          
          return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Unknown error'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
      }

      case 'createImportJob': {
        const { type, criteria } = requestData;
        
        if (!type || !criteria) {
          throw new Error('type and criteria are required');
        }

        // Create new import job
        const { data: job, error: jobError } = await supabase
          .from('sunsky_import_jobs')
          .insert({
            user_id: user.id,
            type,
            criteria,
            country: userCountry
          })
          .select()
          .single();

        if (jobError) {
          throw new Error('Failed to create import job');
        }

        return new Response(JSON.stringify({
          result: 'success',
          data: job
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'startImportJob': {
        const { jobId } = requestData;
        
        if (!jobId) {
          throw new Error('jobId is required');
        }

        // Get job details
        const { data: job, error: jobError } = await supabase
          .from('sunsky_import_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', user.id)
          .single();

        if (jobError || !job) {
          throw new Error('Job not found');
        }

        // Start background processing
        EdgeRuntime.waitUntil(processImportJob(job, user.id, userCountry));

        return new Response(JSON.stringify({
          result: 'success',
          message: 'Import job started'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'listImportJobs': {
        const { data: jobs, error: jobsError } = await supabase
          .from('sunsky_import_jobs')
          .select(`
            id,
            type,
            criteria,
            status,
            total_items,
            processed_items,
            success_count,
            error_count,
            created_at,
            started_at,
            completed_at,
            last_error
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (jobsError) {
          throw new Error('Failed to fetch import jobs');
        }

        return new Response(JSON.stringify({
          result: 'success',
          data: jobs || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getJobStatus': {
        const { jobId } = requestData;
        
        if (!jobId) {
          throw new Error('jobId is required');
        }

        const { data: job, error: jobError } = await supabase
          .from('sunsky_import_jobs')
          .select(`
            id,
            type,
            criteria,
            status,
            total_items,
            processed_items,
            success_count,
            error_count,
            created_at,
            started_at,
            completed_at,
            last_error
          `)
          .eq('id', jobId)
          .eq('user_id', user.id)
          .single();

        if (jobError) {
          throw new Error('Job not found');
        }

        return new Response(JSON.stringify({
          result: 'success',
          data: job
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getCountries': {
        const credentials = await getApiCredentials(user.id);
        
        const params = {
          lang: 'en'
        };

        const result = await makeSunskyRequest('/openapi/order!getCountries.do', params, credentials.key, credentials.secret, user.id);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getPricesAndFreights': {
        const { items, deliveryAddress } = requestData;
        const credentials = await getApiCredentials(user.id);
        
        if (!items || !Array.isArray(items) || items.length === 0) {
          throw new Error('Items array is required');
        }
        
        if (!deliveryAddress || !deliveryAddress.countryId) {
          throw new Error('Delivery address with countryId is required');
        }

        const params: Record<string, any> = {
          lang: 'en',
          countryId: deliveryAddress.countryId
        };

        // Add state if provided (required for some countries)
        if (deliveryAddress.state) {
          params.state = deliveryAddress.state;
        }

        // Add items
        items.forEach((item: any, index: number) => {
          const itemIndex = index + 1;
          params[`items.${itemIndex}.itemNo`] = item.itemNo;
          params[`items.${itemIndex}.qty`] = item.qty;
        });

        try {
          const result = await makeSunskyRequest('/openapi/order!getPricesAndFreights.do', params, credentials.key, credentials.secret, user.id);
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('getPricesAndFreights error:', error);
          
          // Handle Sunsky API errors gracefully - return 200 with error structure
          if (error instanceof Response) {
            const errorData = await error.json();
            return new Response(JSON.stringify({
              result: 'error',
              message: errorData.message || 'Failed to get prices and shipping costs',
              messages: [errorData.message || 'Failed to get prices and shipping costs'],
              data: null
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Handle regular Error objects (like ITEM_NOT_EXIST)
          const errorMessage = error.message || 'Failed to get prices and shipping costs';
          let userFriendlyMessage = errorMessage;
          
          if (errorMessage === 'ITEM_NOT_EXIST') {
            userFriendlyMessage = 'One or more items are not available in Sunsky catalog. Please check the item numbers and try again.';
          } else if (errorMessage.includes('ITEM_NOT_EXIST')) {
            userFriendlyMessage = 'Some items are not available in Sunsky catalog. Please verify the item numbers.';
          }
          
          return new Response(JSON.stringify({
            result: 'error',
            message: userFriendlyMessage,
            messages: [userFriendlyMessage],
            originalError: errorMessage,
            data: null
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'createOrder': {
        const { orderData, apiId } = requestData;
        console.log('Creating order with apiId:', apiId);
        const credentials = await getApiCredentials(user.id, apiId);
        
        if (!orderData) {
          throw new Error('Order data is required');
        }

        // Validate required fields
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
          throw new Error('Items array is required');
        }
        
        if (!orderData.deliveryAddress) {
          throw new Error('Delivery address is required');
        }

        const params: Record<string, any> = {
          lang: 'en'
        };

        // Add optional order fields
        if (orderData.siteNumber) params.siteNumber = orderData.siteNumber;
        if (orderData.useBalanceOnly !== undefined) params.useBalanceOnly = orderData.useBalanceOnly;
        if (orderData.vatNumber) params.vatNumber = orderData.vatNumber;
        if (orderData.eoriNumber) params.eoriNumber = orderData.eoriNumber;
        if (orderData.iossNumber) params.iossNumber = orderData.iossNumber;
        if (orderData.coupon) params.coupon = orderData.coupon;

        // Add required delivery address fields
        const addr = orderData.deliveryAddress;
        params['deliveryAddress.countryId'] = addr.countryId;
        params['deliveryAddress.receiver'] = addr.receiver;
        params['deliveryAddress.address'] = addr.address;
        params['deliveryAddress.city'] = addr.city;
        params['deliveryAddress.postcode'] = addr.postcode;
        params['deliveryAddress.shippingWayId'] = addr.shippingWayId;

        // Add optional delivery address fields
        if (addr.state) params['deliveryAddress.state'] = addr.state;
        if (addr.company) params['deliveryAddress.company'] = addr.company;
        if (addr.address2) params['deliveryAddress.address2'] = addr.address2;
        if (addr.telephone) params['deliveryAddress.telephone'] = addr.telephone;
        if (addr.email) params['deliveryAddress.email'] = addr.email;
        if (addr.shipment) params['deliveryAddress.shipment'] = addr.shipment;

        // Add items
        orderData.items.forEach((item: any, index: number) => {
          const itemIndex = index + 1;
          params[`items.${itemIndex}.itemNo`] = item.itemNo;
          params[`items.${itemIndex}.qty`] = item.qty;
          if (item.remark) params[`items.${itemIndex}.remark`] = item.remark;
        });

        console.log('Creating Sunsky order with params:', JSON.stringify(params, null, 2));

        try {
          const result = await makeSunskyRequest('/openapi/order!createOrder.do', params, credentials.key, credentials.secret, user.id);
          
          console.log('Sunsky order creation result:', JSON.stringify(result, null, 2));
          
          // If order creation was successful and we have apiId, update related PO orders with the credential ID
          if (result.result === 'success' && result.data?.number && apiId) {
            const orderNumber = result.data.number;
            console.log(`Order ${orderNumber} created successfully, updating PO orders with credential ID ${apiId}`);
            
            // Update PO orders that will use this supplier order number
            const { error: updateError } = await supabase
              .from('po_orders')
              .update({ 
                supplier_order_number: orderNumber,
                sunsky_credentials_id: apiId 
              })
              .in('id', orderData.selectedOrderIds || []);
              
            if (updateError) {
              console.error('Failed to update PO orders with credential ID:', updateError);
            }
          }
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Sunsky order creation error:', error);
          
          // Return error as a proper response instead of throwing
          return new Response(JSON.stringify({
            result: 'error',
            message: error.message,
            messages: [error.message]
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Return 200 status with error in the body
          });
        }
      }

      case 'listApiKeys': {
        const { data: apiKeys, error } = await supabase.rpc('get_user_sunsky_credentials_secure');

        if (error) {
          throw new Error(`Failed to load API keys: ${error.message}`);
        }

        const formattedKeys = apiKeys?.map(key => ({
          id: key.id,
          name: key.name || 'Unnamed API Key',
          maskedKey: key.key_last4 ? '***' + key.key_last4 : 'Hidden',
          isActive: key.is_active || false,
          status: 'unknown', // Will be updated when tested
          lastTested: key.last_tested ? new Date(key.last_tested) : undefined
        })) || [];

        return new Response(JSON.stringify({
          result: 'success',
          apiKeys: formattedKeys
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'addApiKey': {
        const { apiKey, apiSecret, name } = requestData;

        if (!apiKey || !apiSecret || !name) {
          throw new Error('API key, secret, and name are required');
        }

        const encryptionKey = Deno.env.get('SUNSKY_CRED_ENC_KEY');
        if (!encryptionKey) {
          throw new Error('Encryption key not configured');
        }

        // Check if this is the first API key for the user
        const { count } = await supabase
          .from('sunsky_credentials')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);

        const isFirst = count === 0;

        // Encrypt the credentials before storing
        const { data: encryptedKey } = await supabase.rpc('pgp_sym_encrypt', {
          data: apiKey,
          passphrase: encryptionKey
        });

        const { data: encryptedSecret } = await supabase.rpc('pgp_sym_encrypt', {
          data: apiSecret,
          passphrase: encryptionKey
        });

        // Insert new API key with encrypted data
        const { data, error } = await supabase
          .from('sunsky_credentials')
          .insert({
            user_id: user.id,
            api_key_encrypted: encryptedKey,
            api_secret_encrypted: encryptedSecret,
            key_last4: apiKey.length >= 4 ? apiKey.slice(-4) : apiKey,
            name: name,
            is_active: isFirst // First API key becomes active by default
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to add API key: ${error.message}`);
        }

        return new Response(JSON.stringify({
          result: 'success',
          message: 'API key added successfully',
          apiKey: {
            id: data.id,
            name: data.name,
            maskedKey: '***' + (data.key_last4 || '****'),
            isActive: data.is_active
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'toggleApiKeyActive': {
        const { apiId, isActive } = requestData;

        if (!apiId) {
          throw new Error('API ID is required');
        }

        // Update the API key's active status
        const { error } = await supabase
          .from('sunsky_credentials')
          .update({ is_active: isActive })
          .eq('id', apiId)
          .eq('user_id', user.id);

        if (error) {
          throw new Error(`Failed to update API key: ${error.message}`);
        }

        return new Response(JSON.stringify({
          result: 'success',
          message: isActive ? 'API key activated successfully' : 'API key deactivated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'toggleApiKeyActive': {
        const { apiId, isActive } = requestData;

        if (!apiId) {
          throw new Error('API ID is required');
        }

        // Update the API key's active status
        const { error } = await supabase
          .from('sunsky_credentials')
          .update({ is_active: isActive })
          .eq('id', apiId)
          .eq('user_id', user.id);

        if (error) {
          throw new Error(`Failed to update API key: ${error.message}`);
        }

        return new Response(JSON.stringify({
          result: 'success',
          message: isActive ? 'API key activated successfully' : 'API key deactivated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'listOrders': {
        const { pageSize = 40, page = 1, status, siteNumber, gmtCreatedStart, gmtCreatedEnd, apiKey, apiSecret } = requestData;
        
        // Use provided credentials if available, otherwise get from database/env
        const credentials = apiKey && apiSecret 
          ? { key: apiKey, secret: apiSecret }
          : await getApiCredentials(user.id);
        
        if (!credentials) {
          throw new Error('No active Sunsky API credentials found');
        }

        console.log('Using credentials for listOrders:', { 
          hasKey: !!credentials.key, 
          hasSecret: !!credentials.secret,
          keyPreview: credentials.key?.substring(0, 6) + '...'
        });

        const params: any = {
          pageSize: Math.min(pageSize, 100),
          page: Math.max(page, 1)
        };

        if (status) params.status = status;
        if (siteNumber) params.siteNumber = siteNumber;
        if (gmtCreatedStart) params.gmtCreatedStart = gmtCreatedStart;
        if (gmtCreatedEnd) params.gmtCreatedEnd = gmtCreatedEnd;

        const response = await makeSunskyRequest(
          '/openapi/order!getOrderList.do',
          params,
          credentials.key,
          credentials.secret,
          user.id
        );

        console.log('Sunsky API response for listOrders (no auto-storage):', { 
          hasResult: !!response.result, 
          resultType: typeof response.result,
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : [],
          resultLength: response.data?.result?.length || 0
        });

        // NOTE: We no longer auto-store all orders from listOrders
        // Orders are only stored via getOrderDetails with PO context
        console.log('ListOrders: Returning API response without storing all orders');

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getOrderDetails': {
        const { orderNumber, poNumbers, apiId } = requestData;
        
        console.log('=== getOrderDetails START ===');
        console.log('Request data:', { orderNumber, poNumbers, apiId });
        
        if (!orderNumber) {
          console.error('Order number is required');
          return new Response(JSON.stringify({ 
            result: 'error', 
            reason: 'invalid_input',
            message: 'Order number is required' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          let finalApiId = apiId;
          
          // If no apiId provided, try to derive it from existing order data or PO orders
          if (!finalApiId) {
            console.log('No apiId provided, attempting to derive from existing data...');
            
            // First try to get it from existing sunsky_orders
            const { data: existingOrder } = await supabase
              .from('sunsky_orders')
              .select('sunsky_credentials_id')
              .eq('number', orderNumber)
              .eq('user_id', user.id)
              .single();
              
            if (existingOrder?.sunsky_credentials_id) {
              finalApiId = existingOrder.sunsky_credentials_id;
              console.log('Found credential ID from existing order:', finalApiId);
            } else if (poNumbers && poNumbers.length > 0) {
              // Try to get it from PO orders that match this supplier order number
              const { data: poWithCredential } = await supabase
                .from('po_orders')
                .select('sunsky_credentials_id')
                .eq('supplier_order_number', orderNumber)
                .eq('user_id', user.id)
                .not('sunsky_credentials_id', 'is', null)
                .limit(1)
                .single();
                
              if (poWithCredential?.sunsky_credentials_id) {
                finalApiId = poWithCredential.sunsky_credentials_id;
                console.log('Found credential ID from PO order:', finalApiId);
              }
            }
          }
          
          // Get credentials from database/env with final apiId
          console.log('Getting API credentials for user:', user.id, 'apiId:', finalApiId);
          const credentials = await getApiCredentials(user.id, finalApiId);
          
          if (!credentials) {
            console.error('No active Sunsky API credentials found');
            return new Response(JSON.stringify({ 
              result: 'error', 
              reason: 'no_credentials',
              message: 'No active Sunsky API credentials found. Please add your Sunsky API credentials.' 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log('Making Sunsky API request for order:', orderNumber);
          
          const response = await makeSunskyRequest(
            '/openapi/order!getOrderDetails.do',
            { number: orderNumber },
            credentials.key,
            credentials.secret,
            user.id
          );

          console.log('Sunsky API response:', { 
            hasResult: !!response.result, 
            resultType: typeof response.result,
            orderNumber: orderNumber,
            message: response.message || 'No message'
          });

          if (response.result === 'success' && response.data) {
            const order = response.data;
            console.log('Processing order details for storage with PO numbers:', poNumbers);
            
            // Store the main order with status tracking and credential info
            const now = new Date().toISOString();
            const orderToUpsert = {
              user_id: user.id,
              number: order.number,
              status: order.status?.toString() || null,
              status_last_updated_at: order.gmtPaid || order.gmtShipped || order.gmtCreated || now,
              site_number: order.siteNumber || null,
              po_numbers: poNumbers || [],
              sunsky_credentials_id: finalApiId || null, // Use finalApiId instead of apiId
              gmt_created: order.gmtCreated ? new Date(order.gmtCreated) : null,
              total: order.totalAmount ? parseFloat(order.totalAmount) : null,
              currency: order.currency || 'USD',
              shipping_company: order.shippingWay?.name || null,
              tracking_number: order.trackingNumber || null,
              tracking_url: order.shippingWay?.queryUrl || null,
              last_synced_at: now,
              raw: order
            };

            console.log('Upserting order to database:', orderToUpsert.number);
            const { error: insertError } = await supabase
              .from('sunsky_orders')
              .upsert([orderToUpsert], { onConflict: 'number' });
            
            if (insertError) {
              console.error('Error storing order:', insertError);
              return new Response(JSON.stringify({ 
                result: 'error', 
                message: 'Failed to store order: ' + insertError.message 
              }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            } else {
              console.log('Successfully stored order details');
            }
            
            // Store order items with status tracking if available - use detailList from getOrderDetails
            const orderItems = order.detailList || order.items || [];
            if (orderItems && Array.isArray(orderItems)) {
              const itemsToUpsert = orderItems.map((item: any) => ({
                user_id: user.id,
                order_number: order.number,
                sku_code: item.itemNo || item.skuCode || null,
                model_number: item.modelNumber || null,
                title: item.title || null,
                quantity: item.qty ? parseInt(item.qty) : (item.quantity ? parseInt(item.quantity) : null),
                unit_price: item.price ? parseFloat(item.price) : (item.unitPrice ? parseFloat(item.unitPrice) : null),
                currency: order.currency || 'USD',
                asin: item.asin || null,
                item_status: item.status || order.status || null,
                status_last_updated_at: order.gmtPaid || order.gmtShipped || order.gmtCreated || now,
                expected_ship_date: item.expectedShipDate ? new Date(item.expectedShipDate) : null,
                last_synced_at: now,
                raw: item
              }));

              console.log(`Upserting ${itemsToUpsert.length} order items`);
              const { error: itemsError } = await supabase
                .from('sunsky_order_items')
                .upsert(itemsToUpsert, { onConflict: 'user_id,order_number,sku_code' });
              
              if (itemsError) {
                console.error('Error storing order items:', itemsError);
                return new Response(JSON.stringify({ 
                  result: 'error', 
                  message: 'Failed to store order items: ' + itemsError.message 
                }), {
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              } else {
                console.log(`Successfully stored ${itemsToUpsert.length} order items`);
              }
            }
            
            console.log('=== getOrderDetails SUCCESS ===');
            return new Response(JSON.stringify({
              result: 'success',
              message: 'Order details synchronized successfully',
              data: order
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            // Handle error responses - may indicate API/credential issues rather than unpaid orders
            console.log('Sunsky API Response Details:', {
              result: response.result,
              message: response.message,
              messages: response.messages,
              hasData: !!response.data,
              orderNumber: orderNumber
            });
            
            // For orders that should exist (from PO system), an error likely means API issues
            if (poNumbers && poNumbers.length > 0) {
              console.log(`Order ${orderNumber} is from PO system but API returned error - likely credential or API issue`);
              
              // Return an error to indicate we should try with different credentials or retry later
              return new Response(JSON.stringify({ 
                result: 'error', 
                reason: 'api_issue',
                message: `Order ${orderNumber} exists in PO system but Sunsky API returned error. This may be due to API credential issues or API access problems. Please check your Sunsky credentials or try again later.`
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            // For orders not in PO system, store as error status
            const now = new Date().toISOString();
            const minimalOrder = {
              user_id: user.id,
              sunsky_credentials_id: finalApiId || null,
              number: orderNumber,
              status: 'api_error',
              status_last_updated_at: now,
              po_numbers: poNumbers || [],
              last_synced_at: now,
              raw: response
            };

            console.log('Storing order with API error status:', orderNumber);
            const { error: insertError } = await supabase
              .from('sunsky_orders')
              .upsert([minimalOrder], { onConflict: 'number' });
            
            if (insertError) {
              console.error('Error storing order with API error:', insertError);
              return new Response(JSON.stringify({ 
                result: 'error', 
                reason: 'storage_failed',
                message: 'Failed to store order: ' + insertError.message 
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            return new Response(JSON.stringify({ 
              result: 'success', 
              reason: 'api_error',
              message: 'Order stored with API error status - please check credentials or try again later'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (error: any) {
          console.error('Error in getOrderDetails:', error);
          return new Response(JSON.stringify({ 
            result: 'error', 
            reason: 'api_error',
            message: 'Failed to connect to Sunsky API: ' + error.message 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'getAllOrders': {
        const { apiId, skipDeliveredOrders = [] } = requestData;
        
        if (!apiId) {
          throw new Error('API credential ID is required');
        }

        const credentials = await getApiCredentials(user.id, apiId);
        if (!credentials) {
          throw new Error('No Sunsky API credentials found for the provided API ID');
        }

        console.log('Fetching ALL orders from Sunsky API...');
        console.log(`Will skip ${skipDeliveredOrders.length} delivered orders`);
        
        // Create a set for faster lookup of orders to skip
        const skipOrderNumbers = new Set(skipDeliveredOrders);
        
        // Fetch orders from Sunsky API using listOrders
        let allOrders: any[] = [];
        let page = 1;
        let pageSize = 100; // Max allowed
        let totalFetched = 0;
        let skippedCount = 0;
        
        try {
          // Fetch all pages of orders
          while (true) {
            console.log(`Fetching page ${page} from Sunsky API...`);
            
            const params = {
              pageSize,
              page
            };

            const response = await makeSunskyRequest(
              '/openapi/order!getOrderList.do',
              params,
              credentials.key,
              credentials.secret,
              user.id
            );

            if (response.result !== 'success') {
              throw new Error(`Sunsky API error: ${response.messages?.[0] || 'Unknown error'}`);
            }

            const pageOrders = response.data?.result || [];
            const totalPages = response.data?.pageCount || 1;
            
            console.log(`Page ${page}: Got ${pageOrders.length} orders, total pages: ${totalPages}`);
            
            // Filter out delivered orders that we already have in the database
            const ordersToSync = pageOrders.filter((order: any) => {
              const orderNumber = order.number || order.orderNumber;
              if (skipOrderNumbers.has(orderNumber)) {
                skippedCount++;
                console.log(`Skipping delivered order: ${orderNumber}`);
                return false;
              }
              return true;
            });
            
            allOrders = [...allOrders, ...ordersToSync];
            totalFetched += ordersToSync.length;
            
            // Break if we've fetched all pages or no more orders
            if (page >= totalPages || pageOrders.length === 0) {
              break;
            }
            
            page++;
            
            // Safety limit to prevent infinite loops
            if (page > 100) {
              console.warn('Reached page limit of 100, stopping fetch');
              break;
            }
          }
          
          console.log(`Successfully fetched ${totalFetched} orders to sync, skipped ${skippedCount} delivered orders`);
          
          return new Response(JSON.stringify({
            result: 'success',
            orders: allOrders,
            totalCount: totalFetched,
            skippedCount: skippedCount
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
          
        } catch (error: any) {
          console.error('Error fetching all orders from Sunsky:', error);
          return new Response(JSON.stringify({
            result: 'error',
            message: `Failed to fetch orders from Sunsky: ${error.message}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'saveOrderWithItems': {
        const { orderData, apiId } = requestData;
        
        if (!orderData) {
          throw new Error('Order data is required');
        }
        
        if (!apiId) {
          throw new Error('API credential ID is required');
        }

        console.log(`Saving order ${orderData.number} to database...`);
        
        try {
          const now = new Date().toISOString();
          
          // Format order for database storage
          const orderToUpsert = {
            user_id: user.id,
            sunsky_credentials_id: apiId,
            number: orderData.number,
            status: orderData.status || 'unknown',
            site_number: orderData.siteNumber || null,
            gmt_created: orderData.gmtCreated ? new Date(orderData.gmtCreated).toISOString() : now,
            gmt_paid: orderData.gmtPaid ? new Date(orderData.gmtPaid).toISOString() : null,
            gmt_shipped: orderData.gmtShipped ? new Date(orderData.gmtShipped).toISOString() : null,
            total: orderData.totalAmount || orderData.amount || null,
            currency: orderData.currency || 'USD',
            shipping_company: orderData.deliveryAddress?.shippingWay?.name || null,
            tracking_number: orderData.trackingNumber || null,
            tracking_url: orderData.deliveryAddress?.shippingWay?.queryUrl || null,
            status_last_updated_at: now,
            last_synced_at: now,
            raw: orderData
          };

          // Store the main order
          const { error: insertError } = await supabase
            .from('sunsky_orders')
            .upsert([orderToUpsert], { onConflict: 'number' });
          
          if (insertError) {
            throw new Error(`Failed to store order: ${insertError.message}`);
          }
          
          // Store order items if available
          const orderItems = orderData.detailList || orderData.items || [];
          if (orderItems && Array.isArray(orderItems) && orderItems.length > 0) {
            const itemsToUpsert = orderItems.map((item: any) => ({
              user_id: user.id,
              order_number: orderData.number,
              sku_code: item.itemNo || item.skuCode || null,
              model_number: item.modelNumber || null,
              title: item.title || null,
              quantity: item.qty ? parseInt(item.qty) : (item.quantity ? parseInt(item.quantity) : null),
              unit_price: item.price ? parseFloat(item.price) : (item.unitPrice ? parseFloat(item.unitPrice) : null),
              currency: orderData.currency || 'USD',
              asin: item.asin || null,
              item_status: item.status || orderData.status || null,
              status_last_updated_at: now,
              expected_ship_date: item.expectedShipDate ? new Date(item.expectedShipDate) : null,
              last_synced_at: now,
              raw: item
            }));

            const { error: itemsError } = await supabase
              .from('sunsky_order_items')
              .upsert(itemsToUpsert, { onConflict: 'user_id,order_number,sku_code' });
            
            if (itemsError) {
              console.warn(`Warning: Failed to store some order items for ${orderData.number}:`, itemsError);
            } else {
              console.log(`Successfully stored ${itemsToUpsert.length} items for order ${orderData.number}`);
            }
          }
          
          return new Response(JSON.stringify({
            result: 'success',
            message: `Order ${orderData.number} saved successfully`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
          
        } catch (error: any) {
          console.error(`Error saving order ${orderData.number}:`, error);
          return new Response(JSON.stringify({
            result: 'error',
            message: `Failed to save order ${orderData.number}: ${error.message}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'getOrderLabels': {
        const { orderNumber } = requestData;
        
        if (!orderNumber) {
          throw new Error('Order number is required');
        }

        const credentials = await getApiCredentials(user.id);
        if (!credentials) {
          throw new Error('No active Sunsky API credentials found');
        }

        const response = await makeSunskyRequest(
          '/openapi/order!getLabels.do',
          { number: orderNumber },
          credentials
        );

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getRecentOrders': {
        const { apiId, skipDeliveredOrders = true, dateFrom } = requestData;
        
        if (!apiId) {
          throw new Error('API credential ID is required');
        }

        const credentials = await getApiCredentials(user.id, apiId);
        
        // Set default date to last 30 days if not provided
        const defaultDateFrom = new Date();
        defaultDateFrom.setDate(defaultDateFrom.getDate() - 30);
        const fromDate = dateFrom || defaultDateFrom.toISOString().split('T')[0];
        
        console.log('Fetching recent orders with params:', { 
          apiId, 
          skipDeliveredOrders, 
          dateFrom: fromDate 
        });

        try {
          const params: any = {
            pageSize: 100,
            page: 1,
            gmtCreatedStart: fromDate
          };

          // Skip delivered orders if requested
          if (skipDeliveredOrders) {
            // Filter out delivered status orders
            params.status = 'pending,processing,shipped'; // Adjust statuses as needed
          }

          const response = await makeSunskyRequest(
            '/openapi/order!listOrders.do',
            params,
            credentials.key,
            credentials.secret,
            user.id
          );

          if (response.result === 'success') {
            console.log(`Fetched ${response.data?.orders?.length || 0} recent orders`);
            
            return new Response(JSON.stringify({
              result: 'success',
              data: response.data,
              message: `Retrieved ${response.data?.orders?.length || 0} recent orders`
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            throw new Error(response.messages?.[0] || 'Failed to fetch recent orders');
          }
        } catch (error: any) {
          console.error('Error fetching recent orders:', error);
          
          return new Response(JSON.stringify({
            result: 'error',
            message: `Failed to fetch recent orders: ${error.message}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'setActiveApiKey': {
        const { apiId } = requestData;

        if (!apiId) {
          throw new Error('API ID is required');
        }

        // First, set all API keys to inactive
        const { error: deactivateError } = await supabase
          .from('sunsky_credentials')
          .update({ is_active: false })
          .eq('user_id', user.id);

        if (deactivateError) {
          throw new Error(`Failed to deactivate API keys: ${deactivateError.message}`);
        }

        // Then, set the specified API key to active
        const { error: activateError } = await supabase
          .from('sunsky_credentials')
          .update({ is_active: true })
          .eq('id', apiId)
          .eq('user_id', user.id);

        if (activateError) {
          throw new Error(`Failed to activate API key: ${activateError.message}`);
        }

        return new Response(JSON.stringify({
          result: 'success',
          message: 'Active API key updated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'deleteApiKey': {
        const { apiId } = requestData;

        if (!apiId) {
          throw new Error('API ID is required');
        }

        // Check if this is the only API key
        const { count } = await supabase
          .from('sunsky_credentials')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);

        if (count <= 1) {
          throw new Error('Cannot delete the last API key');
        }

        // Check if we're deleting the active API key
        const { data: deletingKey } = await supabase
          .from('sunsky_credentials')
          .select('is_active')
          .eq('id', apiId)
          .eq('user_id', user.id)
          .single();

        // Delete the API key
        const { error } = await supabase
          .from('sunsky_credentials')
          .delete()
          .eq('id', apiId)
          .eq('user_id', user.id);

        if (error) {
          throw new Error(`Failed to delete API key: ${error.message}`);
        }

        // If we deleted the active API key, make the first remaining one active
        if (deletingKey?.is_active) {
          const { data: firstKey } = await supabase
            .from('sunsky_credentials')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (firstKey) {
            await supabase
              .from('sunsky_credentials')
              .update({ is_active: true })
              .eq('id', firstKey.id);
          }
        }

        return new Response(JSON.stringify({
          result: 'success',
          message: 'API key deleted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    } catch (error) {
      console.error('❌ Fatal error in Sunsky API function:', error);
      console.error('Error details:', {
        name: error?.constructor?.name,
        message: error?.message,
        stack: error?.stack,
        type: typeof error
      });
      
      return new Response(JSON.stringify({ 
        result: 'error', 
        message: error?.message || 'Unknown error occurred',
        errorType: error?.constructor?.name || 'UnknownError',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  
  } catch (topLevelError) {
    // Top-level error boundary - catches ANY error that wasn't caught by inner try-catch
    console.error('🔥 TOP-LEVEL ERROR BOUNDARY TRIGGERED:', topLevelError);
    console.error('🔥 This error occurred before/outside the main error handler');
    console.error('🔥 Full error details:', {
      name: topLevelError?.constructor?.name,
      message: topLevelError?.message,
      stack: topLevelError?.stack,
      type: typeof topLevelError,
      stringified: String(topLevelError)
    });
    
    // Try to return a response, but be extra careful
    try {
      return new Response(JSON.stringify({ 
        result: 'error', 
        message: 'Critical system error: ' + (topLevelError?.message || 'Unknown error'),
        errorType: topLevelError?.constructor?.name || 'CriticalError',
        category: 'top_level_boundary',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (responseError) {
      // If even creating the error response fails, return a basic response
      console.error('🔥 FAILED TO CREATE ERROR RESPONSE:', responseError);
      return new Response('Critical system error', {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }
  }
});
