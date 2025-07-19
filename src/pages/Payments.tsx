import { useState } from 'react';
import { PaymentsManager } from '@/components/PaymentsManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Shield, TrendingUp, AlertCircle, CreditCard, DollarSign, Activity, Eye } from 'lucide-react';

export default function PaymentsPage() {
  const [aiMetrics] = useState({
    fraudDetection: 99.2,
    cashFlowAccuracy: 94.7,
    timesSaved: "1.8hrs",
    riskLevel: "Low",
    processedToday: 247,
    flaggedTransactions: 3
  });

  const aiCapabilities = [
    {
      title: "Fraud Detection AI",
      description: "Real-time transaction analysis and risk assessment",
      icon: Shield,
      accuracy: 99.2,
      color: "text-green-500"
    },
    {
      title: "Cash Flow Prediction",
      description: "ML-powered cash flow forecasting and planning",
      icon: TrendingUp,
      accuracy: 94.7,
      color: "text-blue-500"
    },
    {
      title: "Pattern Recognition",
      description: "Intelligent detection of payment patterns and anomalies",
      icon: Eye,
      accuracy: 96.1,
      color: "text-purple-500"
    }
  ];

  const recentAIAlerts = [
    {
      type: "fraud",
      message: "Suspicious transaction pattern detected - flagged for review",
      time: "2 min ago",
      severity: "high"
    },
    {
      type: "prediction",
      message: "Cash flow forecast updated - expecting 15% increase next week", 
      time: "5 min ago",
      severity: "info"
    },
    {
      type: "optimization",
      message: "Payment processing fees can be reduced by $127/month",
      time: "1 hour ago", 
      severity: "low"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        {/* AI-Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <CreditCard className="w-8 h-8 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-primary rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                AI Payment Intelligence Center
              </h1>
              <p className="text-muted-foreground text-lg">
                Advanced payment analytics with fraud detection and cash flow predictions
              </p>
            </div>
            <Badge className="ml-auto bg-gradient-primary text-primary-foreground px-4 py-2">
              <Brain className="w-4 h-4 mr-2" />
              AI Protected
            </Badge>
          </div>

          {/* AI Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="glass-container border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Fraud Detection</p>
                    <p className="text-2xl font-bold text-green-500">{aiMetrics.fraudDetection}%</p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500/60" />
                </div>
                <Progress value={aiMetrics.fraudDetection} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className="glass-container border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cash Flow AI</p>
                    <p className="text-2xl font-bold text-blue-500">{aiMetrics.cashFlowAccuracy}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500/60" />
                </div>
                <Progress value={aiMetrics.cashFlowAccuracy} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className="glass-container border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Processed Today</p>
                    <p className="text-2xl font-bold text-orange-500">{aiMetrics.processedToday}</p>
                  </div>
                  <Activity className="w-8 h-8 text-orange-500/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Flagged</p>
                    <p className="text-2xl font-bold text-red-500">{aiMetrics.flaggedTransactions}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500/60" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Capabilities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {aiCapabilities.map((capability, index) => (
              <Card key={index} className="glass-container border-primary/20 hover:shadow-glow transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <capability.icon className={`w-6 h-6 ${capability.color}`} />
                    <Badge variant="secondary" className="text-xs">
                      {capability.accuracy}% Accurate
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{capability.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {capability.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={capability.accuracy} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Real-time AI Alerts */}
          <Card className="glass-container border-primary/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Real-time AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAIAlerts.map((alert, index) => (
                  <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${
                    alert.severity === 'high' ? 'bg-red-500/10 border-red-500/20' :
                    alert.severity === 'info' ? 'bg-blue-500/10 border-blue-500/20' :
                    'bg-yellow-500/10 border-yellow-500/20'
                  }`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      alert.severity === 'high' ? 'bg-red-500' :
                      alert.severity === 'info' ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <div className="flex-1">
                      <span className="text-sm">{alert.message}</span>
                      <span className="text-xs text-muted-foreground ml-2">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <PaymentsManager />
      </div>
    </div>
  );
}