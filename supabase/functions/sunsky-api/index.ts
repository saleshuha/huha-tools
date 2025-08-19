import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
  "product.detail": { minute: 480, day: 1000000 }
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
  // If specific API ID is provided, use those credentials
  if (apiId) {
    const { data: specificCredentials } = await supabase
      .from('sunsky_credentials')
      .select('api_key, api_secret')
      .eq('id', apiId)
      .eq('user_id', userId)
      .single();

    if (specificCredentials?.api_key && specificCredentials?.api_secret) {
      console.log('Using specific Sunsky credentials for API ID:', apiId);
      return {
        key: specificCredentials.api_key,
        secret: specificCredentials.api_secret
      };
    }
  }

  // Try to get user-specific credentials (active ones)
  const { data: userCredentials } = await supabase
    .from('sunsky_credentials')
    .select('api_key, api_secret')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (userCredentials?.api_key && userCredentials?.api_secret) {
    console.log('Using user-specific Sunsky credentials');
    return {
      key: userCredentials.api_key,
      secret: userCredentials.api_secret
    };
  }

  // Fallback to environment variables
  const envKey = Deno.env.get('SUNSKY_API_KEY');
  const envSecret = Deno.env.get('SUNSKY_API_SECRET');
  
  if (!envKey || !envSecret) {
    throw new Error('No Sunsky API credentials available');
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

  if (result.result === 'error') {
    console.error('Sunsky API Error:', result);
    throw new Error(result.messages?.[0] || 'Sunsky API returned an error');
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
    
    // For category import, we'll process in chunks as we fetch
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...requestData } = await req.json();
    
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Get user's profile for country information
    const { data: profile } = await supabase
      .from('profiles')
      .select('country')
      .eq('id', user.id)
      .single();

    const userCountry = profile?.country || 'UAE';

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
        const credentials = await getApiCredentials(user.id);
        
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
        const { data: userCredentials } = await supabase
          .from('sunsky_credentials')
          .select('api_key')
          .eq('user_id', user.id)
          .single();

        return new Response(JSON.stringify({
          result: 'success',
          hasCredentials: !!userCredentials?.api_key
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

      case 'searchProducts': {
        const { apiId } = requestData;
        const credentials = await getApiCredentials(user.id, apiId);
        
        const { 
          categoryId, 
          brandId,
          keyword,
          dateFrom,
          dateTo,
          pageSize = 40, 
          page = 1, 
          brandName,
          searchTerm,
          leadTimeLevel,
          status = 1, // Default to valid products only
          gmtModifiedStart
        } = requestData;

        const params: Record<string, any> = {
          lang: 'en',
          pageSize: Math.min(pageSize, 100),
          page,
          status
        };

        if (categoryId) params.categoryId = categoryId;
        if (brandId) params.brandId = brandId;
        if (keyword) params.keyword = keyword;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        if (brandName) params.brandName = brandName;
        if (leadTimeLevel) params.leadTimeLevel = leadTimeLevel;
        if (gmtModifiedStart) params.gmtModifiedStart = gmtModifiedStart;

        console.log('Search params:', params);

        try {
          const result = await makeSunskyRequest('/openapi/product!search.do', params, credentials.key, credentials.secret, user.id);
        
          if (result.result === 'error') {
            console.error('Sunsky search error:', result);
            throw new Error(result.messages?.[0] || 'Sunsky API error');
          }

        // Convert prices for products if they exist
        if (result.result === 'success' && result.data?.result) {
          for (const product of result.data.result) {
            if (product.price) {
              try {
                const priceUSD = parseFloat(product.price);
                product.convertedPrice = await convertCurrency(priceUSD, userCountry);
                product.convertedCurrency = userCountry === 'KSA' ? 'SAR' : 'AED';
              } catch (error) {
                console.error('Currency conversion error:', error);
                product.convertedPrice = parseFloat(product.price);
                product.convertedCurrency = 'USD';
              }
            }
          }
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

      case 'getProductDetails': {
        const credentials = await getApiCredentials(user.id);
        const { itemNo } = requestData;

        if (!itemNo) {
          throw new Error('itemNo is required');
        }

        const params = {
          lang: 'en',
          itemNo
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

            processedSKUs.push({
              user_id: user.id,
              sku_code: product.itemNo,
              title: product.name,
              cost: convertedCost,
              weight: product.unitWeight ? parseFloat(product.unitWeight) : null,
              description: `Imported from Sunsky - Lead Time: ${product.leadTime || 'N/A'}`,
              currency: userCountry === 'KSA' ? 'SAR' : 'AED',
              country: userCountry
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
        const { apiId } = requestData;
        const credentials = await getApiCredentials(user.id, apiId);
        const { parentId, lang = 'en', gmtModifiedStart } = requestData;

        const params: Record<string, any> = {
          lang
        };

        // Add parentId only if specified (null means all categories)
        if (parentId !== null && parentId !== undefined) {
          params.parentId = parentId.toString();
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

      case 'getBrands': {
        const { apiId } = requestData;
        const credentials = await getApiCredentials(user.id, apiId);
        const { lang = 'en' } = requestData;

        const params = { lang };

        console.log('Getting brands with params:', params);

        try {
          const result = await makeSunskyRequest('/openapi/brand!getAll.do', params, credentials.key, credentials.secret, user.id);
        
          if (result.result === 'error') {
            throw new Error(result.messages?.[0] || 'Sunsky API error');
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

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Sunsky API function error:', error);
    return new Response(JSON.stringify({ 
      result: 'error', 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
