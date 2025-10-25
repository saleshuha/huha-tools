import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteResult {
  success: boolean;
  deletedCount: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting export cleanup job...');

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    console.log(`Cutoff date: ${cutoffDate.toISOString()}`);

    // Find exports older than 30 days that are not marked as keep_forever
    const { data: exportsToDelete, error: fetchError } = await supabaseClient
      .from('export_history')
      .select('id, user_id, file_path')
      .lt('created_at', cutoffDate.toISOString())
      .eq('keep_forever', false);

    if (fetchError) {
      console.error('Error fetching exports to delete:', fetchError);
      throw fetchError;
    }

    if (!exportsToDelete || exportsToDelete.length === 0) {
      console.log('No exports to delete');
      return new Response(
        JSON.stringify({ success: true, deletedCount: 0, message: 'No exports to delete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${exportsToDelete.length} exports to delete`);

    const result: DeleteResult = {
      success: true,
      deletedCount: 0,
      errors: []
    };

    // Delete each export
    for (const exportItem of exportsToDelete) {
      try {
        // Delete file from storage if it exists
        if (exportItem.file_path) {
          const { error: storageError } = await supabaseClient.storage
            .from('sunsky-exports')
            .remove([exportItem.file_path]);

          if (storageError) {
            console.warn(`Failed to delete file ${exportItem.file_path}:`, storageError);
            result.errors.push(`Storage deletion failed for ${exportItem.id}: ${storageError.message}`);
          } else {
            console.log(`Deleted file: ${exportItem.file_path}`);
          }
        }

        // Delete database entry
        const { error: dbError } = await supabaseClient
          .from('export_history')
          .delete()
          .eq('id', exportItem.id);

        if (dbError) {
          console.error(`Failed to delete export_history entry ${exportItem.id}:`, dbError);
          result.errors.push(`DB deletion failed for ${exportItem.id}: ${dbError.message}`);
        } else {
          result.deletedCount++;
          console.log(`Deleted export_history entry: ${exportItem.id}`);
        }
      } catch (err) {
        console.error(`Error processing export ${exportItem.id}:`, err);
        result.errors.push(`Error processing ${exportItem.id}: ${err.message}`);
      }
    }

    console.log(`Cleanup completed. Deleted ${result.deletedCount} exports with ${result.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: result.errors.length === 0,
        deletedCount: result.deletedCount,
        errors: result.errors,
        message: `Cleaned up ${result.deletedCount} old exports`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Cleanup job failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

