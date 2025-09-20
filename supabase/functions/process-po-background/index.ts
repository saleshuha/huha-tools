import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, user-agent',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Create service role client for admin operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create user-authenticated client for RLS-protected operations
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!anonKey) {
      console.error('SUPABASE_ANON_KEY not available, falling back to service role')
    }
    
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      anonKey ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Set the user's session on the client using the JWT token
    await userClient.auth.setSession({
      access_token: authHeader,
      refresh_token: '' // Not needed for this operation
    })

    // Get user from token using service client
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(authHeader)
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    const body = await req.json()
    const { action } = body

    if (action === 'start') {
      const { jobId, modelData } = body
      console.log(`Starting background PO processing for user ${user.id}`)
      
      // Start background processing without waiting
      EdgeRuntime.waitUntil(processModelNumbersBackground(userClient, user.id, jobId, modelData))
      
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
      console.log('Received config:', JSON.stringify(config, null, 2))
      console.log('Received availableAPIs:', JSON.stringify(availableAPIs, null, 2))
      
      // Create both background task and export history records
      const taskId = crypto.randomUUID()
      const historyId = crypto.randomUUID()
      
      // Insert background task for tracking
      const { error: taskError } = await serviceClient
        .from('background_tasks')
        .insert({
          id: taskId,
          user_id: user.id,
          type: 'sunsky_export',
          status: 'queued',
          progress: 0,
          processed_items: 0,
          metadata: {
            ...config,
            selectedAPIs: availableAPIs,
            exportType: 'background',
            persistent: true,
            historyId: historyId
          }
        })
      
      if (taskError) {
        console.error('Failed to create background task:', taskError)
        throw new Error(`Failed to create background task: ${taskError.message}`)
      }
      
      // Insert export history for long-term tracking
      const { error: historyError } = await serviceClient
        .from('export_history')
        .insert({
          id: historyId,
          user_id: user.id,
          background_task_id: taskId,
          export_type: 'sunsky_status_export',
          filters: config,
          status: 'queued',
          metadata: {
            selectedAPIs: availableAPIs,
            concurrent: true,
            background: true
          }
        })
      
      if (historyError) {
        console.error('Failed to create export history:', historyError)
        throw new Error(`Failed to create export history: ${historyError.message}`)
      }
      
      // Start background export without waiting
      EdgeRuntime.waitUntil(processSunskyExportBackground(userClient, user.id, taskId, historyId, config, availableAPIs))
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Background export started', 
          taskId: taskId,
          historyId: historyId 
        }),
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

    // Get all active API keys using the secure RPC (no parameters needed)
    const { data: activeKeys, error: keysError } = await supabaseClient
      .rpc('get_user_sunsky_credentials_secure')

    if (keysError || !activeKeys || activeKeys.length === 0) {
      console.error('Failed to get credentials:', keysError)
      throw new Error("No active API keys found")
    }

    // Filter only active credentials
    const activeCredentials = activeKeys.filter((key: any) => key.is_active)
    
    if (activeCredentials.length === 0) {
      console.error('No active credentials found after filtering')
      throw new Error("No active API keys found")
    }

    console.log(`Found ${activeCredentials.length} active API keys for parallel processing`)

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
    const chunkSize = Math.ceil(uniqueModelNumbers.length / activeCredentials.length)
    const chunks = []
    
    for (let i = 0; i < activeCredentials.length; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, uniqueModelNumbers.length)
      if (start < uniqueModelNumbers.length) {
        chunks.push({
          apiKey: activeCredentials[i],
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
async function processSunskyExportBackground(supabaseClient: any, userId: string, taskId: string, historyId: string, config: any, availableAPIs: any[]) {
  try {
    console.log(`Background export started for task ${taskId}`)
    
    // Update status to processing
    await Promise.all([
      supabaseClient
        .from('background_tasks')
        .update({ status: 'processing' })
        .eq('id', taskId),
      supabaseClient
        .from('export_history')
        .update({ status: 'processing' })
        .eq('id', historyId)
    ])

    // Get user's country from profile
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('country')
      .eq('id', userId)
      .single()

    const userCountry = userProfile?.country || 'UAE'

    // Get full API credentials from database - only for selected APIs
    const selectedApiIds = availableAPIs.map(api => api.id)
    console.log(`Fetching credentials for selected APIs: ${selectedApiIds.join(', ')}`)
    
    const { data: fullCredentials, error: credError } = await supabaseClient
      .from('sunsky_credentials')
      .select('id, api_key, api_secret, name')
      .eq('user_id', userId)
      .in('id', selectedApiIds)
      .eq('is_active', true)

    if (credError || !fullCredentials || fullCredentials.length === 0) {
      throw new Error('Failed to get API credentials: ' + (credError?.message || 'No credentials found'))
    }

    console.log(`Found ${fullCredentials.length} API credentials for background export`)
    console.log(`Using APIs: ${fullCredentials.map(c => c.name || c.id.substring(0, 8)).join(', ')}`)

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

    // Update total items estimate in both tables
    const estimatedItems = totalPages * config.exportPageSize
    await Promise.all([
      supabaseClient
        .from('background_tasks')
        .update({ total_items: estimatedItems })
        .eq('id', taskId),
      supabaseClient
        .from('export_history')
        .update({ total_items: estimatedItems })
        .eq('id', historyId)
    ])

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
              
              // Update progress every page in both tables
              const progress = totalPages > 0 ? Math.min(95, (totalProcessed / totalPages) * 100) : 0
              
              await Promise.all([
                supabaseClient
                  .from('background_tasks')
                  .update({
                    progress: Math.round(progress),
                    processed_items: allProducts.length
                  })
                  .eq('id', taskId),
                supabaseClient
                  .from('export_history')
                  .update({
                    total_items: allProducts.length,
                    metadata: {
                      ...config,
                      availableAPIs,
                      concurrent: true,
                      background: true,
                      progress: Math.round(progress),
                      processed_pages: totalProcessed,
                      total_pages: totalPages
                    }
                  })
                  .eq('id', historyId)
              ])

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

    // Create and upload export file
    let filePath = null
    let fileSize = 0
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

        // Upload to user's folder in exports bucket
        const fileName = `${userId}/export-${taskId}-${Date.now()}.csv`
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('exports')
          .upload(fileName, csvContent, {
            contentType: 'text/csv'
          })

        if (!uploadError && uploadData) {
          filePath = uploadData.path
          fileSize = new Blob([csvContent]).size
        } else {
          console.error('Upload error:', uploadError)
        }
      } catch (error) {
        console.error('Error creating export file:', error)
      }
    }

    // Mark both records as completed
    await Promise.all([
      supabaseClient
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
            filePath
          }
        })
        .eq('id', taskId),
      supabaseClient
        .from('export_history')
        .update({
          status: 'completed',
          total_items: allProducts.length,
          file_path: filePath,
          file_size: fileSize,
          metadata: {
            ...config,
            availableAPIs,
            concurrent: true,
            background: true,
            totalProducts: allProducts.length,
            completed: true
          }
        })
        .eq('id', historyId)
    ])

    console.log(`Background export completed for task ${taskId}: ${allProducts.length} products`)

  } catch (error) {
    console.error(`Background export failed for task ${taskId}:`, error)
    
    // Mark both records as failed
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    await Promise.all([
      supabaseClient
        .from('background_tasks')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          metadata: {
            error: errorMessage
          }
        })
        .eq('id', taskId),
      supabaseClient
        .from('export_history')
        .update({
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', historyId)
    ])
  }
}