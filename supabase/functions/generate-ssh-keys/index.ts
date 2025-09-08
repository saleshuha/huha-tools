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

// Helper function to write SSH wire format data
function writeSSHString(data: Uint8Array): Uint8Array {
  const length = data.length;
  const buffer = new ArrayBuffer(4 + length);
  const view = new DataView(buffer);
  const result = new Uint8Array(buffer);
  
  // Write 32-bit length in big-endian format
  view.setUint32(0, length, false);
  // Write data
  result.set(data, 4);
  
  return result;
}

// Helper function to convert public key to proper SSH format
async function publicKeyToSSHFormat(publicKey: CryptoKey, keyType: string = 'integration'): Promise<string> {
  console.log(`Converting ${keyType} public key to SSH format...`);
  
  try {
    // Export the public key in JWK format to easily access n and e
    const jwk = await crypto.subtle.exportKey('jwk', publicKey);
    console.log(`${keyType} JWK key type: ${jwk.kty}, use: ${jwk.use}`);
    
    if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
      throw new Error('Invalid RSA key format in JWK');
    }
    
    // Convert base64url to regular base64, then to bytes
    const modulusBase64 = jwk.n.replace(/-/g, '+').replace(/_/g, '/');
    const exponentBase64 = jwk.e.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const modulusPadded = modulusBase64 + '='.repeat((4 - modulusBase64.length % 4) % 4);
    const exponentPadded = exponentBase64 + '='.repeat((4 - exponentBase64.length % 4) % 4);
    
    // Decode from base64
    const modulus = Uint8Array.from(atob(modulusPadded), c => c.charCodeAt(0));
    const exponent = Uint8Array.from(atob(exponentPadded), c => c.charCodeAt(0));
    
    console.log(`${keyType} key - Modulus length: ${modulus.length * 8} bits, Exponent: ${Array.from(exponent).join(',')}`);
    
    if (modulus.length * 8 < 2048) {
      console.error(`WARNING: ${keyType} key modulus is only ${modulus.length * 8} bits, less than required 2048 bits!`);
    }
    
    // Build SSH wire format: [type][exponent][modulus]
    const keyTypeStr = "ssh-rsa";
    const keyTypeBytes = new TextEncoder().encode(keyTypeStr);
    
    const typeString = writeSSHString(keyTypeBytes);
    const exponentString = writeSSHString(exponent);
    const modulusString = writeSSHString(modulus);
    
    // Concatenate all parts
    const totalLength = typeString.length + exponentString.length + modulusString.length;
    const sshKeyBuffer = new Uint8Array(totalLength);
    
    let offset = 0;
    sshKeyBuffer.set(typeString, offset);
    offset += typeString.length;
    sshKeyBuffer.set(exponentString, offset);
    offset += exponentString.length;
    sshKeyBuffer.set(modulusString, offset);
    
    // Encode to base64
    const base64Key = base64Encode(sshKeyBuffer);
    const sshKey = `ssh-rsa ${base64Key} amazon-vendor-${keyType}@integration`;
    
    console.log(`Generated valid ${keyType} SSH key with ${modulus.length * 8}-bit modulus`);
    console.log(`${keyType} SSH key (first 50 chars): ${sshKey.substring(0, 50)}...`);
    
    return sshKey;
    
  } catch (error) {
    console.error(`Failed to convert ${keyType} key to SSH format:`, error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating SSH key pairs for Amazon Vendor Central integration (receiving and sending)');

    // Generate receiving key pair
    console.log('Generating receiving RSA key pair with 2048-bit modulus...');
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
    console.log('Receiving key pair generated successfully');

    // Generate sending key pair
    console.log('Generating sending RSA key pair with 2048-bit modulus...');
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
    console.log('Sending key pair generated successfully');

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