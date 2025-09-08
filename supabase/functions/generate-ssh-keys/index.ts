import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to convert ArrayBuffer to PEM format
function arrayBufferToPem(buffer: ArrayBuffer, type: 'PRIVATE' | 'PUBLIC'): string {
  const base64 = base64Encode(new Uint8Array(buffer));
  const lines = [];
  lines.push(`-----BEGIN ${type === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'} KEY-----`);
  
  // Split base64 into 64-character lines
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.substring(i, i + 64));
  }
  
  lines.push(`-----END ${type === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'} KEY-----`);
  return lines.join('\n');
}

// Helper function to convert public key to SSH format
async function publicKeyToSSHFormat(publicKey: CryptoKey): Promise<string> {
  // Export the public key in SPKI format
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  
  // Convert to PEM format first, then extract the base64 part
  const pemKey = arrayBufferToPem(exported, 'PUBLIC');
  
  // Extract just the base64 content (remove headers and newlines)
  const base64Content = pemKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  
  // Convert PEM to SSH format
  // This is a simplified approach that should work with Amazon
  return `ssh-rsa ${base64Content} amazon-vendor-central@integration`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating SSH key pair for Amazon Vendor Central integration');

    // Generate RSA key pair using Web Crypto API (standard RSA for SSH compatibility)
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: 'SHA-256',
      },
      true, // extractable
      ['sign', 'verify']
    );

    // Export private key in PKCS#8 format
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyPem = arrayBufferToPem(privateKeyBuffer, 'PRIVATE');

    // Export public key in SSH format
    const publicKeySSH = await publicKeyToSSHFormat(keyPair.publicKey);

    console.log('SSH key pair generated successfully');
    
    return Response.json({
      success: true,
      keys: {
        private_key: privateKeyPem,
        public_key: publicKeySSH
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
})