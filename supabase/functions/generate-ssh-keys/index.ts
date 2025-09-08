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
  
  // Parse the SPKI structure to extract RSA components
  const spkiArray = new Uint8Array(exported);
  
  // Skip SPKI header to get to the RSA public key
  // SPKI has a standard structure, we need to find the BIT STRING containing the RSA key
  let rsaKeyOffset = 0;
  for (let i = 0; i < spkiArray.length - 10; i++) {
    // Look for BIT STRING tag (0x03) followed by length
    if (spkiArray[i] === 0x03) {
      rsaKeyOffset = i + 1;
      // Skip length bytes
      if (spkiArray[i + 1] & 0x80) {
        const lengthBytes = spkiArray[i + 1] & 0x7f;
        rsaKeyOffset += lengthBytes + 1;
      } else {
        rsaKeyOffset += 2;
      }
      // Skip the unused bits byte (should be 0x00)
      if (spkiArray[rsaKeyOffset] === 0x00) {
        rsaKeyOffset += 1;
      }
      break;
    }
  }
  
  // Extract the RSA key data
  const rsaKeyData = spkiArray.slice(rsaKeyOffset);
  
  // Parse RSA key to get n (modulus) and e (exponent)
  const parser = new DataView(rsaKeyData.buffer, rsaKeyData.byteOffset);
  let offset = 0;
  
  // Skip SEQUENCE tag and length
  if (parser.getUint8(offset) === 0x30) {
    offset++;
    if (parser.getUint8(offset) & 0x80) {
      const lengthBytes = parser.getUint8(offset) & 0x7f;
      offset += lengthBytes + 1;
    } else {
      offset += 2;
    }
  }
  
  // Read modulus (n)
  if (parser.getUint8(offset) === 0x02) { // INTEGER tag
    offset++;
    let nLength = parser.getUint8(offset);
    offset++;
    if (nLength & 0x80) {
      const lengthBytes = nLength & 0x7f;
      nLength = 0;
      for (let i = 0; i < lengthBytes; i++) {
        nLength = (nLength << 8) | parser.getUint8(offset + i);
      }
      offset += lengthBytes;
    }
    
    // Skip leading zero if present
    if (parser.getUint8(offset) === 0x00) {
      offset++;
      nLength--;
    }
    
    const modulus = rsaKeyData.slice(offset, offset + nLength);
    offset += nLength;
    
    // Read exponent (e)
    if (parser.getUint8(offset) === 0x02) { // INTEGER tag
      offset++;
      let eLength = parser.getUint8(offset);
      offset++;
      if (eLength & 0x80) {
        const lengthBytes = eLength & 0x7f;
        eLength = 0;
        for (let i = 0; i < lengthBytes; i++) {
          eLength = (eLength << 8) | parser.getUint8(offset + i);
        }
        offset += lengthBytes;
      }
      
      const exponent = rsaKeyData.slice(offset, offset + eLength);
      
      // Build SSH RSA key format
      const keyTypeStr = "ssh-rsa";
      const keyTypeBytes = new TextEncoder().encode(keyTypeStr);
      
      // Calculate total length
      const totalLength = 4 + keyTypeBytes.length + 4 + exponent.length + 4 + modulus.length;
      const sshKeyBuffer = new ArrayBuffer(totalLength);
      const view = new DataView(sshKeyBuffer);
      const uint8View = new Uint8Array(sshKeyBuffer);
      
      let pos = 0;
      
      // Write key type length and data
      view.setUint32(pos, keyTypeBytes.length, false);
      pos += 4;
      uint8View.set(keyTypeBytes, pos);
      pos += keyTypeBytes.length;
      
      // Write exponent length and data
      view.setUint32(pos, exponent.length, false);
      pos += 4;
      uint8View.set(exponent, pos);
      pos += exponent.length;
      
      // Write modulus length and data
      view.setUint32(pos, modulus.length, false);
      pos += 4;
      uint8View.set(modulus, pos);
      
      // Encode to base64
      const base64Key = base64Encode(uint8View);
      return `ssh-rsa ${base64Key} amazon-vendor-${keyType}@integration`;
    }
  }
  
  // Fallback to simpler method if parsing fails
  const pemKey = arrayBufferToPem(exported, 'PUBLIC');
  const base64Content = pemKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  
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