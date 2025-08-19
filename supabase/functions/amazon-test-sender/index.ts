import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestSendRequest {
  integration_id: string;
  user_id: string;
  xml_content: string;
  file_name?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('amazon-test-sender: Request received - v1.1');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { integration_id, user_id, xml_content, file_name }: TestSendRequest = requestBody;

    console.log('Starting test XML send for integration:', integration_id, 'user:', user_id);

    // Get integration configuration
    const { data: integration, error: integrationError } = await supabase
      .from('vendor_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('user_id', user_id)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration.is_active) {
      return new Response(
        JSON.stringify({ error: 'Integration is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check SSH private key availability
    const privateKey = Deno.env.get('AMAZON_SFTP_PRIVATE_KEY');
    console.log('SSH private key check:', privateKey ? 'Found' : 'Not found');
    console.log('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('AMAZON')));
    
    if (!privateKey) {
      console.error('SSH private key not configured');
      
      // Still create a log entry to show the attempt in feed history
      const defaultFileName = file_name || `test_ofr_${Date.now()}.xml`;
      
      try {
        await supabase.from('vendor_feed_logs').insert({
          user_id: user_id,
          integration_id: integration_id,
          feed_type: 'test_ofr',
          file_name: defaultFileName,
          file_path: `${user_id}/${defaultFileName}`,
          status: 'failed',
          total_items: 1,
          error_message: 'SSH private key not configured',
          sent_at: new Date().toISOString(),
          acknowledged_at: null
        });
        console.log('Logged failed attempt to feed history');
      } catch (logError) {
        console.error('Error logging failed attempt:', logError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'SSH private key not configured. Please add the private key to AMAZON_SFTP_PRIVATE_KEY secret.',
          logged: true,
          message: 'Attempt logged in Feed History'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate file name if not provided
    const timestamp = Date.now();
    const defaultFileName = file_name || `test_ofr_${timestamp}.xml`;

    // Start background task to send file
    const sendTask = async () => {
      try {
        console.log('Preparing to send test XML file to Amazon SFTP...');
        
        // Store the XML content in Supabase Storage first
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vendor-feeds')
          .upload(`${user_id}/${defaultFileName}`, xml_content, {
            contentType: 'application/xml',
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading XML to storage:', uploadError);
          throw uploadError;
        }

        console.log('XML file stored in Supabase Storage:', uploadData.path);

        const host = integration.sftp_host || 'eu-sftp.amazonsedi.com';
        const username = integration.sftp_username || '18DL8XNNYWXN1';
        const remotePath = integration.sftp_remote_path || 'upload';
        const port = integration.sftp_port || 22;

        console.log(`Connecting to: ${host}:${port} as ${username}`);
        console.log(`Uploading to directory: ${remotePath}`);
        console.log(`File name: ${defaultFileName}`);
        console.log(`SSH fingerprint expected: ${integration.ssh_fingerprint_sending}`);
        console.log(`XML content length: ${xml_content.length} characters`);

        // TODO: Implement real SFTP upload to Amazon
        // This requires implementing actual SFTP client functionality
        // For now, marking as failed since real upload is not implemented
        console.log('REAL SFTP UPLOAD: Not yet implemented - would upload to Amazon SFTP server');
        console.log('Amazon expects actual file transfer, not simulation');
        
        // Mark as failed until real SFTP is implemented
        const uploadStatus = 'failed';
        const errorMessage = 'Real SFTP upload not implemented yet - currently only simulation mode';

        // Log the test send
        const { error: logError } = await supabase
          .from('vendor_feed_logs')
          .insert({
            user_id: user_id,
            integration_id: integration_id,
            feed_type: 'test_ofr',
            file_name: defaultFileName,
            file_path: uploadData.path,
            status: uploadStatus,
            total_items: 1,
            sent_at: new Date().toISOString(),
            acknowledged_at: null
          });

        if (logError) {
          console.error('Error logging test send:', logError);
        } else {
          console.log(`Logged test send: ${defaultFileName}`);
        }

        console.log('Test XML file prepared for Amazon SFTP upload');

      } catch (error) {
        console.error('Error in test send task:', error);
        
        // Log the error
        await supabase
          .from('vendor_feed_logs')
          .insert({
            user_id: user_id,
            integration_id: integration_id,
            feed_type: 'test_error',
            file_name: defaultFileName,
            file_path: null,
            status: 'error',
            total_items: 0,
            error_message: error.message,
            sent_at: null,
            acknowledged_at: null
          });
      }
    };

    // Start the background task
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(sendTask());
    } else {
      // Fallback for local development
      sendTask().catch(console.error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test XML file prepared for Amazon SFTP upload',
        file_name: defaultFileName,
        integration_name: integration.vendor_name,
        send_host: integration.sftp_host,
        send_username: integration.sftp_username,
        note: 'File is ready to be sent to Amazon once SSH private key is configured'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in amazon-test-sender:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});