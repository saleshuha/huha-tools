import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HuhaTab01 } from '@/components/ui/huha-tab-01';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Supplier, SupplierContact } from '@/types/supplier';
import { SupplierContactActions } from './SupplierContactActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Star, TrendingUp, Clock, DollarSign, Package } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';

interface SupplierDetailsDialogProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupplierDetailsDialog = ({ supplier, open, onOpenChange }: SupplierDetailsDialogProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const { loadSupplierContacts } = useSuppliers();

  useEffect(() => {
    if (supplier && open) {
      loadSupplierContacts(supplier.id).then(setContacts);
    }
  }, [supplier, open]);

  if (!supplier) return null;

  const overviewContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Supplier Name:</span>
              <p className="font-medium">{supplier.supplier_name}</p>
            </div>
            {supplier.company_name && (
              <div>
                <span className="text-muted-foreground">Company Name:</span>
                <p className="font-medium">{supplier.company_name}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Country:</span>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {supplier.country}
              </p>
            </div>
            {supplier.business_type && (
              <div>
                <span className="text-muted-foreground">Business Type:</span>
                <p className="font-medium capitalize">{supplier.business_type}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {supplier.rating && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Rating:
                </span>
                <span className="font-medium">{supplier.rating.toFixed(1)} / 5.0</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Total Orders:
              </span>
              <span className="font-medium">{supplier.total_orders || 0}</span>
            </div>
            {supplier.average_delivery_days && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Avg. Delivery:
                </span>
                <span className="font-medium">{supplier.average_delivery_days} days</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Business Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          {supplier.payment_terms && (
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Payment Terms:
              </span>
              <p className="font-medium">{supplier.payment_terms}</p>
            </div>
          )}
          {supplier.minimum_order_quantity && (
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" />
                Min. Order Qty:
              </span>
              <p className="font-medium">{supplier.minimum_order_quantity}</p>
            </div>
          )}
          {supplier.lead_time_days && (
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Lead Time:
              </span>
              <p className="font-medium">{supplier.lead_time_days} days</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h4 className="text-sm font-medium mb-3">Contact Actions</h4>
        <SupplierContactActions
          supplierName={supplier.supplier_name}
          whatsappNumber={supplier.whatsapp_number}
          wechatId={supplier.wechat_id}
          email={supplier.email}
          phoneNumber={supplier.phone_number}
          websiteUrl={supplier.website_url}
        />
      </div>

      {supplier.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes}</p>
          </CardContent>
        </Card>
      )}

      {supplier.tags && supplier.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {supplier.tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const contactsContent = (
    <div className="space-y-4">
      {contacts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No contacts added yet</p>
      ) : (
        contacts.map((contact) => (
          <Card key={contact.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{contact.contact_name}</CardTitle>
                  {contact.position && (
                    <p className="text-sm text-muted-foreground">{contact.position}</p>
                  )}
                </div>
                {contact.is_primary && (
                  <Badge variant="default">Primary</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {contact.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{contact.email}</p>
                  </div>
                )}
                {contact.phone_number && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{contact.phone_number}</p>
                  </div>
                )}
                {contact.whatsapp_number && (
                  <div>
                    <span className="text-muted-foreground">WhatsApp:</span>
                    <p className="font-medium">{contact.whatsapp_number}</p>
                  </div>
                )}
                {contact.wechat_id && (
                  <div>
                    <span className="text-muted-foreground">WeChat:</span>
                    <p className="font-medium">{contact.wechat_id}</p>
                  </div>
                )}
              </div>
              {contact.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="text-sm mt-1">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const tabItems = [
    { value: 'overview', label: 'Overview', content: overviewContent },
    { value: 'contacts', label: `Contacts (${contacts.length})`, content: contactsContent },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{supplier.supplier_name}</DialogTitle>
            <div className="flex items-center gap-2">
              {supplier.is_verified && (
                <Badge variant="default">Verified</Badge>
              )}
              <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                {supplier.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <HuhaTab01
          items={tabItems}
          value={activeTab}
          onValueChange={setActiveTab}
        />
      </DialogContent>
    </Dialog>
  );
};
