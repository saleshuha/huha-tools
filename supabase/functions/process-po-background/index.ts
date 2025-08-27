import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, user-agent',
}

interface SunskyCredential {
  id: string;
  api_key: string;
  api_secret: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader)
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    const { action, jobId, modelData } = await req.json()

    if (action === 'start') {
      console.log(`Starting background PO processing for user ${user.id}`)
      
      // Start background processing without waiting
      EdgeRuntime.waitUntil(processModelNumbersBackground(supabaseClient, user.id, jobId, modelData))
      
      return new Response(
        JSON.stringify({ success: true, message: 'Background processing started', jobId }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )

  } catch (error) {
    console.error('Background processing error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function processModelNumbersBackground(supabaseClient: any, userId: string, jobId: string, modelData: any) {
  try {
    console.log(`Background processing started for job ${jobId}`)

    // Get user's country from profile
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('country')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      console.error('Failed to get user profile:', profileError)
      throw new Error("Failed to get user profile")
    }

    const userCountry = userProfile.country || 'UAE' // fallback to UAE if no country set
    console.log(`Using user country: ${userCountry}`)

    // Get all active API keys
    const { data: activeKeys, error: keysError } = await supabaseClient
      .from('sunsky_credentials')
      .select('id, api_key, api_secret')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (keysError || !activeKeys || activeKeys.length === 0) {
      throw new Error("No active API keys found")
    }

    console.log(`Found ${activeKeys.length} active API keys for parallel processing`)

    const uniqueModelNumbers = modelData.uniqueModels

    // Update job status to processing
    await supabaseClient
      .from('sunsky_import_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Chunk model numbers across API keys
    const chunkSize = Math.ceil(uniqueModelNumbers.length / activeKeys.length)
    const chunks = []
    
    for (let i = 0; i < activeKeys.length; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, uniqueModelNumbers.length)
      if (start < uniqueModelNumbers.length) {
        chunks.push({
          apiKey: activeKeys[i],
          modelNumbers: uniqueModelNumbers.slice(start, end),
          chunkIndex: i
        })
      }
    }

    let totalProcessed = 0
    let totalSuccess = 0
    let totalErrors = 0

    // Process chunks in parallel
    const processChunk = async (chunk: any) => {
      const { apiKey, modelNumbers, chunkIndex } = chunk
      let chunkSuccess = 0
      let chunkErrors = 0

      for (const modelNumber of modelNumbers) {
        try {
          let productToImport = null

          // Try direct lookup first
          if (modelNumber.match(/^[A-Z0-9]{6,}$/i)) {
            try {
              const detailResponse = await callSunskyAPI('getProductDetails', {
                itemNo: modelNumber,
                apiId: apiKey.id
              }, apiKey)
              
              if (detailResponse?.result === 'success' && detailResponse.data) {
                productToImport = detailResponse.data
              }
            } catch (error) {
              // Ignore "not found" errors, try search instead
            }
          }

          // Try search if no direct match
          if (!productToImport) {
            try {
              const searchResponse = await callSunskyAPI('searchProducts', {
                keyword: modelNumber,
                page: 1,
                pageSize: 10,
                apiId: apiKey.id
              }, apiKey)

              if (searchResponse?.result === 'success' && searchResponse.data?.products?.length > 0) {
                const normalizedSearch = modelNumber.trim().toLowerCase().replace(/[-_\s]/g, '')
                
                for (const product of searchResponse.data.products) {
                  const normalizedItem = (product.itemNo || '').trim().toLowerCase().replace(/[-_\s]/g, '')
                  const normalizedName = (product.name || '').trim().toLowerCase().replace(/[-_\s]/g, '')
                  
                  if (normalizedItem === normalizedSearch || 
                      normalizedName.includes(normalizedSearch) ||
                      normalizedSearch.includes(normalizedItem)) {
                    
                    const detailResponse = await callSunskyAPI('getProductDetails', {
                      itemNo: product.itemNo,
                      apiId: apiKey.id
                    }, apiKey)

                    if (detailResponse?.result === 'success' && detailResponse.data) {
                      productToImport = detailResponse.data
                      break
                    }
                  }
                }
              }
            } catch (error) {
              console.log(`Search failed for ${modelNumber}:`, error)
            }
          }
          
          if (productToImport) {
            // Import SKU
            const { error } = await supabaseClient
              .from('sunsky_skus')
              .upsert({
                user_id: userId,
                sku_code: productToImport.itemNo,
                title: productToImport.name || '',
                cost: productToImport.convertedPrice || parseFloat(productToImport.price || '0') || 0,
                weight: productToImport.unitWeight ? parseFloat(productToImport.unitWeight) : 0,
                currency: productToImport.convertedCurrency || 'USD',
                country: userCountry, // Use user's actual country
                product_data: productToImport
              }, {
                onConflict: 'user_id,sku_code',
                ignoreDuplicates: false
              })

            if (!error) {
              chunkSuccess++
              
              // Update PO orders
              await supabaseClient
                .from('po_orders')
                .update({
                  sku_code: productToImport.itemNo,
                  title: productToImport.name || '',
                  unit_cost: productToImport.convertedPrice || parseFloat(productToImport.price || '0') || 0,
                  external_id: productToImport.itemNo,
                  external_id_type: 'sunsky'
                })
                .eq('user_id', userId)
                .eq('model_number', modelNumber)
            } else {
              chunkErrors++
              console.error(`Failed to upsert SKU ${productToImport.itemNo}:`, error)
            }
          } else {
            // No product found
            chunkErrors++
            console.log(`No product found for model: ${modelNumber}`)
          }

          totalProcessed++
          
          // Update job progress every 10 items
          if (totalProcessed % 10 === 0) {
            await supabaseClient
              .from('sunsky_import_jobs')
              .update({
                processed_items: totalProcessed,
                success_count: totalSuccess + chunkSuccess,
                error_count: totalErrors + chunkErrors
              })
              .eq('id', jobId)
          }

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (error) {
          console.error(`Error processing ${modelNumber}:`, error.message || error)
          // Log the specific error to help with debugging
          if (error.message?.includes('NO_PERMISSION_DUE_TO_SIGNATURE')) {
            console.error(`Signature error for ${modelNumber} - API authentication failed`)
          } else if (error.message?.includes('HTTP error')) {
            console.error(`HTTP error for ${modelNumber} - API request failed`)
          } else {
            console.error(`Unknown error for ${modelNumber}:`, error)
          }
          chunkErrors++
          totalProcessed++
        }
      }

      return { chunkSuccess, chunkErrors }
    }

    // Run all chunks in parallel
    const results = await Promise.all(chunks.map(processChunk))
    
    // Calculate final totals
    totalSuccess = results.reduce((sum, r) => sum + r.chunkSuccess, 0)
    totalErrors = results.reduce((sum, r) => sum + r.chunkErrors, 0)

    // Complete the import job
    await supabaseClient
      .from('sunsky_import_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: totalProcessed,
        success_count: totalSuccess,
        error_count: totalErrors
      })
      .eq('id', jobId)

    console.log(`Background processing completed for job ${jobId}: ${totalSuccess} success, ${totalErrors} errors`)

  } catch (error) {
    console.error(`Background processing failed for job ${jobId}:`, error)
    
    // Mark job as failed
    await supabaseClient
      .from('sunsky_import_jobs')
      .update({
        status: 'error',
        completed_at: new Date().toISOString(),
        last_error: error.message
      })
      .eq('id', jobId)
  }
}

async function callSunskyAPI(action: string, data: any, credentials: SunskyCredential) {
  const crypto = await import('node:crypto')
  
  // Remove apiId from data as it's not needed for the actual API call
  const { apiId, ...apiData } = data
  
  let params: Record<string, any> = {
    ...apiData,
    lang: 'en'
  }

  // Generate signature using the exact same logic as the working sunsky-api function
  const generateSignature = async (params: Record<string, any>, key: string, secret: string): Promise<string> => {
    // Filter out empty values and signature/sign fields
    const filteredParams: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '' && k !== 'signature' && k !== 'sign') {
        filteredParams[k] = String(v);
      }
    });
    
    // Add key to parameters
    filteredParams.key = key;
    
    // Sort by parameter names using ASCII comparison
    const sortedEntries = Object.entries(filteredParams).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    
    // Create value string by concatenating sorted values
    const valueString = sortedEntries.map(([_, value]) => value).join('');
    
    // Append '@' and secret
    const stringToHash = valueString + '@' + secret;
    
    console.log('Parameters for signature (sorted):', Object.fromEntries(sortedEntries.map(([k, v]) => [k, k === 'key' ? key.substring(0, 4) + '***' : v])));
    console.log('Value string (masked):', valueString.replace(key, key.substring(0, 4) + '***'));
    console.log('String to hash (masked):', valueString.replace(key, key.substring(0, 4) + '***') + '@***');
    
    // Generate signature using lowercase MD5
    const signature = crypto.createHash('md5').update(stringToHash).digest('hex');
    console.log('Generated signature:', signature);
    
    return signature;
  }

  let url = ''
  let requestBody = new URLSearchParams()

  if (action === 'searchProducts') {
    url = 'https://open.sunsky-online.com/openapi/product!search.do'
    const searchParams = {
      keyword: params.keyword,
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
      status: '1',
      lang: 'en'
    }
    
    const signature = await generateSignature(searchParams, credentials.api_key, credentials.api_secret)
    
    requestBody.append('key', credentials.api_key)
    requestBody.append('lang', 'en')
    requestBody.append('keyword', searchParams.keyword)
    requestBody.append('page', searchParams.page)
    requestBody.append('pageSize', searchParams.pageSize)
    requestBody.append('status', searchParams.status)
    requestBody.append('signature', signature)
    
  } else if (action === 'getProductDetails') {
    url = 'https://open.sunsky-online.com/openapi/product!detail.do'
    const detailParams = {
      itemNo: params.itemNo,
      lang: 'en'
    }
    
    const signature = await generateSignature(detailParams, credentials.api_key, credentials.api_secret)
    
    requestBody.append('key', credentials.api_key)
    requestBody.append('lang', 'en')
    requestBody.append('itemNo', detailParams.itemNo)
    requestBody.append('signature', signature)
  }

  console.log(`Making request to: ${url}`)

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  let result = await response.json()
  
  // If we get signature error, retry with uppercase MD5 and 'sign' parameter (same retry logic as main function)
  if (result.result === 'error' && result.messages?.[0] === 'NO_PERMISSION_DUE_TO_SIGNATURE') {
    console.log('Retrying with uppercase MD5 and "sign" parameter...')
    
    let retryParams: Record<string, any>
    let retryBody = new URLSearchParams()
    
    if (action === 'searchProducts') {
      retryParams = {
        keyword: params.keyword,
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
        status: '1',
        lang: 'en'
      }
      
      const upperSignature = (await generateSignature(retryParams, credentials.api_key, credentials.api_secret)).toUpperCase()
      
      retryBody.append('key', credentials.api_key)
      retryBody.append('lang', 'en')
      retryBody.append('keyword', retryParams.keyword)
      retryBody.append('page', retryParams.page)
      retryBody.append('pageSize', retryParams.pageSize)
      retryBody.append('status', retryParams.status)
      retryBody.append('sign', upperSignature)
      
    } else if (action === 'getProductDetails') {
      retryParams = {
        itemNo: params.itemNo,
        lang: 'en'
      }
      
      const upperSignature = (await generateSignature(retryParams, credentials.api_key, credentials.api_secret)).toUpperCase()
      
      retryBody.append('key', credentials.api_key)
      retryBody.append('lang', 'en')
      retryBody.append('itemNo', retryParams.itemNo)
      retryBody.append('sign', upperSignature)
    }

    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: retryBody
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    result = await response.json()
  }
  
  if (result.result === 'error') {
    throw new Error(result.messages?.[0] || 'Sunsky API error')
  }

  return result
}