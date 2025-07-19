import { useState } from 'react';
import { Inventory } from '@/components/Inventory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, TrendingUp, AlertTriangle, Package, BarChart3, Lightbulb, Target } from 'lucide-react';

export default function InventoryPage() {
  const [aiInsights] = useState({
    predictions: {
      stockOut: 3,
      reorderSoon: 7,
      overstock: 2
    },
    efficiency: 94,
    timesSaved: "2.3hrs",
    accuracyRate: 96.8
  });

  const aiFeatures = [
    {
      title: "Smart Stock Prediction",
      description: "AI predicts when items will run out of stock",
      icon: TrendingUp,
      status: "Active",
      color: "text-green-500"
    },
    {
      title: "Demand Forecasting",
      description: "Machine learning analyzes sales patterns",
      icon: BarChart3,
      status: "Learning",
      color: "text-blue-500"
    },
    {
      title: "Auto-Reorder Alerts",
      description: "Intelligent alerts for optimal reorder timing",
      icon: AlertTriangle,
      status: "Monitoring",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        {/* AI Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Package className="w-8 h-8 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-primary rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                AI Inventory Intelligence Hub
              </h1>
              <p className="text-muted-foreground text-lg">
                Smart inventory management with predictive analytics and automated insights
              </p>
            </div>
            <Badge className="ml-auto bg-gradient-primary text-primary-foreground px-4 py-2">
              <Brain className="w-4 h-4 mr-2" />
              AI Enhanced
            </Badge>
          </div>

          {/* AI Performance Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="glass-container border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">AI Accuracy</p>
                    <p className="text-2xl font-bold text-primary">{aiInsights.accuracyRate}%</p>
                  </div>
                  <Target className="w-8 h-8 text-primary/60" />
                </div>
                <Progress value={aiInsights.accuracyRate} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className="glass-container border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Time Saved</p>
                    <p className="text-2xl font-bold text-green-500">{aiInsights.timesSaved}</p>
                  </div>
                  <Zap className="w-8 h-8 text-green-500/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Reorder Alerts</p>
                    <p className="text-2xl font-bold text-orange-500">{aiInsights.predictions.reorderSoon}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Stock-out Risk</p>
                    <p className="text-2xl font-bold text-red-500">{aiInsights.predictions.stockOut}</p>
                  </div>
                  <Package className="w-8 h-8 text-red-500/60" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {aiFeatures.map((feature, index) => (
              <Card key={index} className="glass-container border-primary/20 hover:shadow-glow transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    <Badge variant="secondary" className="text-xs">
                      {feature.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* AI Insights Panel */}
          <Card className="glass-container border-primary/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                AI Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">AI detected optimal reorder point for ASIN B07XYZ123 - consider reordering in 3 days</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Sales velocity increased 23% for electronics category - adjust stock levels accordingly</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Seasonal pattern detected - winter items showing early demand spike</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Inventory />
      </div>
    </div>
  );
}