import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating SSH key pair for Amazon Vendor Central integration');

    // Generate SSH key pair using OpenSSL equivalent in Deno
    const keygenProcess = new Deno.Command("ssh-keygen", {
      args: [
        "-t", "rsa",
        "-b", "2048",
        "-f", "/tmp/amazon_vendor_key",
        "-N", "", // No passphrase
        "-C", "amazon-vendor-central-integration"
      ],
      stdout: "piped",
      stderr: "piped"
    });

    const keygenResult = await keygenProcess.output();
    
    if (!keygenResult.success) {
      const error = new TextDecoder().decode(keygenResult.stderr);
      console.error('SSH key generation failed:', error);
      return Response.json(
        { error: 'Failed to generate SSH keys', details: error },
        { status: 500, headers: corsHeaders }
      );
    }

    // Read the generated private key
    const privateKey = await Deno.readTextFile("/tmp/amazon_vendor_key");
    
    // Read the generated public key
    const publicKey = await Deno.readTextFile("/tmp/amazon_vendor_key.pub");

    // Clean up temporary files
    try {
      await Deno.remove("/tmp/amazon_vendor_key");
      await Deno.remove("/tmp/amazon_vendor_key.pub");
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary key files:', cleanupError);
    }

    console.log('SSH key pair generated successfully');
    
    return Response.json({
      success: true,
      keys: {
        private_key: privateKey.trim(),
        public_key: publicKey.trim()
      },
      instructions: {
        private_key_usage: "Store this private key securely in your secrets management. Never share it.",
        public_key_usage: "Upload this public key to Amazon Vendor Central in the EDI Settings section.",
        next_steps: [
          "Copy and securely store the private key",
          "Upload the public key to Amazon Vendor Central",
          "Wait for Amazon to activate your SSH key (24-48 hours)",
          "Receive SFTP connection details from Amazon via email"
        ]
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error generating SSH keys:', error);
    return Response.json(
      { error: 'Unexpected error occurred', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
});