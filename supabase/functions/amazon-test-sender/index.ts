import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import SftpClient from 'npm:ssh2-sftp-client@10.0.3';

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

    const { integration_id, xml_content, file_name }: Omit<TestSendRequest, 'user_id'> = requestBody;

    console.log('Starting test XML send for integration:', integration_id, 'user:', user.id);

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

    // Check SSH private key availability - try sending-specific key first
    let privateKey = Deno.env.get('AMAZON_SFTP_SENDING_PRIVATE_KEY') || Deno.env.get('AMAZON_SFTP_PRIVATE_KEY');
    console.log('SSH private key check:', privateKey ? 'Found' : 'Not found');
    console.log('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('AMAZON')));
    console.log('Checking for sending-specific key: AMAZON_SFTP_SENDING_PRIVATE_KEY');
    
    if (!privateKey) {
      console.error('SSH private key not configured');
      
      // Still create a log entry to show the attempt in feed history
      const defaultFileName = file_name || `test_ofr_${Date.now()}.xml`;
      
      try {
        await supabase.from('vendor_feed_logs').insert({
          user_id: user.id,
          integration_id: integration_id,
          feed_type: 'test_ofr',
          file_name: defaultFileName,
          file_path: `${user.id}/${defaultFileName}`,
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
          error: 'SSH private key not configured. Please add the sending private key to AMAZON_SFTP_SENDING_PRIVATE_KEY secret (or AMAZON_SFTP_PRIVATE_KEY as fallback). Amazon typically requires different keys for sending vs receiving.',
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
          .upload(`${user.id}/${defaultFileName}`, xml_content, {
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

        // Implement real SFTP upload to Amazon
        let uploadStatus = 'failed';
        let errorMessage = '';
        
        try {
          console.log('Attempting real SFTP connection to Amazon...');
          
          // Create SFTP client
          const sftp = new SftpClient();
          
          // Process and validate the private key
          let processedPrivateKey = privateKey.trim();
          
          // Handle escaped newlines
          processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
          
          // Log key format for debugging (first and last line only for security)
          const keyLines = processedPrivateKey.split('\n');
          console.log('Key format check:');
          console.log('First line:', keyLines[0]);
          console.log('Last line:', keyLines[keyLines.length - 1]);
          console.log('Total lines:', keyLines.length);
          
          // Validate key format
          if (!processedPrivateKey.includes('-----BEGIN') || !processedPrivateKey.includes('-----END')) {
            throw new Error('Private key must be in PEM format with BEGIN/END markers');
          }
          
          // For OpenSSH format keys, we need to convert them or use a different approach
          if (processedPrivateKey.includes('BEGIN OPENSSH PRIVATE KEY')) {
            console.log('OpenSSH format detected - this format may not be supported by ssh2-sftp-client');
            throw new Error('OpenSSH private key format detected. Please convert to traditional PEM format (ssh-keygen -p -m PEM -f keyfile)');
          }
          
          // Ensure proper PEM format
          if (!processedPrivateKey.includes('BEGIN RSA PRIVATE KEY') && 
              !processedPrivateKey.includes('BEGIN PRIVATE KEY') &&
              !processedPrivateKey.includes('BEGIN EC PRIVATE KEY')) {
            throw new Error('Unsupported private key format. Supported formats: RSA, PKCS#8, or EC private keys in PEM format');
          }
          
          console.log('Private key format validation passed');
          
          // Simple connection configuration - remove complex algorithms that might cause issues
          const connectConfig = {
            host: host,
            port: port,
            username: username,
            privateKey: processedPrivateKey,
            readyTimeout: 30000,
            // Remove algorithms specification to use defaults
            debug: (info) => console.log('SFTP Debug:', info)
          };
          
          console.log('Connecting to SFTP server with simplified config...');
          await sftp.connect(connectConfig);
          
          console.log('SFTP connection established');
          console.log(`Uploading file to remote path: ${remotePath}/${defaultFileName}`);
          
          // Upload file content using Buffer.from for proper encoding
          const remoteFilePath = `${remotePath}/${defaultFileName}`;
          const buffer = Buffer.from(xml_content, 'utf8');
          
          // Ensure remote directory exists
          try {
            await sftp.mkdir(remotePath, true);
            console.log(`Created/verified remote directory: ${remotePath}`);
          } catch (mkdirError) {
            console.log(`Directory already exists or creation failed: ${mkdirError.message}`);
          }
          
          await sftp.put(buffer, remoteFilePath);
          
          console.log('File uploaded successfully to Amazon SFTP');
          uploadStatus = 'sent';
          
          // Close connection
          await sftp.end();
          
        } catch (sftpError) {
          console.error('SFTP upload failed:', sftpError);
          console.error('Error details:', {
            message: sftpError.message,
            code: sftpError.code,
            name: sftpError.name
          });
          
          // More specific error handling
          if (sftpError.message.includes('privateKey') || sftpError.message.includes('key format') || sftpError.message.includes('Unsupported key format')) {
            errorMessage = `SSH private key format error: ${sftpError.message}. The key must be in traditional PEM format (RSA/PKCS#8). OpenSSH format is not supported.`;
          } else if (sftpError.message.includes('connect') || sftpError.message.includes('timeout')) {
            errorMessage = `Connection failed: ${sftpError.message}. Check host, port, and network connectivity.`;
          } else if (sftpError.message.includes('authentication') || sftpError.message.includes('login')) {
            errorMessage = `Authentication failed: ${sftpError.message}. Check username and private key.`;
          } else {
            errorMessage = `SFTP upload failed: ${sftpError.message}`;
          }
          
          uploadStatus = 'failed';
        }

        // Log the test send
        const { error: logError } = await supabase
          .from('vendor_feed_logs')
          .insert({
            user_id: user.id,
            integration_id: integration_id,
            feed_type: 'test_ofr',
            file_name: defaultFileName,
            file_path: uploadData.path,
            status: uploadStatus,
            total_items: 1,
            error_message: errorMessage || null,
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
            user_id: user.id,
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