import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy,
  Settings,
  HelpCircle,
  FileDown,
  Key,
  Lock 
} from 'lucide-react';
import { toast } from 'sonner';
import { CertificateGenerator } from '@/utils/certificate-generator';
import { QZCertificateManager } from '@/utils/qz-certificate-manager';

export const QZTraySetup: React.FC = () => {
  const [qzInstalled, setQzInstalled] = useState(false);
  const [qzRunning, setQzRunning] = useState(false);
  const [websiteTrusted, setWebsiteTrusted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [certificateData, setCertificateData] = useState(CertificateGenerator.getDefaultCertificateData());
  const [certificateStatus, setCertificateStatus] = useState(QZCertificateManager.getCertificateStatus());

  useEffect(() => {
    checkQZStatus();
    updateCertificateStatus();
  }, []);

  const updateCertificateStatus = () => {
    setCertificateStatus(QZCertificateManager.getCertificateStatus());
  };

  const checkQZStatus = async () => {
    setChecking(true);
    
    try {
      // First, check if QZ Tray script is loaded
      let qz = (window as any).qz;
      
      if (!qz) {
        // Try to load QZ Tray script
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.5/qz-tray.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 5000); // 5 second timeout
        });
        
        qz = (window as any).qz;
      }
      
      if (qz) {
        setQzInstalled(true);
        console.log('QZ Tray script loaded successfully');
        
        // Check if QZ Tray is running by attempting connection
        try {
          if (qz.websocket.isActive()) {
            setQzRunning(true);
            setWebsiteTrusted(true);
            console.log('QZ Tray already connected');
          } else {
            console.log('Attempting to connect to QZ Tray...');
            await qz.websocket.connect();
            setQzRunning(true);
            setWebsiteTrusted(true);
            console.log('QZ Tray connected successfully');
            toast.success('QZ Tray connected successfully!');
          }
        } catch (connectionError: any) {
          console.error('QZ Tray connection failed:', connectionError);
          setQzRunning(false);
          setWebsiteTrusted(false);
          
          if (connectionError.message && connectionError.message.includes('Unable to establish connection')) {
            toast.error('QZ Tray is not running. Please start QZ Tray and try again.');
          } else {
            toast.error('QZ Tray connection failed. Check if it\'s running and trusted.');
          }
        }
      } else {
        console.log('QZ Tray script not available');
        setQzInstalled(false);
        setQzRunning(false);
        setWebsiteTrusted(false);
        toast.error('QZ Tray is not installed or accessible.');
      }
    } catch (error) {
      console.error('QZ Tray detection failed:', error);
      setQzInstalled(false);
      setQzRunning(false);
      setWebsiteTrusted(false);
      toast.error('Failed to detect QZ Tray. Please check installation.');
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const generateAndDownloadCertificate = async () => {
    setGenerating(true);
    try {
      const certificate = CertificateGenerator.generateSelfSignedCertificate(certificateData);
      CertificateGenerator.downloadCertificate(certificate, 'qz-tray-certificate');
      
      // Also store the certificate for future use
      QZCertificateManager.importGeneratedCertificate(certificate, certificateData.commonName);
      updateCertificateStatus();
      
      toast.success('Certificate generated, downloaded, and stored for future use!');
    } catch (error) {
      toast.error('Failed to generate certificate. Please try again.');
      console.error('Certificate generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const clearStoredCertificate = () => {
    QZCertificateManager.clearStoredCertificate();
    updateCertificateStatus();
    toast.success('Stored certificate cleared');
  };

  const resetDevCertificate = () => {
    QZCertificateManager.clearDevCertificate();
    updateCertificateStatus();
    toast.success('Development certificate reset');
  };

  const updateCertificateData = (field: keyof typeof certificateData, value: string) => {
    setCertificateData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDemoKeysUpload = async () => {
    try {
      const certificate = localStorage.getItem('temp-demo-certificate');
      const privateKey = localStorage.getItem('temp-demo-private-key');
      const certName = localStorage.getItem('temp-demo-cert-name');
      const keyName = localStorage.getItem('temp-demo-key-name');
      
      if (!certificate || !privateKey) {
        toast.error('Both certificate and private key files are required');
        return;
      }

      // Create a simple fingerprint from the certificate content
      const fingerprint = btoa(certificate.slice(0, 100)).replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
      
      // Extract common name from certificate or use a default
      let commonName = window.location.hostname;
      try {
        const certMatch = certificate.match(/CN=([^,\n]+)/);
        if (certMatch) {
          commonName = certMatch[1].trim();
        }
      } catch (e) {
        console.log('Could not extract CN from certificate, using hostname');
      }

      // Create stored certificate object
      const storedCert = {
        certificate: certificate.trim(),
        privateKey: privateKey.trim(),
        fingerprint,
        commonName,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      };

      // Store the certificate
      QZCertificateManager.storeCertificate(storedCert);
      updateCertificateStatus();

      // Clean up temporary storage
      localStorage.removeItem('temp-demo-certificate');
      localStorage.removeItem('temp-demo-private-key');
      localStorage.removeItem('temp-demo-cert-name');
      localStorage.removeItem('temp-demo-key-name');

      toast.success(`Demo certificate installed successfully! Certificate: ${certName}, Key: ${keyName}`);
    } catch (error) {
      console.error('Error installing demo certificate:', error);
      toast.error('Failed to install demo certificate. Please try again.');
    }
  };

  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.protocol === 'http:';

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          QZ Tray Setup & Trust Configuration
        </CardTitle>
        <p className="text-muted-foreground">
          Configure QZ Tray for secure label printing with our application
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="status">Status Check</TabsTrigger>
            <TabsTrigger value="install">Installation</TabsTrigger>
            <TabsTrigger value="demo">Demo Keys</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="certificate">Generate</TabsTrigger>
            <TabsTrigger value="trust">Trust Setup</TabsTrigger>
            <TabsTrigger value="troubleshoot">Troubleshooting</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">System Status</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={checkQZStatus} 
                  disabled={checking}
                  variant="outline"
                  size="sm"
                >
                  {checking ? 'Checking...' : 'Refresh Status'}
                </Button>
                {qzInstalled && !qzRunning && (
                  <Button 
                    onClick={async () => {
                      const qz = (window as any).qz;
                      if (qz) {
                        try {
                          await qz.websocket.connect();
                          setQzRunning(true);
                          setWebsiteTrusted(true);
                          toast.success('Successfully connected to QZ Tray!');
                        } catch (error) {
                          toast.error('Failed to connect. Make sure QZ Tray is running.');
                        }
                      }
                    }}
                    size="sm"
                    variant="default"
                  >
                    Connect Now
                  </Button>
                )}
              </div>
            </div>
            
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${qzInstalled ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">QZ Tray Installed</span>
                </div>
                <Badge variant={qzInstalled ? 'default' : 'destructive'}>
                  {qzInstalled ? 'Yes' : 'No'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${qzRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">QZ Tray Running</span>
                </div>
                <Badge variant={qzRunning ? 'default' : 'destructive'}>
                  {qzRunning ? 'Yes' : 'No'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${websiteTrusted ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="font-medium">Website Trusted</span>
                </div>
                <Badge variant={websiteTrusted ? 'default' : 'secondary'}>
                  {websiteTrusted ? 'Yes' : 'Pending'}
                </Badge>
              </div>
            </div>

            {isDevelopment && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Development Mode Detected:</strong> You're running on localhost. 
                  QZ Tray will show security warnings for untrusted certificates in development.
                  This is normal and expected behavior.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="install" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">QZ Tray Installation</h3>
              
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Download QZ Tray
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Download and install QZ Tray from the official website
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer">
                        Download
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Installation Steps:</h4>
                  <ol className="text-sm space-y-1 text-muted-foreground ml-4">
                    <li>1. Download QZ Tray for your operating system</li>
                    <li>2. Run the installer with administrator privileges</li>
                    <li>3. Start QZ Tray after installation</li>
                    <li>4. Look for the QZ Tray icon in your system tray</li>
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="demo" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5 text-green-600" />
                QZ Tray Demo Keys (Recommended for Development)
              </h3>
              
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>Best Solution:</strong> QZ Tray can generate trusted demo certificates that eliminate signing requests completely. 
                  These work only on your computer but provide silent printing for development.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <h4 className="font-medium mb-3 text-blue-800 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Generate Demo Keys in QZ Tray
                  </h4>
                  <div className="space-y-3">
                    <ol className="text-sm space-y-2 text-blue-700">
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                        <span>Right-click the QZ Tray icon in your system tray</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                        <span>Select <strong>Advanced → Site Manager</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                        <span>Click the <strong>+</strong> sign and select <strong>Create New</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
                        <span>Click <strong>"Yes"</strong> to create the keys</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">5</span>
                        <span>Click <strong>"Yes"</strong> to automatically install</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">6</span>
                        <span>Click <strong>"Yes"</strong> to copy keys to override.crt</span>
                      </li>
                    </ol>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <h4 className="font-medium mb-2 text-yellow-800 flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    What This Creates
                  </h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <p>• A folder named <strong>"QZ Tray Demo Cert"</strong> will appear on your desktop</p>
                    <p>• Contains <code>digital-certificate.txt</code> and <code>private-key.pem</code></p>
                    <p>• These keys are automatically trusted by your QZ Tray installation</p>
                    <p>• Eliminates all signing requests for development</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                    Using the Demo Keys (Optional Upload)
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      The demo keys work automatically once generated. If you want to implement server-side signing 
                      for production, you can upload the generated files:
                    </p>
                    <div className="grid gap-2 mt-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          accept=".txt,.pem" 
                          className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const text = await file.text();
                                // Store the certificate temporarily until private key is also uploaded
                                localStorage.setItem('temp-demo-certificate', text);
                                localStorage.setItem('temp-demo-cert-name', file.name);
                                toast.success(`Certificate ${file.name} loaded`);
                                
                                // Check if we have both files now
                                const privateKey = localStorage.getItem('temp-demo-private-key');
                                if (privateKey) {
                                  await handleDemoKeysUpload();
                                }
                              } catch (error) {
                                toast.error(`Failed to read ${file.name}`);
                              }
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">Upload digital-certificate.txt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          accept=".pem" 
                          className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const text = await file.text();
                                // Store the private key temporarily until certificate is also uploaded
                                localStorage.setItem('temp-demo-private-key', text);
                                localStorage.setItem('temp-demo-key-name', file.name);
                                toast.success(`Private key ${file.name} loaded`);
                                
                                // Check if we have both files now
                                const certificate = localStorage.getItem('temp-demo-certificate');
                                if (certificate) {
                                  await handleDemoKeysUpload();
                                }
                              } catch (error) {
                                toast.error(`Failed to read ${file.name}`);
                              }
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">Upload private-key.pem</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Demo keys only work on the computer where they were generated. 
                    For production deployment, you'll need purchased certificates from QZ Tray or implement server-side signing.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="certificates" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Certificate Management
              </h3>
              
              <Alert className={certificateStatus.currentCertificate && !certificateStatus.isExpired ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">
                      {certificateStatus.currentCertificate 
                        ? `Active Certificate: ${certificateStatus.currentCertificate.commonName}`
                        : 'No Active Certificate'
                      }
                    </div>
                    {certificateStatus.currentCertificate && (
                      <div className="text-sm text-muted-foreground">
                        <div>Fingerprint: {certificateStatus.currentCertificate.fingerprint.slice(0, 40)}...</div>
                        <div>Expires: {new Date(certificateStatus.currentCertificate.expiresAt).toLocaleDateString()}</div>
                        {certificateStatus.isExpired && (
                          <div className="text-red-600 font-medium">⚠️ Certificate has expired</div>
                        )}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                {certificateStatus.hasBuiltInCertificate && (
                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2 text-blue-800">
                          <Settings className="h-4 w-4" />
                          Development Certificate
                        </h4>
                        <p className="text-sm text-blue-700">
                          Built-in certificate for localhost development. This provides consistent identity across sessions.
                        </p>
                        <div className="text-xs text-blue-600">
                          Domain: localhost • Status: Active
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={resetDevCertificate}
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}

                {certificateStatus.hasCustomCertificate && (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2 text-green-800">
                          <Key className="h-4 w-4" />
                          Custom Certificate
                        </h4>
                        <p className="text-sm text-green-700">
                          Your custom certificate for {certificateStatus.currentCertificate?.commonName}
                        </p>
                        <div className="text-xs text-green-600">
                          Created: {certificateStatus.currentCertificate && 
                            new Date(certificateStatus.currentCertificate.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearStoredCertificate}
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}

                {!certificateStatus.hasCustomCertificate && !certificateStatus.hasBuiltInCertificate && (
                  <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <h4 className="font-medium text-yellow-800">No Certificate Available</h4>
                        <p className="text-sm text-yellow-700">
                          Generate a certificate to eliminate signing prompts and improve security.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <h4 className="font-medium mb-2 text-blue-800">Certificate Priority Order:</h4>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Custom Certificate (if available and not expired)</li>
                  <li>2. Development Certificate (for localhost)</li>
                  <li>3. Auto-approve fallback (shows signing prompts)</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="certificate" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Generate Custom Certificate
              </h3>
              
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Generate a custom self-signed certificate for QZ Tray to eliminate trust warnings and 
                  avoid repeated permission requests. This certificate will be specifically created for your domain.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="commonName">Common Name (Domain)</Label>
                  <Input
                    id="commonName"
                    value={certificateData.commonName}
                    onChange={(e) => updateCertificateData('commonName', e.target.value)}
                    placeholder="example.com or localhost"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    value={certificateData.organizationName}
                    onChange={(e) => updateCertificateData('organizationName', e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="organizationalUnit">Department</Label>
                  <Input
                    id="organizationalUnit"
                    value={certificateData.organizationalUnit}
                    onChange={(e) => updateCertificateData('organizationalUnit', e.target.value)}
                    placeholder="IT Department"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="countryCode">Country Code</Label>
                  <Input
                    id="countryCode"
                    value={certificateData.countryCode}
                    onChange={(e) => updateCertificateData('countryCode', e.target.value)}
                    placeholder="US"
                    maxLength={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stateOrProvince">State/Province</Label>
                  <Input
                    id="stateOrProvince"
                    value={certificateData.stateOrProvince}
                    onChange={(e) => updateCertificateData('stateOrProvince', e.target.value)}
                    placeholder="California"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="localityName">City</Label>
                  <Input
                    id="localityName"
                    value={certificateData.localityName}
                    onChange={(e) => updateCertificateData('localityName', e.target.value)}
                    placeholder="San Francisco"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="emailAddress">Email Address</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    value={certificateData.emailAddress}
                    onChange={(e) => updateCertificateData('emailAddress', e.target.value)}
                    placeholder="admin@company.com"
                  />
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button 
                  onClick={generateAndDownloadCertificate}
                  disabled={generating}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4" />
                      Generate & Download Certificate
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <h4 className="font-medium mb-2 text-blue-800">After Download:</h4>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Three files will be downloaded: certificate (.crt), private key (.key), and instructions (.txt)</li>
                  <li>2. Open QZ Tray → Right-click system tray icon → Advanced → Certificate Manager</li>
                  <li>3. Click "Import Certificate" and select the .crt file</li>
                  <li>4. Follow the installation wizard and restart QZ Tray</li>
                  <li>5. Your website will now be permanently trusted</li>
                </ol>
              </div>

              {isDevelopment && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Development Note:</strong> The certificate will be generated for "{certificateData.commonName}". 
                    Make sure this matches your development domain exactly.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="trust" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Website Trust Configuration</h3>
              
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium text-blue-800">
                      Certificate Status: {certificateStatus.currentCertificate ? 'Active' : 'None'}
                    </div>
                    <div className="text-blue-700">
                      {certificateStatus.currentCertificate 
                        ? `Using ${certificateStatus.hasCustomCertificate ? 'custom' : 'development'} certificate for ${certificateStatus.currentCertificate.commonName}`
                        : 'No certificate available - QZ Tray will show signing prompts'
                      }
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <h4 className="font-medium mb-3 text-green-800">Method 1: Use Certificate (Recommended)</h4>
                  <div className="space-y-2 text-sm text-green-700">
                    <p>✅ <strong>Best option:</strong> Install a certificate to eliminate all signing prompts</p>
                    <p>• Go to the "Certificates" tab to view your current certificate status</p>
                    <p>• Development certificate is automatically created for localhost</p>
                    <p>• Generate a custom certificate for production domains</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Method 2: Manual Trust (One-time)</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. When QZ Tray shows a security dialog, click <strong>"Allow"</strong></p>
                    <p>2. <strong>IMPORTANT:</strong> Check the box <strong>"Remember this decision"</strong> before clicking Allow</p>
                    <p>3. Our website will be permanently trusted</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Method 2: Add to QZ Tray Whitelist</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Right-click the QZ Tray icon in your system tray</p>
                    <p>2. Select <strong>"Advanced"</strong> → <strong>"Site Manager"</strong></p>
                    <p>3. Click <strong>"Add Site"</strong> and enter our website URL:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="p-2 bg-muted rounded text-xs flex-1">
                        {window.location.origin}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(window.location.origin)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p>4. Set the trust level to <strong>"Allow"</strong></p>
                    <p>5. Click <strong>"Add"</strong> to save</p>
                  </div>
                </div>
                
                {isDevelopment && (
                  <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                    <h4 className="font-medium mb-3 text-yellow-800">Development Environment</h4>
                    <div className="space-y-2 text-sm text-yellow-700">
                      <p>You're in development mode. For production deployment:</p>
                      <p>• Ensure your website uses HTTPS</p>
                      <p>• Use a valid SSL certificate</p>
                      <p>• Consider code signing your QZ Tray integration</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="troubleshoot" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Common Issues & Solutions</h3>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4" />
                    QZ Tray Not Found
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Ensure QZ Tray is installed and running</p>
                    <p>• Check system tray for QZ Tray icon</p>
                    <p>• Try restarting QZ Tray application</p>
                    <p>• Verify QZ Tray is not blocked by antivirus</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4" />
                    Repeated Permission Requests
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Always check "Remember this decision" when allowing</p>
                    <p>• Add website to QZ Tray whitelist manually</p>
                    <p>• Clear QZ Tray cache and re-add website</p>
                    <p>• Ensure website URL is consistent (http vs https)</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4" />
                    Certificate Warnings
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Normal behavior for localhost/development sites</p>
                    <p>• Use HTTPS with valid certificate for production</p>
                    <p>• Consider QZ Tray enterprise licensing for better security</p>
                    <p>• Contact support for custom certificate signing</p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4" />
                    Print Jobs Failing
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Verify printer is connected and online</p>
                    <p>• Check printer drivers are installed</p>
                    <p>• Test printing from other applications</p>
                    <p>• Ensure printer supports ZPL format (for Zebra printers)</p>
                  </div>
                </div>
              </div>
              
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Still having issues?</strong> Right-click QZ Tray icon → 
                  Advanced → Log Output to view detailed error messages.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};