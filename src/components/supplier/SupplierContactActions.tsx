import { Button } from '@/components/ui/button';
import { MessageCircle, MessageSquare, Mail, Phone, ExternalLink, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface SupplierContactActionsProps {
  whatsappNumber?: string;
  wechatId?: string;
  email?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  supplierName: string;
}

export const SupplierContactActions = ({
  whatsappNumber,
  wechatId,
  email,
  phoneNumber,
  websiteUrl,
  supplierName,
}: SupplierContactActionsProps) => {
  const { toast } = useToast();
  const [whatsappClicked, setWhatsappClicked] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const handleWhatsApp = () => {
    if (!whatsappNumber || cooldownSeconds > 0) return;
    
    // Remove all non-numeric characters to get clean number
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    
    console.log('🔍 WhatsApp Debug - Original number:', whatsappNumber);
    console.log('🔍 WhatsApp Debug - Clean number:', cleanNumber);
    
    // Ensure number has country code
    if (cleanNumber.length < 10) {
      console.error('❌ WhatsApp Debug - Invalid number length:', cleanNumber.length);
      toast({
        title: 'Invalid phone number',
        description: 'Please ensure the WhatsApp number includes the country code',
        variant: 'destructive',
      });
      return;
    }
    
    const message = encodeURIComponent(`Hello ${supplierName}, I'm reaching out regarding our business collaboration.`);
    
    // Detect if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log('🔍 WhatsApp Debug - Is mobile:', isMobile);
    
    // Use alternative WhatsApp Web URL format (better rate limits)
    const url = isMobile 
      ? `whatsapp://send?phone=${cleanNumber}&text=${message}`
      : `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${message}`;
    
    console.log('🔍 WhatsApp Debug - Generated URL:', url);
    
    // Create temporary anchor and click it (avoids popup blockers)
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    
    console.log('🔍 WhatsApp Debug - Link created, attempting click...');
    link.click();
    document.body.removeChild(link);
    console.log('✅ WhatsApp Debug - Click executed, link removed');
    
    // Show success feedback
    setWhatsappClicked(true);
    setTimeout(() => setWhatsappClicked(false), 3000);
    
    // Start 60-second cooldown to prevent rate limiting
    setCooldownSeconds(60);
    const cooldownInterval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    toast({
      title: 'Opening WhatsApp',
      description: `Starting conversation with ${supplierName}`,
    });
  };
  
  const getWhatsAppUrl = () => {
    if (!whatsappNumber) return '';
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent(`Hello ${supplierName}, I'm reaching out regarding our business collaboration.`);
    return `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${message}`;
  };

  const copyWhatsAppNumber = () => {
    if (!whatsappNumber) return;
    
    navigator.clipboard.writeText(whatsappNumber);
    toast({
      title: 'WhatsApp number copied',
      description: `${whatsappNumber} has been copied to clipboard`,
    });
  };

  const handleWeChat = () => {
    if (!wechatId) return;
    
    navigator.clipboard.writeText(wechatId);
    toast({
      title: 'WeChat ID copied',
      description: `${wechatId} has been copied to clipboard`,
    });
  };

  const handleEmail = () => {
    if (!email) return;
    
    const subject = encodeURIComponent(`Inquiry for ${supplierName}`);
    const body = encodeURIComponent(`Hello,\n\nI would like to discuss potential collaboration opportunities.\n\nBest regards`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handlePhone = () => {
    if (!phoneNumber) return;
    
    // Try to open phone dialer on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      // Copy to clipboard on desktop
      navigator.clipboard.writeText(phoneNumber);
      toast({
        title: 'Phone number copied',
        description: `${phoneNumber} has been copied to clipboard`,
      });
    }
  };

  const handleWebsite = () => {
    if (!websiteUrl) return;
    
    let url = websiteUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-3">
      {whatsappNumber && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>{whatsappNumber}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <span>Or click directly: </span>
            <a 
              href={getWhatsAppUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Open WhatsApp Web
            </a>
          </div>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {whatsappNumber && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              disabled={cooldownSeconds > 0}
              className="gap-2"
            >
              {cooldownSeconds > 0 ? (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Wait {cooldownSeconds}s
                </>
              ) : whatsappClicked ? (
                <>
                  <Check className="h-4 w-4" />
                  Opened
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyWhatsAppNumber}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Number
            </Button>
          </>
        )}
      
      {wechatId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleWeChat}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          WeChat
          <Copy className="h-3 w-3" />
        </Button>
      )}
      
      {email && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleEmail}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          Email
        </Button>
      )}
      
      {phoneNumber && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePhone}
          className="gap-2"
        >
          <Phone className="h-4 w-4" />
          Call
        </Button>
      )}
      
      {websiteUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleWebsite}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Website
        </Button>
      )}
      </div>
    </div>
  );
};
