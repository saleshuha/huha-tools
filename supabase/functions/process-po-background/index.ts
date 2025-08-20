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
                country: 'UAE', // Default country
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
            }
          } else {
            // No product found
            chunkErrors++
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
          console.error(`Error processing ${modelNumber}:`, error)
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
  
  const timestamp = Math.floor(Date.now() / 1000)
  
  let params: Record<string, any> = {
    key: credentials.api_key,
    lang: 'en',
    ...data
  }

  // Remove apiId from params as it's not needed for the actual API call
  delete params.apiId

  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result: Record<string, any>, key) => {
      result[key] = params[key]
      return result
    }, {})

  const valueString = Object.values(sortedParams).join('')
  const stringToHash = `${valueString}@${credentials.api_secret}`
  
  const signature = crypto.createHash('md5').update(stringToHash).digest('hex')

  let url = ''
  let body = new URLSearchParams()

  if (action === 'searchProducts') {
    url = 'https://open.sunsky-online.com/openapi/product!search.do'
    body.append('key', credentials.api_key)
    body.append('lang', 'en')
    body.append('keyword', data.keyword)
    body.append('page', data.page.toString())
    body.append('pageSize', data.pageSize.toString())
    body.append('status', '1')
    body.append('sign', signature)
  } else if (action === 'getProductDetails') {
    url = 'https://open.sunsky-online.com/openapi/product!detail.do'
    body.append('key', credentials.api_key)
    body.append('lang', 'en')
    body.append('itemNo', data.itemNo)
    body.append('sign', signature)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  
  if (result.result === 'error') {
    throw new Error(result.messages?.[0] || 'Sunsky API error')
  }

  return result
}