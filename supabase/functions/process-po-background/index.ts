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

    const body = await req.json()
    const { action } = body

    if (action === 'start') {
      const { jobId, modelData } = body
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

    if (action === 'startExport') {
      const { config, availableAPIs } = body
      console.log(`Starting background export for user ${user.id}`)
      
      // Create a background task record
      const taskId = crypto.randomUUID()
      
      // Insert task into database for persistence
      await supabaseClient
        .from('background_tasks')
        .insert({
          id: taskId,
          user_id: user.id,
          type: 'sunsky_export',
          status: 'processing',
          progress: 0,
          processed_items: 0,
          metadata: {
            ...config,
            availableAPIs,
            exportType: 'background',
            persistent: true
          },
          created_at: new Date().toISOString()
        })
      
      // Start background export without waiting
      EdgeRuntime.waitUntil(processSunskyExportBackground(supabaseClient, user.id, taskId, config, availableAPIs))
      
      return new Response(
        JSON.stringify({ success: true, message: 'Background export started', taskId }),
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
  
  // Validate credentials first
  if (!credentials) {
    throw new Error('No credentials provided')
  }
  
  if (!credentials.api_key || !credentials.api_secret) {
    console.error('Invalid credentials structure:', {
      hasApiKey: !!credentials.api_key,
      hasApiSecret: !!credentials.api_secret,
      credentialsKeys: Object.keys(credentials)
    })
    throw new Error(`Invalid credentials: api_key=${credentials.api_key ? 'present' : 'missing'}, api_secret=${credentials.api_secret ? 'present' : 'missing'}`)
  }
  
  console.log(`Using specific Sunsky credentials for API ID: ${credentials.id}`)
  
  // Remove apiId from data as it's not needed for the actual API call
  const { apiId, ...apiData } = data
  
  let params: Record<string, any> = {
    ...apiData,
    lang: 'en'
  }

  // Generate signature using the exact same logic as the working sunsky-api function
  const generateSignature = async (params: Record<string, any>, key: string, secret: string): Promise<string> => {
    // Validate key and secret
    if (!key || !secret) {
      throw new Error(`Invalid credentials: key=${key ? 'present' : 'missing'}, secret=${secret ? 'present' : 'missing'}`);
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
    
    // Sort by parameter names using ASCII comparison
    const sortedEntries = Object.entries(filteredParams).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    
    // Create value string by concatenating sorted values
    const valueString = sortedEntries.map(([_, value]) => value).join('');
    
    // Append '@' and secret
    const stringToHash = valueString + '@' + secret;
    
    const maskedKey = key && key.length >= 4 ? key.substring(0, 4) + '***' : '***';
    console.log('Parameters for signature (sorted):', Object.fromEntries(sortedEntries.map(([k, v]) => [k, k === 'key' ? maskedKey : v])));
    console.log('Value string (masked):', valueString.replace(key, maskedKey));
    console.log('String to hash (masked):', valueString.replace(key, maskedKey) + '@***');
    
    // Generate signature using lowercase MD5
    const signature = crypto.createHash('md5').update(stringToHash).digest('hex');
    console.log('Generated signature:', signature);
    
    return signature;
  }

  let url = ''
  let requestBody = new URLSearchParams()

  if (action === 'searchProducts') {
    url = 'https://open.sunsky-online.com/openapi/product!search.do'
    const searchParams: Record<string, any> = {
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
      status: params.status ? params.status.toString() : '1',
      lang: 'en'
    }
    
    // Add optional search parameters
    if (params.keyword) searchParams.keyword = params.keyword
    if (params.categoryId) searchParams.categoryId = params.categoryId.toString()
    if (params.brandId) searchParams.brandId = params.brandId.toString()
    if (params.dateFrom) searchParams.dateFrom = params.dateFrom
    if (params.dateTo) searchParams.dateTo = params.dateTo
    
    const signature = await generateSignature(searchParams, credentials.api_key, credentials.api_secret)
    
    requestBody.append('key', credentials.api_key)
    requestBody.append('lang', 'en')
    requestBody.append('page', searchParams.page)
    requestBody.append('pageSize', searchParams.pageSize)
    requestBody.append('status', searchParams.status)
    if (params.keyword) requestBody.append('keyword', params.keyword)
    if (params.categoryId) requestBody.append('categoryId', params.categoryId.toString())
    if (params.brandId) requestBody.append('brandId', params.brandId.toString())
    if (params.dateFrom) requestBody.append('dateFrom', params.dateFrom)
    if (params.dateTo) requestBody.append('dateTo', params.dateTo)
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
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
        status: params.status ? params.status.toString() : '1',
        lang: 'en'
      }
      
      // Add optional search parameters
      if (params.keyword) retryParams.keyword = params.keyword
      if (params.categoryId) retryParams.categoryId = params.categoryId.toString()
      if (params.brandId) retryParams.brandId = params.brandId.toString()
      if (params.dateFrom) retryParams.dateFrom = params.dateFrom
      if (params.dateTo) retryParams.dateTo = params.dateTo
      
      const upperSignature = (await generateSignature(retryParams, credentials.api_key, credentials.api_secret)).toUpperCase()
      
      retryBody.append('key', credentials.api_key)
      retryBody.append('lang', 'en')
      retryBody.append('page', retryParams.page)
      retryBody.append('pageSize', retryParams.pageSize)
      retryBody.append('status', retryParams.status)
      if (params.keyword) retryBody.append('keyword', params.keyword)
      if (params.categoryId) retryBody.append('categoryId', params.categoryId.toString())
      if (params.brandId) retryBody.append('brandId', params.brandId.toString())
      if (params.dateFrom) retryBody.append('dateFrom', params.dateFrom)
      if (params.dateTo) retryBody.append('dateTo', params.dateTo)
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

// Background export processing function
async function processSunskyExportBackground(supabaseClient: any, userId: string, taskId: string, config: any, availableAPIs: any[]) {
  try {
    console.log(`Background export started for task ${taskId}`)

    // Get user's country from profile
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('country')
      .eq('id', userId)
      .single()

    const userCountry = userProfile?.country || 'UAE'

    // Get full API credentials from database (availableAPIs only has id and name)
    const apiIds = availableAPIs.map(api => api.id)
    const { data: fullCredentials, error: credError } = await supabaseClient
      .from('sunsky_credentials')
      .select('id, api_key, api_secret')
      .eq('user_id', userId)
      .in('id', apiIds)
      .eq('is_active', true)

    if (credError || !fullCredentials || fullCredentials.length === 0) {
      throw new Error('Failed to get API credentials: ' + (credError?.message || 'No credentials found'))
    }

    console.log(`Found ${fullCredentials.length} API credentials for background export`)

    let allProducts: any[] = []
    let totalProcessed = 0
    let totalPages = 0

    // Calculate total pages across all APIs
    for (const creds of fullCredentials) {
      try {
        // Get first page to determine total
        const response = await callSunskyAPI('searchProducts', {
          categoryId: config.categoryId,
          status: config.selectedExportStatus,
          page: 1,
          pageSize: config.exportPageSize,
          apiId: creds.id
        }, creds)

        if (response?.result === 'success' && response.data?.totalPages) {
          totalPages += response.data.totalPages
        }
      } catch (error) {
        console.error(`Error getting page count for API ${creds.id}:`, error)
      }
    }

    // Process each API
    for (const creds of fullCredentials) {
      try {
        let currentPage = 1
        let hasMorePages = true

        while (hasMorePages) {
          try {
            const response = await callSunskyAPI('searchProducts', {
              categoryId: config.categoryId,
              status: config.selectedExportStatus,
              page: currentPage,
              pageSize: config.exportPageSize,
              apiId: creds.id
            }, creds)

            if (response?.result === 'success' && response.data?.products) {
              const products = response.data.products

              // Process each product
              for (const product of products) {
                try {
                  // Import to database
                  await supabaseClient
                    .from('sunsky_skus')
                    .upsert({
                      user_id: userId,
                      sku_code: product.itemNo,
                      title: product.name || '',
                      cost: product.convertedPrice || parseFloat(product.price || '0') || 0,
                      weight: product.unitWeight ? parseFloat(product.unitWeight) : 0,
                      currency: product.convertedCurrency || 'USD',
                      country: userCountry,
                      product_data: product
                    }, {
                      onConflict: 'user_id,sku_code',
                      ignoreDuplicates: false
                    })

                  allProducts.push(product)
                } catch (error) {
                  console.error(`Error importing product ${product.itemNo}:`, error)
                }
              }

              totalProcessed++
              
              // Update progress every page
              const progress = totalPages > 0 ? Math.min(95, (totalProcessed / totalPages) * 100) : 0
              
              await supabaseClient
                .from('background_tasks')
                .update({
                  progress,
                  processed_items: allProducts.length,
                  updated_at: new Date().toISOString()
                })
                .eq('id', taskId)

              hasMorePages = currentPage < (response.data.totalPages || 1)
              currentPage++

              // Small delay to avoid overwhelming the API
              await new Promise(resolve => setTimeout(resolve, 200))

            } else {
              hasMorePages = false
            }
          } catch (error) {
            console.error(`Error processing page ${currentPage} for API ${creds.id}:`, error)
            hasMorePages = false
          }
        }
      } catch (error) {
        console.error(`Error processing API ${creds.id}:`, error)
      }
    }

    // Export to storage (if needed) and complete task
    let downloadUrl = null
    if (allProducts.length > 0) {
      try {
        // Create CSV content
        const headers = config.selectedExportColumns || ['itemNo', 'name', 'price', 'convertedPrice']
        const csvContent = [
          headers.join(','),
          ...allProducts.map(product => 
            headers.map(header => {
              let value = product[header] || ''
              if (typeof value === 'string' && value.includes(',')) {
                value = `"${value}"`
              }
              return value
            }).join(',')
          )
        ].join('\n')

        // Upload to Supabase storage
        const fileName = `export-${taskId}-${Date.now()}.csv`
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('exports')
          .upload(fileName, csvContent, {
            contentType: 'text/csv'
          })

        if (!uploadError && uploadData) {
          const { data: urlData } = await supabaseClient.storage
            .from('exports')
            .createSignedUrl(uploadData.path, 3600) // 1 hour expiry

          downloadUrl = urlData?.signedUrl
        }
      } catch (error) {
        console.error('Error creating export file:', error)
      }
    }

    // Mark task as completed
    await supabaseClient
      .from('background_tasks')
      .update({
        status: 'completed',
        progress: 100,
        processed_items: allProducts.length,
        completed_at: new Date().toISOString(),
        metadata: {
          ...config,
          availableAPIs,
          exportType: 'background',
          persistent: true,
          totalProducts: allProducts.length,
          downloadUrl
        }
      })
      .eq('id', taskId)

    console.log(`Background export completed for task ${taskId}: ${allProducts.length} products`)

  } catch (error) {
    console.error(`Background export failed for task ${taskId}:`, error)
    
    // Mark task as failed
    await supabaseClient
      .from('background_tasks')
      .update({
        status: 'error',
        completed_at: new Date().toISOString(),
        metadata: {
          error: error.message
        }
      })
      .eq('id', taskId)
  }
}