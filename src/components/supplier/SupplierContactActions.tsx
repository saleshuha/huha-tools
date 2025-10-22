import { Button } from '@/components/ui/button';
import { MessageCircle, MessageSquare, Mail, Phone, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const getWhatsAppUrl = () => {
    if (!whatsappNumber) return '';
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    
    // Validate number has country code
    if (cleanNumber.length < 10) {
      return '';
    }
    
    // Use official WhatsApp API endpoint (better rate limits and compatibility)
    return `https://api.whatsapp.com/send?phone=${cleanNumber}`;
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          <span>{whatsappNumber}</span>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {whatsappNumber && getWhatsAppUrl() && (
          <>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Open WhatsApp
              </a>
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
