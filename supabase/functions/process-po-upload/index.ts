import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface POUploadJobUpdate {
  processed_rows?: number;
  success_rows?: number;
  error_rows?: number;
  progress_percentage?: number;
  status?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const { jobId, mappedData } = await req.json();

    if (!jobId || !mappedData || !Array.isArray(mappedData)) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId or mappedData' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the authorization token from the request
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      supabaseClient.auth.setSession({
        access_token: authHeader.replace('Bearer ', ''),
        refresh_token: '',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: null
      });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🚀 Starting background processing for job ${jobId} with ${mappedData.length} items`);

    // Update job to processing status
    await updateJobStatus(supabaseClient, jobId, {
      status: 'processing',
      started_at: new Date().toISOString(),
      progress_percentage: 0
    });

    // Process data in the background
    EdgeRuntime.waitUntil(processDataInBackground(supabaseClient, jobId, mappedData, user.id));

    return new Response(
      JSON.stringify({ success: true, message: 'Processing started' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in process-po-upload:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function updateJobStatus(supabase: any, jobId: string, updates: POUploadJobUpdate) {
  const { error } = await supabase
    .from('po_upload_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    console.error('Error updating job status:', error);
  }
}

async function processDataInBackground(supabase: any, jobId: string, mappedData: any[], userId: string) {
  let insertedCount = 0;
  let skippedDuplicates = 0;
  let errorCount = 0;
  const totalItems = mappedData.length;
  const batchSize = 5; // Smaller batch size for edge function

  try {
    console.log(`📊 Processing ${totalItems} items in batches of ${batchSize}`);

    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      
      console.log(`⚡ Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalItems / batchSize)}`);
      
      // Process batch items
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const currentIndex = i + j;

        try {
          // Validate required fields
          if (!item.po_number || !item.model_number || !item.quantity) {
            throw new Error('Missing required fields');
          }

          // Check for duplicates
          const { data: existing, error: checkError } = await supabase
            .from('po_orders')
            .select('id')
            .eq('user_id', userId)
            .eq('po_number', item.po_number)
            .eq('sku_code', item.model_number)
            .eq('quantity', item.quantity);

          if (checkError) throw checkError;

          if (existing && existing.length > 0) {
            skippedDuplicates++;
            console.log(`⏭️ Skipped duplicate: ${item.model_number}`);
            continue;
          }

          // Insert new PO order
          const { error: insertError } = await supabase
            .from('po_orders')
            .insert({
              user_id: userId,
              po_number: item.po_number,
              sku_code: item.model_number,
              quantity: item.quantity,
              ship_to_location: item.ship_to_location || 'Not specified',
              asin: item.asin,
              model_number: item.model_number,
              title: item.title || 'Title not provided',
              external_id: item.external_id,
              external_id_type: item.external_id_type,
              file_name: item.file_name,
              status: 'pending',
              job_id: jobId,
              sku_user_id: userId
            });

          if (insertError) throw insertError;

          insertedCount++;
          console.log(`✅ Inserted: ${item.model_number}`);

        } catch (error) {
          errorCount++;
          const errorMsg = `Row ${currentIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          
          // Log error to job errors table
          try {
            await supabase
              .from('po_upload_job_errors')
              .insert({
                job_id: jobId,
                row_number: currentIndex + 1,
                error_type: 'processing_error',
                error_message: errorMsg,
                row_data: item
              });
          } catch (logError) {
            console.error('Failed to log error:', logError);
          }
          
          console.error(`❌ Error processing item ${currentIndex + 1}:`, errorMsg);
        }
      }

      // Update job progress
      const processedSoFar = Math.min(i + batchSize, totalItems);
      const progressPercent = Math.round((processedSoFar / totalItems) * 100);
      
      await updateJobStatus(supabase, jobId, {
        processed_rows: processedSoFar,
        success_rows: insertedCount,
        error_rows: errorCount,
        progress_percentage: progressPercent
      });

      console.log(`📈 Progress: ${progressPercent}% (${processedSoFar}/${totalItems})`);

      // Small delay between batches
      if (i + batchSize < totalItems) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Final update
    const finalStatus = errorCount === totalItems ? 'failed' : 'completed';
    
    await updateJobStatus(supabase, jobId, {
      status: finalStatus,
      completed_at: new Date().toISOString(),
      progress_percentage: 100,
      error_message: errorCount > 0 ? `${errorCount} items failed processing` : null
    });

    console.log(`🏁 Processing completed: ${insertedCount} inserted, ${skippedDuplicates} duplicates, ${errorCount} errors`);

  } catch (error) {
    console.error('Fatal error in background processing:', error);
    
    await updateJobStatus(supabase, jobId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : 'Fatal processing error'
    });
  }
}