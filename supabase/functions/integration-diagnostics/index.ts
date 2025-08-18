import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();

    // Get all integrations for this user
    const { data: integrations, error } = await supabase
      .from('vendor_integrations')
      .select('*')
      .eq('user_id', user_id);

    if (error) {
      console.error('Error fetching integrations:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch integrations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check SSH private key
    const privateKey = Deno.env.get('AMAZON_SFTP_PRIVATE_KEY');
    
    const diagnosis = {
      integrations_count: integrations?.length || 0,
      private_key_configured: !!privateKey,
      private_key_length: privateKey ? privateKey.length : 0,
      integrations: integrations?.map(integration => ({
        id: integration.id,
        vendor_name: integration.vendor_name,
        is_active: integration.is_active,
        sftp_host: integration.sftp_host,
        sftp_username: integration.sftp_username,
        sftp_remote_path: integration.sftp_remote_path,
        ssh_fingerprint_sending: integration.ssh_fingerprint_sending,
        ssh_fingerprint_receiving: integration.ssh_fingerprint_receiving,
        sending_config_complete: !!(integration.sftp_host && integration.sftp_username && integration.ssh_fingerprint_sending),
        receiving_config_complete: !!(integration.sftp_receive_host && integration.sftp_receive_username && integration.ssh_fingerprint_receiving)
      }))
    };

    return new Response(
      JSON.stringify(diagnosis),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in integration-diagnostics:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});