
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
async function getApiCredentials(userId: string): Promise<{ key: string; secret: string }> {
  // Try to get user-specific credentials first
  const { data: userCredentials } = await supabase
    .from('sunsky_credentials')
    .select('api_key, api_secret')
    .eq('user_id', userId)
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
          throw new Error('Failed to save credentials');
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
        const credentials = await getApiCredentials(user.id);
        
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
              description: product.description,
              cost: convertedCost,
              weight: product.unitWeight ? parseFloat(product.unitWeight) : null,
              notes: `Imported from Sunsky - Lead Time: ${product.leadTime || 'N/A'}`,
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
                  .insert(processedSKUs)
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

        // Insert SKUs into database
        const { data: insertedSKUs, error: insertError } = await supabase
          .from('sunsky_skus')
          .insert(processedSKUs)
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
        const credentials = await getApiCredentials(user.id);
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
