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
async function publicKeyToSSHFormat(publicKey: CryptoKey, keyType: string = 'integration'): Promise<string> {
  // Export the public key in SPKI format
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  
  // Convert to PEM format first, then extract the base64 part
  const pemKey = arrayBufferToPem(exported, 'PUBLIC');
  
  // Extract just the base64 content (remove headers and newlines)
  const base64Content = pemKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  
  // Convert PEM to SSH format with descriptive key name
  return `ssh-rsa ${base64Content} amazon-vendor-${keyType}@integration`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating SSH key pairs for Amazon Vendor Central integration (receiving and sending)');

    // Generate receiving key pair
    const receivingKeyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: 'SHA-256',
      },
      true, // extractable
      ['sign', 'verify']
    );

    // Generate sending key pair
    const sendingKeyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: 'SHA-256',
      },
      true, // extractable
      ['sign', 'verify']
    );

    // Export receiving keys
    const receivingPrivateKeyBuffer = await crypto.subtle.exportKey('pkcs8', receivingKeyPair.privateKey);
    const receivingPrivateKeyPem = arrayBufferToPem(receivingPrivateKeyBuffer, 'PRIVATE');
    const receivingPublicKeySSH = await publicKeyToSSHFormat(receivingKeyPair.publicKey, 'receiving');

    // Export sending keys
    const sendingPrivateKeyBuffer = await crypto.subtle.exportKey('pkcs8', sendingKeyPair.privateKey);
    const sendingPrivateKeyPem = arrayBufferToPem(sendingPrivateKeyBuffer, 'PRIVATE');
    const sendingPublicKeySSH = await publicKeyToSSHFormat(sendingKeyPair.publicKey, 'sending');

    console.log('SSH key pairs generated successfully');
    
    return Response.json({
      success: true,
      keys: {
        receiving: {
          private_key: receivingPrivateKeyPem,
          public_key: receivingPublicKeySSH
        },
        sending: {
          private_key: sendingPrivateKeyPem,
          public_key: sendingPublicKeySSH
        }
      },
      instructions: {
        receiving_key_usage: "Upload this receiving public key to Amazon for files they send to you",
        sending_key_usage: "Upload this sending public key to Amazon for files you send to them",
        private_key_usage: "Store both private keys securely in your secrets management. Never share them.",
        next_steps: [
          "Copy and securely store both private keys",
          "Upload the receiving public key to Amazon for incoming files",
          "Upload the sending public key to Amazon for outgoing files",
          "Wait for Amazon to activate your SSH keys (24-48 hours)",
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