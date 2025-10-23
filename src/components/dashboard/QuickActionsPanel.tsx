import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, TrendingUp, FileText, DollarSign, Download } from 'lucide-react';

export const QuickActionsPanel: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Manage Inventory',
      icon: Package,
      onClick: () => navigate('/inventory'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: 'Replenishment',
      icon: TrendingUp,
      onClick: () => navigate('/replenishment'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      label: 'View POs',
      icon: FileText,
      onClick: () => navigate('/po-tracker'),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      label: 'Track Payments',
      icon: DollarSign,
      onClick: () => navigate('/amazon-fulfillment-tracker'),
      color: 'bg-emerald-500 hover:bg-emerald-600'
    }
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg font-semibold">⚡ Quick Actions</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              onClick={action.onClick}
              className={`${action.color} text-white h-auto py-4 flex-col gap-2`}
            >
              <action.icon className="w-5 h-5" />
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
