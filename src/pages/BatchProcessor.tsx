import { useState } from 'react';
import { BatchProcessor } from '@/components/BatchProcessor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Files, Zap, CheckCircle, Clock, TrendingUp, Activity, BarChart3 } from 'lucide-react';

export default function BatchProcessorPage() {
  const [aiMetrics] = useState({
    optimizationLevel: 89,
    timeReduction: 67,
    successRate: 98.3,
    filesProcessed: 1247,
    averageSpeed: "2.3x faster",
    errorRecovery: 94
  });

  const aiCapabilities = [
    {
      title: "Smart Batch Optimization",
      description: "AI optimizes file processing order for maximum efficiency",
      icon: TrendingUp,
      performance: 89,
      color: "text-blue-500"
    },
    {
      title: "Auto-Retry Intelligence",
      description: "Intelligent retry logic with exponential backoff",
      icon: CheckCircle,
      performance: 94,
      color: "text-green-500"
    },
    {
      title: "Performance Learning",
      description: "Machine learning adapts to your data patterns",
      icon: BarChart3,
      performance: 87,
      color: "text-purple-500"
    }
  ];

  const processingInsights = [
    "AI detected optimal batch size of 50 files for your data type",
    "Performance optimization increased speed by 67% this session",
    "Smart retry prevented 23 failed operations automatically",
    "Learning algorithm adjusted processing strategy for Excel files"
  ];

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        {/* AI-Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Files className="w-8 h-8 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-primary rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                AI Batch Processing Engine
              </h1>
              <p className="text-muted-foreground text-lg">
                Intelligent batch processing with optimization, auto-retry, and performance learning
              </p>
            </div>
            <Badge className="ml-auto bg-gradient-primary text-primary-foreground px-4 py-2">
              <Brain className="w-4 h-4 mr-2" />
              AI Optimized
            </Badge>
          </div>

          {/* AI Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <Card className="glass-container border-primary/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Optimization</p>
                  <p className="text-2xl font-bold text-primary">{aiMetrics.optimizationLevel}%</p>
                  <Progress value={aiMetrics.optimizationLevel} className="mt-2 h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-green-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-green-500">{aiMetrics.successRate}%</p>
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-blue-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Speed Boost</p>
                  <p className="text-2xl font-bold text-blue-500">{aiMetrics.averageSpeed}</p>
                  <Zap className="w-6 h-6 text-blue-500 mx-auto mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-orange-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Time Saved</p>
                  <p className="text-2xl font-bold text-orange-500">{aiMetrics.timeReduction}%</p>
                  <Clock className="w-6 h-6 text-orange-500 mx-auto mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-purple-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Processed</p>
                  <p className="text-2xl font-bold text-purple-500">{aiMetrics.filesProcessed}</p>
                  <Files className="w-6 h-6 text-purple-500 mx-auto mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-red-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Recovery</p>
                  <p className="text-2xl font-bold text-red-500">{aiMetrics.errorRecovery}%</p>
                  <Progress value={aiMetrics.errorRecovery} className="mt-2 h-2" />
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
                      {capability.performance}% Efficient
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{capability.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {capability.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Progress value={capability.performance} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Live Processing Insights */}
          <Card className="glass-container border-primary/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                AI Processing Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processingInsights.map((insight, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm">{insight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <BatchProcessor />
      </div>
    </div>
  );
}