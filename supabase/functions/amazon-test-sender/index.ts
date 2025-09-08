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

// Function to normalize PEM format keys with enhanced validation
function normalizePem(pemKey: string): string {
  if (!pemKey) return pemKey;
  
  // Remove any BOM and normalize whitespace
  let normalized = pemKey.replace(/^\uFEFF/, '').trim();
  
  // Remove quotes if the key is wrapped in them
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || 
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }
  
  // Handle escaped newlines
  normalized = normalized.replace(/\\n/g, '\n');
  
  // Convert CRLF to LF
  normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Get the first line to determine key type
  const lines = normalized.split('\n').filter(line => line.trim());
  const firstLine = lines[0]?.trim() || '';
  
  // Early validation: Reject unsupported key formats with specific error messages
  if (firstLine.includes('-----BEGIN OPENSSH PRIVATE KEY-----')) {
    throw new Error(`OPENSSH_FORMAT|${firstLine}|OpenSSH private key format is not supported. Convert to PEM format using: ssh-keygen -p -m PEM -f your_key_file`);
  }
  
  if (firstLine.includes('-----BEGIN DSA PRIVATE KEY-----')) {
    throw new Error(`DSA_FORMAT|${firstLine}|DSA private keys are not supported. Amazon requires RSA keys. Generate a new RSA key pair.`);
  }
  
  if (firstLine.includes('-----BEGIN EC PRIVATE KEY-----')) {
    throw new Error(`EC_FORMAT|${firstLine}|EC (Elliptic Curve) private keys are not supported by Amazon. Generate a new RSA key pair.`);
  }
  
  if (firstLine.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----')) {
    throw new Error(`ENCRYPTED_FORMAT|${firstLine}|Encrypted private keys are not supported. Remove passphrase using: openssl rsa -in encrypted_key.pem -out decrypted_key.pem`);
  }
  
  // Check for non-RSA PKCS#8 keys
  if (firstLine.includes('-----BEGIN PRIVATE KEY-----')) {
    // This is PKCS#8 format, but we need to ensure it's RSA
    // We'll let the SFTP client validate this, but provide a helpful error if it fails
    console.log('PKCS#8 format detected - will validate during connection');
  } else if (!firstLine.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    throw new Error(`UNKNOWN_FORMAT|${firstLine}|Unsupported private key format. Supported formats: RSA private key or PKCS#8. Found: ${firstLine}`);
  }
  
  // Handle single-line or malformed PEM keys
  if (lines.length <= 3) {
    const fullContent = lines.join('');
    const beginMatch = fullContent.match(/(-----BEGIN[^-]+-----)/);
    const endMatch = fullContent.match(/(-----END[^-]+-----)/);
    
    if (beginMatch && endMatch) {
      const header = beginMatch[1];
      const footer = endMatch[1];
      
      // Extract the key content between markers
      let keyContent = fullContent.replace(header, '').replace(footer, '').replace(/\s/g, '');
      
      // Add line breaks every 64 characters for proper PEM format
      const keyLines = [];
      for (let i = 0; i < keyContent.length; i += 64) {
        keyLines.push(keyContent.substr(i, 64));
      }
      
      normalized = header + '\n' + keyLines.join('\n') + '\n' + footer;
    }
  }
  
  // Final validation - ensure we have proper PEM structure
  const finalLines = normalized.split('\n').filter(line => line.trim());
  if (finalLines.length < 4) {
    throw new Error(`MALFORMED_PEM|${firstLine}|Invalid PEM format: Key must have proper BEGIN/END markers with content in between`);
  }
  
  // Ensure no extra whitespace and proper line endings
  normalized = finalLines.join('\n');
  
  return normalized;
}

// Function to ensure filename has .xml extension
function ensureXmlExtension(filename: string): string {
  if (!filename) return filename;
  return filename.toLowerCase().endsWith('.xml') ? filename : filename + '.xml';
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
    const passphrase = Deno.env.get('AMAZON_SFTP_SENDING_PASSPHRASE');
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

    // Generate file name if not provided and ensure .xml extension
    const timestamp = Date.now();
    const defaultFileName = ensureXmlExtension(file_name || `test_ofr_${timestamp}`);

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
          
          // Process and validate the private key using normalizePem
          let processedPrivateKey;
          try {
            processedPrivateKey = normalizePem(privateKey);
            console.log('PEM normalization successful');
          } catch (normError) {
            console.error('PEM normalization failed:', normError.message);
            throw new Error(`Private key format error: ${normError.message}`);
          }
          
          // Log key format for debugging (first and last line only for security)
          const keyLines = processedPrivateKey.split('\n').filter(line => line.trim());
          console.log('Key format check after normalization:');
          console.log('First line:', keyLines[0]);
          console.log('Last line:', keyLines[keyLines.length - 1]);
          console.log('Total lines:', keyLines.length);
          console.log('Key type:', keyLines[0].includes('RSA') ? 'RSA' : keyLines[0].includes('EC') ? 'EC' : 'PKCS#8');
          
          // Additional validation - key should already be validated by normalizePem
          if (!processedPrivateKey.includes('-----BEGIN') || !processedPrivateKey.includes('-----END')) {
            throw new Error('Invalid PEM format after normalization');
          }
          
          // Ensure proper PEM format types
          const supportedFormats = [
            'BEGIN RSA PRIVATE KEY',
            'BEGIN PRIVATE KEY', 
            'BEGIN EC PRIVATE KEY'
          ];
          
          const hasValidFormat = supportedFormats.some(format => 
            processedPrivateKey.includes(format)
          );
          
          if (!hasValidFormat) {
            throw new Error(`Unsupported private key format. Supported formats: RSA, PKCS#8, or EC private keys in PEM format. Found: ${keyLines[0]}`);
          }
          
          console.log('Private key format validation passed');
          
          // Simple connection configuration - remove complex algorithms that might cause issues
          const connectConfig = {
            host: host,
            port: port,
            username: username,
            privateKey: processedPrivateKey,
            passphrase: passphrase || undefined,
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
          
          // More specific error handling with structured error messages
          if (sftpError.message.includes('privateKey') || sftpError.message.includes('key format') || sftpError.message.includes('Unsupported key format')) {
            // Check if this is a normalization error with structured format
            if (sftpError.message.includes('|')) {
              errorMessage = sftpError.message; // Pass through structured error
            } else {
              errorMessage = `KEY_FORMAT_ERROR|Unknown|SSH private key format error: ${sftpError.message}. The key must be in traditional PEM format (RSA/PKCS#8). OpenSSH format is not supported.`;
            }
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