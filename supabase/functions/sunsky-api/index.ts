
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

// Generate signature for Sunsky API
async function generateSignature(params: Record<string, any>, key: string, secret: string): Promise<string> {
  // Sort parameters by key name and concatenate key=value pairs
  const sortedKeys = Object.keys(params).sort();
  let concatenated = '';
  
  for (const paramKey of sortedKeys) {
    concatenated += paramKey + '=' + params[paramKey] + '&';
  }
  
  // Add key parameter
  concatenated += 'key=' + key + '&';
  
  // Remove trailing & and append secret
  concatenated = concatenated.slice(0, -1);
  const stringToHash = concatenated + secret;
  
  console.log('String to hash:', stringToHash);
  
  return await md5(stringToHash);
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

// Make authenticated request to Sunsky API
async function makeSunskyRequest(endpoint: string, params: Record<string, any>, key: string, secret: string) {
  const signature = await generateSignature(params, key, secret);
  
  const requestBody = new URLSearchParams({
    ...params,
    key,
    signature
  });

  console.log(`Making request to: https://open.sunsky-online.com${endpoint}`);
  
  const response = await fetch(`https://open.sunsky-online.com${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody
  });

  if (!response.ok) {
    throw new Error(`Sunsky API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
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
          const result = await makeSunskyRequest('/openapi/category!getChildren.do', params, credentials.key, credentials.secret);
          
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
          leadTimeLevel 
        } = requestData;

        const params: Record<string, any> = {
          lang: 'en',
          pageSize: Math.min(pageSize, 100),
          page,
          status: 1, // Valid products only
        };

        if (categoryId) params.categoryId = categoryId;
        if (brandId) params.brandId = brandId;
        if (keyword) params.keyword = keyword;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
        if (brandName) params.brandName = brandName;
        if (leadTimeLevel) params.leadTimeLevel = leadTimeLevel;

        console.log('Search params:', params);

        const result = await makeSunskyRequest('/openapi/product!search.do', params, credentials.key, credentials.secret);
        
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

        const result = await makeSunskyRequest('/openapi/product!detail.do', params, credentials.key, credentials.secret);
        
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
          // Get detailed product information
          const productResult = await makeSunskyRequest(
            '/openapi/product!detail.do',
            { lang: 'en', itemNo: sku.itemNo },
            credentials.key,
            credentials.secret
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
        const { parentId = 0 } = requestData;

        const params = {
          lang: 'en',
          parentId: parentId.toString()
        };

        const result = await makeSunskyRequest('/openapi/category!getChildren.do', params, credentials.key, credentials.secret);
        
        if (result.result === 'error') {
          throw new Error(result.messages?.[0] || 'Sunsky API error');
        }

        return new Response(JSON.stringify(result), {
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
