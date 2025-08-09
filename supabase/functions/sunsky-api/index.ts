import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple MD5 implementation for Sunsky API signature
function simpleMD5(text: string): string {
  // Since MD5 is not available in edge runtime, we'll use a simple hash
  // This is a simplified approach - in production you might want to use a proper MD5 library
  let hash = 0;
  if (text.length === 0) return hash.toString(16).padStart(32, '0');
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to hex and pad to 32 characters to mimic MD5 format
  const hexHash = Math.abs(hash).toString(16);
  return hexHash.padStart(32, '0').substring(0, 32);
}

// Generate signature for Sunsky API
function generateSignature(params: Record<string, any>, key: string, secret: string): string {
  // Sort parameters by key name and concatenate values with key
  const sortedKeys = Object.keys(params).sort();
  let concatenated = '';
  
  for (const paramKey of sortedKeys) {
    concatenated += params[paramKey];
  }
  concatenated += key;
  
  // Append secret with @ separator
  const stringToHash = concatenated + '@' + secret;
  
  return simpleMD5(stringToHash);
}

// Make authenticated request to Sunsky API
async function makeSunskyRequest(endpoint: string, params: Record<string, any>, key: string, secret: string) {
  const signature = generateSignature(params, key, secret);
  
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

    // Get Sunsky API credentials from secrets
    const sunskyKey = Deno.env.get('SUNSKY_API_KEY');
    const sunskySecret = Deno.env.get('SUNSKY_API_SECRET');
    
    if (!sunskyKey || !sunskySecret) {
      throw new Error('Sunsky API credentials not configured');
    }

    switch (action) {
      case 'searchProducts': {
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

        const result = await makeSunskyRequest('/openapi/product!search.do', params, sunskyKey, sunskySecret);
        
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
        const { itemNo } = requestData;

        if (!itemNo) {
          throw new Error('itemNo is required');
        }

        const params = {
          lang: 'en',
          itemNo
        };

        const result = await makeSunskyRequest('/openapi/product!detail.do', params, sunskyKey, sunskySecret);
        
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
            sunskyKey,
            sunskySecret
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
        const { parentId = 0 } = requestData;

        const params = {
          lang: 'en',
          parentId: parentId.toString()
        };

        const result = await makeSunskyRequest('/openapi/category!getChildren.do', params, sunskyKey, sunskySecret);
        
        if (result.result === 'error') {
          throw new Error(result.messages?.[0] || 'Sunsky API error');
        }

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getBrands': {
        const params = {
          lang: 'en',
          pageSize: 100,
          page: 1
        };

        console.log('Getting brands with params:', params);

        // Try the brand list endpoint - this might need to be adjusted based on actual API
        const result = await makeSunskyRequest('/openapi/brand!list.do', params, sunskyKey, sunskySecret);
        
        console.log('Brand API result:', result);
        
        if (result.result === 'error') {
          console.error('Brand API error:', result);
          // Return empty array instead of throwing error to prevent component crash
          return new Response(JSON.stringify({
            result: 'success',
            data: []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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