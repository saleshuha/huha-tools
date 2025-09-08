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

// Helper function to write SSH mpint format data
function writeMpint(data: Uint8Array): Uint8Array {
  // Remove leading zeros but keep at least one byte
  let start = 0;
  while (start < data.length - 1 && data[start] === 0) {
    start++;
  }
  const trimmed = data.slice(start);
  
  // If the high bit is set, prepend a zero byte
  const needsPadding = trimmed[0] & 0x80;
  const paddedData = needsPadding ? new Uint8Array([0, ...trimmed]) : trimmed;
  
  // Write length + data
  const buffer = new ArrayBuffer(4 + paddedData.length);
  const view = new DataView(buffer);
  const result = new Uint8Array(buffer);
  
  view.setUint32(0, paddedData.length, false);
  result.set(paddedData, 4);
  
  return result;
}

// Helper function to write SSH wire format string
function writeSSHString(data: Uint8Array): Uint8Array {
  const buffer = new ArrayBuffer(4 + data.length);
  const view = new DataView(buffer);
  const result = new Uint8Array(buffer);
  
  view.setUint32(0, data.length, false);
  result.set(data, 4);
  
  return result;
}

// Helper function to convert public key to proper SSH format
async function publicKeyToSSHFormat(publicKey: CryptoKey, keyType: string = 'integration'): Promise<{
  openssh: string;
  ssh2: string;
  fingerprint: string;
  modulusBits: number;
}> {
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
    
    const modulusBits = modulus.length * 8;
    console.log(`${keyType} key - Modulus length: ${modulusBits} bits, Exponent: ${Array.from(exponent).join(',')}`);
    
    if (modulusBits < 2048) {
      console.error(`WARNING: ${keyType} key modulus is only ${modulusBits} bits, less than required 2048 bits!`);
    }
    
    // Build SSH wire format using proper mpint encoding: [type][exponent][modulus]
    const keyTypeStr = "ssh-rsa";
    const keyTypeBytes = new TextEncoder().encode(keyTypeStr);
    
    const typeString = writeSSHString(keyTypeBytes);
    const exponentMpint = writeMpint(exponent);
    const modulusMpint = writeMpint(modulus);
    
    // Concatenate all parts
    const totalLength = typeString.length + exponentMpint.length + modulusMpint.length;
    const sshKeyBuffer = new Uint8Array(totalLength);
    
    let offset = 0;
    sshKeyBuffer.set(typeString, offset);
    offset += typeString.length;
    sshKeyBuffer.set(exponentMpint, offset);
    offset += exponentMpint.length;
    sshKeyBuffer.set(modulusMpint, offset);
    
    // Encode to base64
    const base64Key = base64Encode(sshKeyBuffer);
    
    // Create OpenSSH format
    const opensshKey = `ssh-rsa ${base64Key} amazon-vendor-${keyType}@integration`;
    
    // Create SSH2/RFC4716 format
    const ssh2Key = `---- BEGIN SSH2 PUBLIC KEY ----
Comment: "amazon-vendor-${keyType}@integration"
${base64Key.match(/.{1,64}/g)?.join('\n') || base64Key}
---- END SSH2 PUBLIC KEY ----`;
    
    // Generate SHA256 fingerprint
    const hash = await crypto.subtle.digest('SHA-256', sshKeyBuffer);
    const fingerprint = `SHA256:${base64Encode(new Uint8Array(hash)).replace(/=+$/, '')}`;
    
    console.log(`Generated valid ${keyType} SSH key with ${modulusBits}-bit modulus`);
    console.log(`${keyType} SSH fingerprint: ${fingerprint}`);
    console.log(`${keyType} OpenSSH key (first 50 chars): ${opensshKey.substring(0, 50)}...`);
    
    return {
      openssh: opensshKey,
      ssh2: ssh2Key,
      fingerprint,
      modulusBits
    };
    
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
    const url = new URL(req.url);
    const modulusLength = parseInt(url.searchParams.get('modulus_length') || '2048');
    
    if (![2048, 4096].includes(modulusLength)) {
      return Response.json(
        { error: 'Invalid modulus length. Must be 2048 or 4096.' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Generating SSH key pairs for Amazon Vendor Central integration with ${modulusLength}-bit keys`);

    // Generate receiving key pair
    console.log(`Generating receiving RSA key pair with ${modulusLength}-bit modulus...`);
    const receivingKeyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: 'SHA-256',
      },
      true, // extractable
      ['sign', 'verify']
    );
    console.log('Receiving key pair generated successfully');

    // Generate sending key pair
    console.log(`Generating sending RSA key pair with ${modulusLength}-bit modulus...`);
    const sendingKeyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength,
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
    const receivingPublicKeyData = await publicKeyToSSHFormat(receivingKeyPair.publicKey, 'receiving');

    // Export sending keys
    const sendingPrivateKeyBuffer = await crypto.subtle.exportKey('pkcs8', sendingKeyPair.privateKey);
    const sendingPrivateKeyPem = arrayBufferToPem(sendingPrivateKeyBuffer, 'PRIVATE');
    const sendingPublicKeyData = await publicKeyToSSHFormat(sendingKeyPair.publicKey, 'sending');

    console.log(`SSH key pairs generated successfully - ${receivingPublicKeyData.modulusBits}/${sendingPublicKeyData.modulusBits} bits`);
    
    return Response.json({
      success: true,
      keys: {
        receiving: {
          private_key: receivingPrivateKeyPem,
          public_key_openssh: receivingPublicKeyData.openssh,
          public_key_ssh2: receivingPublicKeyData.ssh2,
          fingerprint: receivingPublicKeyData.fingerprint,
          modulus_bits: receivingPublicKeyData.modulusBits,
          // Legacy compatibility
          public_key: receivingPublicKeyData.openssh
        },
        sending: {
          private_key: sendingPrivateKeyPem,
          public_key_openssh: sendingPublicKeyData.openssh,
          public_key_ssh2: sendingPublicKeyData.ssh2,
          fingerprint: sendingPublicKeyData.fingerprint,
          modulus_bits: sendingPublicKeyData.modulusBits,
          // Legacy compatibility
          public_key: sendingPublicKeyData.openssh
        }
      },
      instructions: {
        receiving_key_usage: "Upload this receiving public key to Amazon for files they send to you",
        sending_key_usage: "Upload this sending public key to Amazon for files you send to them",
        private_key_usage: "Store both private keys securely in your secrets management. Never share them.",
        key_formats: {
          openssh: "Standard OpenSSH format (ssh-rsa ...)",
          ssh2: "RFC4716 SSH2 format (---- BEGIN SSH2 PUBLIC KEY ----)"
        },
        next_steps: [
          "Copy and securely store both private keys",
          "Try uploading the OpenSSH format first to Amazon",
          "If Amazon rejects OpenSSH format, try the SSH2/RFC4716 format",
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