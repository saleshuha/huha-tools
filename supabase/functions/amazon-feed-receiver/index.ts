import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  console.log(`Amazon Feed Receiver - ${req.method} ${req.url}`)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get JWT token and validate user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url)
    const integrationId = url.searchParams.get('integration_id')
    const feedType = url.searchParams.get('feed_type') || 'acknowledgment'

    if (!integrationId) {
      console.error('Missing integration_id parameter')
      return new Response(
        JSON.stringify({ error: 'Missing integration_id parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Processing feed for integration: ${integrationId}, type: ${feedType}`)

    // Verify the integration exists and belongs to the authenticated user
    const { data: integration, error: integrationError } = await supabase
      .from('vendor_integrations')
      .select('id, user_id, vendor_name, country')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single()

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let feedContent = ''
    let contentType = req.headers.get('content-type') || ''

    // Handle different content types
    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      feedContent = await req.text()
    } else if (contentType.includes('application/json')) {
      const jsonData = await req.json()
      feedContent = JSON.stringify(jsonData, null, 2)
    } else {
      feedContent = await req.text()
    }

    console.log(`Received feed content length: ${feedContent.length}`)

    // Parse the feed to extract relevant information
    let parsedData: any = {}
    let totalItems = 0
    let status = 'received'

    try {
      if (feedType === 'acknowledgment' && feedContent.includes('<')) {
        // Parse XML acknowledgment feed
        const orderMatches = feedContent.match(/<Order[^>]*>/g) || []
        const itemMatches = feedContent.match(/<Item[^>]*>/g) || []
        totalItems = Math.max(orderMatches.length, itemMatches.length)
        
        // Extract status information
        if (feedContent.includes('Accepted')) {
          status = 'acknowledged'
        } else if (feedContent.includes('Rejected') || feedContent.includes('Error')) {
          status = 'failed'
        }

        parsedData = {
          feed_type: 'acknowledgment',
          orders_processed: orderMatches.length,
          items_processed: itemMatches.length,
          timestamp: new Date().toISOString()
        }
      } else if (feedType === 'order' && feedContent.includes('<')) {
        // Parse XML order feed
        const orderMatches = feedContent.match(/<PurchaseOrder[^>]*>/g) || []
        totalItems = orderMatches.length
        
        parsedData = {
          feed_type: 'order',
          purchase_orders: orderMatches.length,
          timestamp: new Date().toISOString()
        }
      } else if (contentType.includes('application/json')) {
        // Handle JSON feeds
        parsedData = JSON.parse(feedContent)
        totalItems = parsedData.items?.length || parsedData.orders?.length || 1
      }
    } catch (parseError) {
      console.warn('Failed to parse feed content:', parseError)
      parsedData = { raw_content_preview: feedContent.substring(0, 500) }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `received_${feedType}_${integration.country}_${timestamp}.${contentType.includes('json') ? 'json' : 'xml'}`
    const filePath = `${integration.user_id}/received/${fileName}`

    // Store the feed file in Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vendor-feeds')
      .upload(filePath, feedContent, {
        contentType: contentType || 'application/xml',
        upsert: false
      })

    if (uploadError) {
      console.error('Failed to upload feed file:', uploadError)
      // Continue processing even if file upload fails
    }

    // Log the received feed in the database
    const { data: logData, error: logError } = await supabase
      .from('vendor_feed_logs')
      .insert({
        user_id: integration.user_id,
        integration_id: integrationId,
        feed_type: `received_${feedType}`,
        file_name: fileName,
        file_path: uploadData?.path || filePath,
        status: status,
        total_items: totalItems,
        error_message: uploadError ? `Storage error: ${uploadError.message}` : null,
        acknowledged_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to log received feed:', logError)
      return new Response(
        JSON.stringify({ error: 'Failed to log received feed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Successfully processed ${feedType} feed with ${totalItems} items`)

    // Create signed URL for the uploaded file if successful
    let signedUrl = null
    if (uploadData?.path) {
      const { data: urlData } = await supabase.storage
        .from('vendor-feeds')
        .createSignedUrl(uploadData.path, 3600) // 1 hour expiry
      
      signedUrl = urlData?.signedUrl
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `${feedType} feed received and processed successfully`,
        feed_id: logData.id,
        total_items: totalItems,
        status: status,
        file_url: signedUrl,
        parsed_data: parsedData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing Amazon feed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})