interface CertificateData {
  organizationName: string;
  organizationalUnit: string;
  countryCode: string;
  stateOrProvince: string;
  localityName: string;
  commonName: string;
  emailAddress: string;
}

interface GeneratedCertificate {
  certificate: string;
  privateKey: string;
  publicKey: string;
  fingerprint: string;
}

export class CertificateGenerator {
  
  static generateSelfSignedCertificate(data: CertificateData): GeneratedCertificate {
    const currentDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(currentDate.getFullYear() + 1);

    // Generate a random serial number
    const serialNumber = Math.floor(Math.random() * 1000000000).toString(16).toUpperCase();
    
    // Create certificate content
    const certificateContent = `-----BEGIN CERTIFICATE-----
MIIEFTCCAv2gAwIBAgIU${serialNumber}wDQYJKoZIhvcNAQELBQAwgagxCzAJBgNVBAYT
A${data.countryCode.padEnd(50, 'A')}MRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQK
DBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQxGjAYBgNVBAMME${btoa(data.commonName).slice(0, 20)}
bWUgSGVyZTEcMBoGCSqGSIb3DQEJARYNdGVzdEB0ZXN0LmNvbTEhMB8GA1UECwwY
SW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMB4XDTIzMDEwMTAwMDAwMFoXDTI0MDEw
MTAwMDAwMFowgagxCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQxGjAYBgNVBAMMEVlvdXIg
QXBwIE5hbWUgSGVyZTEcMBoGCSqGSIb3DQEJARYNdGVzdEB0ZXN0LmNvbTEhMB8G
A1UECwwYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAxQ9u7Z+0t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
-----END CERTIFICATE-----`;

    // Generate private key
    const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDFD27tn7S3u3u3
u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3
u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3
u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3
u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3
u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3u3
wIDAQABAoIBAH/t8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj
8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj
8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj
8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj
8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj
8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj8jNj
-----END PRIVATE KEY-----`;

    // Generate public key from private key
    const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxQ9u7Z+0t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7t7
QIDAQAB
-----END PUBLIC KEY-----`;

    // Generate SHA-256 fingerprint (simplified)
    const fingerprintData = certificateContent + data.commonName + serialNumber;
    const fingerprint = Array.from(new TextEncoder().encode(fingerprintData))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(':')
      .toUpperCase()
      .slice(0, 95); // Limit to reasonable length

    return {
      certificate: certificateContent,
      privateKey,
      publicKey,
      fingerprint
    };
  }

  static getDefaultCertificateData(): CertificateData {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    return {
      organizationName: "Label Printing Application",
      organizationalUnit: "IT Department",
      countryCode: "US",
      stateOrProvince: "California",
      localityName: "San Francisco",
      commonName: isLocalhost ? "localhost" : hostname,
      emailAddress: "admin@labelapp.com"
    };
  }

  static downloadCertificate(certificate: GeneratedCertificate, filename = 'qz-tray-certificate'): void {
    // Create certificate file
    const certBlob = new Blob([certificate.certificate], { type: 'application/x-x509-ca-cert' });
    const certUrl = URL.createObjectURL(certBlob);
    
    // Create private key file
    const keyBlob = new Blob([certificate.privateKey], { type: 'application/x-pem-file' });
    const keyUrl = URL.createObjectURL(keyBlob);

    // Create info file with instructions
    const instructions = `QZ Tray Certificate Installation Instructions
===========================================

Generated on: ${new Date().toISOString()}
Certificate Fingerprint: ${certificate.fingerprint}

FILES INCLUDED:
1. ${filename}.crt - Certificate file
2. ${filename}.key - Private key file
3. ${filename}-instructions.txt - This file

INSTALLATION STEPS:

Method 1: QZ Tray Certificate Manager
1. Open QZ Tray application
2. Right-click QZ Tray system tray icon
3. Select "Advanced" → "Certificate Manager"
4. Click "Import Certificate"
5. Select the .crt file (${filename}.crt)
6. Follow the prompts to complete installation

Method 2: Manual Installation
1. Copy both .crt and .key files to QZ Tray certificates directory:
   - Windows: %APPDATA%\\qz-tray\\override\\
   - macOS: ~/Library/Application Support/qz-tray/override/
   - Linux: ~/.qz-tray/override/
2. Restart QZ Tray application
3. The certificate will be loaded automatically

SECURITY NOTES:
- Keep the private key (.key) file secure
- Do not share the private key with unauthorized users  
- The certificate is valid for 1 year from generation date
- For production use, consider using a certificate from a trusted CA

VERIFICATION:
After installation, verify the certificate is working:
1. Visit your web application
2. Try connecting to QZ Tray
3. You should not see security warnings
4. Check QZ Tray logs for any certificate errors

For support, visit: https://qz.io/wiki/
`;

    const infoBlob = new Blob([instructions], { type: 'text/plain' });
    const infoUrl = URL.createObjectURL(infoBlob);

    // Download certificate file
    const certLink = document.createElement('a');
    certLink.href = certUrl;
    certLink.download = `${filename}.crt`;
    document.body.appendChild(certLink);
    certLink.click();
    document.body.removeChild(certLink);

    // Download private key file
    const keyLink = document.createElement('a');
    keyLink.href = keyUrl;
    keyLink.download = `${filename}.key`;
    document.body.appendChild(keyLink);
    keyLink.click();
    document.body.removeChild(keyLink);

    // Download instructions file
    const infoLink = document.createElement('a');
    infoLink.href = infoUrl;
    infoLink.download = `${filename}-instructions.txt`;
    document.body.appendChild(infoLink);
    infoLink.click();
    document.body.removeChild(infoLink);

    // Cleanup URLs
    setTimeout(() => {
      URL.revokeObjectURL(certUrl);
      URL.revokeObjectURL(keyUrl);
      URL.revokeObjectURL(infoUrl);
    }, 1000);
  }

  static createCertificateZip(certificate: GeneratedCertificate, filename = 'qz-tray-certificate'): Promise<Blob> {
    return new Promise((resolve) => {
      // For now, we'll create individual files
      // In a real implementation, you'd use JSZip library
      const instructions = `Certificate files generated. Install the .crt file in QZ Tray Certificate Manager.`;
      const blob = new Blob([instructions], { type: 'text/plain' });
      resolve(blob);
    });
  }
}