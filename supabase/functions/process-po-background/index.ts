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
      EdgeRuntime.waitUntil(processJobInBatches(supabaseClient, user.id, jobId, modelData))
      
      return new Response(
        JSON.stringify({ success: true, message: 'Background processing started', jobId }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'resume') {
      console.log(`Resuming background PO processing for job ${jobId}`)
      
      // Resume processing from where it left off
      EdgeRuntime.waitUntil(processJobInBatches(supabaseClient, user.id, jobId))
      
      return new Response(
        JSON.stringify({ success: true, message: 'Background processing resumed', jobId }),
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

// Handle graceful shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown due to:', ev.detail?.reason)
})

async function processJobInBatches(supabaseClient: any, userId: string, jobId: string, modelData?: any) {
  const BATCH_SIZE = 50
  const MAX_RETRIES = 3
  
  try {
    console.log(`Processing job ${jobId} in batches`)

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

    const userCountry = userProfile.country || 'UAE'

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

    console.log(`Found ${activeKeys.length} active API keys`)

    // If this is a new job with model data, create job items
    if (modelData) {
      console.log(`Creating ${modelData.uniqueModels.length} job items`)
      
      const jobItems = modelData.uniqueModels.map(modelNumber => ({
        job_id: jobId,
        user_id: userId,
        model_number: modelNumber,
        status: 'pending'
      }))

      const { error: itemsError } = await supabaseClient
        .from('po_job_items')
        .insert(jobItems)

      if (itemsError) {
        console.error('Failed to create job items:', itemsError)
        throw new Error('Failed to create job items')
      }

      // Update job with total items
      await supabaseClient
        .from('sunsky_import_jobs')
        .update({
          total_items: modelData.uniqueModels.length,
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    // Process items in batches
    let currentApiKeyIndex = 0
    
    while (true) {
      // Get next batch of pending items
      const { data: pendingItems, error: itemsError } = await supabaseClient
        .from('po_job_items')
        .select('*')
        .eq('job_id', jobId)
        .eq('status', 'pending')
        .limit(BATCH_SIZE)

      if (itemsError) {
        console.error('Failed to fetch pending items:', itemsError)
        break
      }

      if (!pendingItems || pendingItems.length === 0) {
        console.log('No more pending items, job completed')
        break
      }

      console.log(`Processing batch of ${pendingItems.length} items`)

      // Process each item in the batch
      for (const item of pendingItems) {
        try {
          // Mark item as processing
          await supabaseClient
            .from('po_job_items')
            .update({ 
              status: 'processing',
              attempts: item.attempts + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)

          // Use round-robin API key selection
          const apiKey = activeKeys[currentApiKeyIndex % activeKeys.length]
          currentApiKeyIndex++

          let productToImport = null

          // Try direct lookup first with timeout and retry
          if (item.model_number.match(/^[A-Z0-9]{6,}$/i)) {
            try {
              productToImport = await callSunskyAPIWithRetry('getProductDetails', {
                itemNo: item.model_number,
                apiId: apiKey.id
              }, apiKey, MAX_RETRIES)
            } catch (error) {
              console.log(`Direct lookup failed for ${item.model_number}:`, error.message)
            }
          }

          // Try search if no direct match
          if (!productToImport) {
            try {
              const searchResponse = await callSunskyAPIWithRetry('searchProducts', {
                keyword: item.model_number,
                page: 1,
                pageSize: 10,
                apiId: apiKey.id
              }, apiKey, MAX_RETRIES)

              if (searchResponse?.data?.products?.length > 0) {
                const normalizedSearch = item.model_number.trim().toLowerCase().replace(/[-_\s]/g, '')
                
                for (const product of searchResponse.data.products) {
                  const normalizedItem = (product.itemNo || '').trim().toLowerCase().replace(/[-_\s]/g, '')
                  const normalizedName = (product.name || '').trim().toLowerCase().replace(/[-_\s]/g, '')
                  
                  if (normalizedItem === normalizedSearch || 
                      normalizedName.includes(normalizedSearch) ||
                      normalizedSearch.includes(normalizedItem)) {
                    
                    const detailResponse = await callSunskyAPIWithRetry('getProductDetails', {
                      itemNo: product.itemNo,
                      apiId: apiKey.id
                    }, apiKey, MAX_RETRIES)

                    if (detailResponse?.data) {
                      productToImport = detailResponse.data
                      break
                    }
                  }
                }
              }
            } catch (error) {
              console.log(`Search failed for ${item.model_number}:`, error.message)
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
                country: userCountry,
                product_data: productToImport
              }, {
                onConflict: 'user_id,sku_code',
                ignoreDuplicates: false
              })

            if (!error) {
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
                .eq('model_number', item.model_number)

              // Mark item as completed
              await supabaseClient
                .from('po_job_items')
                .update({
                  status: 'completed',
                  sku_code: productToImport.itemNo,
                  product_data: productToImport,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.id)

              console.log(`Successfully processed: ${item.model_number} -> ${productToImport.itemNo}`)
            } else {
              throw new Error(`Failed to upsert SKU: ${error.message}`)
            }
          } else {
            // No product found
            console.log(`No product found for model: ${item.model_number}`)
            
            // Mark item as error if max retries reached
            if (item.attempts >= MAX_RETRIES) {
              await supabaseClient
                .from('po_job_items')
                .update({
                  status: 'error',
                  error_message: 'Product not found after maximum retries',
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.id)
            } else {
              // Reset to pending for retry
              await supabaseClient
                .from('po_job_items')
                .update({
                  status: 'pending',
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.id)
            }
          }

        } catch (error) {
          console.error(`Error processing ${item.model_number}:`, error.message)
          
          // Mark item as error if max retries reached
          if (item.attempts >= MAX_RETRIES) {
            await supabaseClient
              .from('po_job_items')
              .update({
                status: 'error',
                error_message: error.message,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
          } else {
            // Reset to pending for retry
            await supabaseClient
              .from('po_job_items')
              .update({
                status: 'pending',
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
          }
        }

        // Small delay between items
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Update job progress after each batch
      await updateJobProgress(supabaseClient, jobId)
      
      // Check if we should continue processing
      const { data: jobStatus } = await supabaseClient
        .from('sunsky_import_jobs')
        .select('status')
        .eq('id', jobId)
        .single()

      if (jobStatus?.status === 'cancelled') {
        console.log('Job was cancelled, stopping processing')
        break
      }
    }

    // Final job completion
    await completeJob(supabaseClient, jobId)
    console.log(`Job ${jobId} completed successfully`)

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error.message)
    
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

async function updateJobProgress(supabaseClient: any, jobId: string) {
  const { data: stats } = await supabaseClient
    .rpc('get_job_item_stats', { job_id_param: jobId })

  if (stats && stats.length > 0) {
    const { total, completed, errors, pending } = stats[0]
    
    await supabaseClient
      .from('sunsky_import_jobs')
      .update({
        processed_items: completed + errors,
        success_count: completed,
        error_count: errors,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
  }
}

async function completeJob(supabaseClient: any, jobId: string) {
  const { data: stats } = await supabaseClient
    .rpc('get_job_item_stats', { job_id_param: jobId })

  if (stats && stats.length > 0) {
    const { completed, errors } = stats[0]
    
    await supabaseClient
      .from('sunsky_import_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_items: completed + errors,
        success_count: completed,
        error_count: errors
      })
      .eq('id', jobId)
  }
}

async function callSunskyAPIWithRetry(action: string, data: any, credentials: SunskyCredential, maxRetries: number = 3) {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await callSunskyAPIWithTimeout(action, data, credentials, 15000) // 15 second timeout
      
      if (action === 'getProductDetails' && result?.data) {
        return result.data
      } else if (action === 'searchProducts' && result?.data) {
        return result
      } else {
        throw new Error('Invalid API response')
      }
    } catch (error) {
      lastError = error
      console.log(`API call attempt ${attempt}/${maxRetries} failed:`, error.message)
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}

async function callSunskyAPIWithTimeout(action: string, data: any, credentials: SunskyCredential, timeout: number = 15000) {
  const crypto = await import('node:crypto')
  
  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
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
      
      // Generate signature using lowercase MD5
      const signature = crypto.createHash('md5').update(stringToHash).digest('hex');
      
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody,
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    
    // If we get signature error, retry with uppercase MD5 and 'sign' parameter
    if (result.result === 'error' && result.messages?.[0] === 'NO_PERMISSION_DUE_TO_SIGNATURE') {
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

      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: retryBody,
        signal: controller.signal
      })

      if (!retryResponse.ok) {
        throw new Error(`HTTP retry error! status: ${retryResponse.status}`)
      }

      const retryResult = await retryResponse.json()
      
      if (retryResult.result === 'error') {
        throw new Error(retryResult.messages?.[0] || 'Sunsky API error')
      }

      return retryResult
    }
    
    if (result.result === 'error') {
      throw new Error(result.messages?.[0] || 'Sunsky API error')
    }

    return result
  } finally {
    clearTimeout(timeoutId)
  }
}