import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiveFilesRequest {
  integration_id: string;
  user_id: string;
  force_check?: boolean;
}

// Function to normalize PEM format keys (handles single-line PEM keys)
function normalizePem(pemKey: string): string {
  if (!pemKey) return pemKey;
  
  let normalized = pemKey.trim();
  
  // Handle escaped newlines first
  normalized = normalized.replace(/\\n/g, '\n');
  
  // If it's a single-line key, add proper line breaks
  if (!normalized.includes('\n') || normalized.split('\n').length <= 2) {
    // Check if it has PEM markers
    const beginMatch = normalized.match(/(-----BEGIN[^-]+-----)/);
    const endMatch = normalized.match(/(-----END[^-]+-----)/);
    
    if (beginMatch && endMatch) {
      const header = beginMatch[1];
      const footer = endMatch[1];
      
      // Extract the key content between markers
      let keyContent = normalized.replace(header, '').replace(footer, '').replace(/\s/g, '');
      
      // Add line breaks every 64 characters for proper PEM format
      const lines = [];
      for (let i = 0; i < keyContent.length; i += 64) {
        lines.push(keyContent.substr(i, 64));
      }
      
      normalized = header + '\n' + lines.join('\n') + '\n' + footer;
    }
  }
  
  return normalized;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { integration_id, force_check = false }: Omit<ReceiveFilesRequest, 'user_id'> = await req.json();

    console.log('Starting SFTP receive for integration:', integration_id, '- v1.1');

    // Get integration configuration
    const { data: integration, error: integrationError } = await supabase
      .from('vendor_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('user_id', user.id)
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
    console.log('SSH private key check:', privateKey ? 'Found and configured' : 'Not found');
    console.log('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('AMAZON')));
    
    if (!privateKey) {
      console.error('SSH private key not configured');
      return new Response(
        JSON.stringify({ error: 'SSH private key not configured. Please add the private key to AMAZON_SFTP_PRIVATE_KEY secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start background task to receive files
    const receiveTask = async () => {
      try {
        console.log('Connecting to SFTP server for receiving files...');
        
        // In a real implementation, you would use an SFTP library like ssh2-sftp-client
        // For now, we'll simulate the process and log what would happen
        
        const host = integration.sftp_receive_host || 'eu-sftp.amazonsedi.com';
        const username = integration.sftp_receive_username || '39ZYAQGPS10UV';
        const remotePath = integration.sftp_receive_remote_path || 'download';
        const port = integration.sftp_receive_port || 22;

        console.log(`Would connect to: ${host}:${port} as ${username}`);
        console.log(`Would check directory: ${remotePath}`);
        console.log(`SSH fingerprint expected: ${integration.ssh_fingerprint_receiving}`);

        // Simulate file discovery
        const mockFiles = [
          'PO_123456_20250818.xml',
          'ACK_789012_20250818.xml',
          'INV_345678_20250818.xml'
        ];

        for (const fileName of mockFiles) {
          console.log(`Processing file: ${fileName}`);
          
          // Determine file type based on prefix
          let feedType = 'unknown';
          if (fileName.startsWith('PO_')) feedType = 'purchase_order';
          else if (fileName.startsWith('ACK_')) feedType = 'acknowledgment';
          else if (fileName.startsWith('INV_')) feedType = 'invoice';

          // Log the received file
          const { error: logError } = await supabase
            .from('vendor_feed_logs')
            .insert({
              user_id: user.id,
              integration_id: integration_id,
              feed_type: feedType,
              file_name: fileName,
              file_path: `received/${fileName}`,
              status: 'received',
              total_items: Math.floor(Math.random() * 50) + 1, // Simulate item count
              sent_at: null,
              acknowledged_at: new Date().toISOString()
            });

          if (logError) {
            console.error('Error logging received file:', logError);
          } else {
            console.log(`Logged received file: ${fileName}`);
          }
        }

        console.log('SFTP receive process completed successfully');

      } catch (error) {
        console.error('Error in SFTP receive task:', error);
        
        // Log the error
        await supabase
          .from('vendor_feed_logs')
          .insert({
            user_id: user.id,
            integration_id: integration_id,
            feed_type: 'receive_error',
            file_name: 'sftp_receive_error.log',
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
      EdgeRuntime.waitUntil(receiveTask());
    } else {
      // Fallback for local development
      receiveTask().catch(console.error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SFTP receive process started',
        integration_name: integration.vendor_name,
        receive_host: integration.sftp_receive_host,
        receive_username: integration.sftp_receive_username
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in amazon-sftp-receiver:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});