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

  const handleWhatsApp = () => {
    if (!whatsappNumber) return;
    
    // Remove all non-numeric characters to get clean number
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    
    // Ensure number has country code
    if (cleanNumber.length < 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please ensure the WhatsApp number includes the country code',
        variant: 'destructive',
      });
      return;
    }
    
    const message = encodeURIComponent(`Hello ${supplierName}, I'm reaching out regarding our business collaboration.`);
    
    // Always use wa.me (works on both mobile and desktop)
    const url = `https://wa.me/${cleanNumber}?text=${message}`;
    
    // Open in new window
    const whatsappWindow = window.open(url, '_blank', 'noopener,noreferrer');
    
    // Check if popup was blocked
    if (!whatsappWindow) {
      toast({
        title: 'Popup blocked',
        description: 'Please allow popups for this site to open WhatsApp',
        variant: 'destructive',
      });
    }
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
    <div className="flex flex-wrap gap-2">
      {whatsappNumber && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsApp}
          className="gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
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
  );
};
