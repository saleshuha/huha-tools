import { useState } from 'react';
import { ExcelMapper } from '@/components/ExcelMapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, FileText, CheckCircle, AlertTriangle, Zap, Target, Activity } from 'lucide-react';

const ExcelMapperPage = () => {
  const [aiStats] = useState({
    mappingAccuracy: 92,
    timesSaved: "3.2hrs",
    errorsDetected: 14,
    autoMappedColumns: 87,
    confidenceLevel: 94.5
  });

  const aiFeatures = [
    {
      title: "Smart Column Detection",
      description: "AI automatically identifies and suggests column mappings",
      icon: Target,
      status: "Active",
      accuracy: 92
    },
    {
      title: "Error Prevention AI",
      description: "Proactive detection of data inconsistencies and errors",
      icon: AlertTriangle,
      status: "Monitoring",
      accuracy: 96
    },
    {
      title: "Auto-Validation Engine",
      description: "Intelligent validation of mapped data integrity",
      icon: CheckCircle,
      status: "Validating",
      accuracy: 94
    }
  ];

  const recentAIInsights = [
    "AI detected 87% column match confidence - mappings suggested",
    "Data validation found 3 potential errors in source file",
    "Smart formatting applied to 15 mismatched data types",
    "AI optimization reduced processing time by 34%"
  ];

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="glass-container mx-6 my-4 p-8 animate-fade-in">
        {/* AI-Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <FileText className="w-8 h-8 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-primary rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                AI Excel Mapper Studio
              </h1>
              <p className="text-muted-foreground text-lg">
                Intelligent column mapping with AI-powered validation and error detection
              </p>
            </div>
            <Badge className="ml-auto bg-gradient-primary text-primary-foreground px-4 py-2">
              <Brain className="w-4 h-4 mr-2" />
              AI Enhanced
            </Badge>
          </div>

          {/* AI Performance Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="glass-container border-primary/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Mapping Accuracy</p>
                  <p className="text-2xl font-bold text-primary">{aiStats.mappingAccuracy}%</p>
                  <Progress value={aiStats.mappingAccuracy} className="mt-2 h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-green-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Time Saved</p>
                  <p className="text-2xl font-bold text-green-500">{aiStats.timesSaved}</p>
                  <Zap className="w-6 h-6 text-green-500 mx-auto mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-orange-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Errors Detected</p>
                  <p className="text-2xl font-bold text-orange-500">{aiStats.errorsDetected}</p>
                  <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-blue-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Auto-Mapped</p>
                  <p className="text-2xl font-bold text-blue-500">{aiStats.autoMappedColumns}</p>
                  <Target className="w-6 h-6 text-blue-500 mx-auto mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-container border-purple-500/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-bold text-purple-500">{aiStats.confidenceLevel}%</p>
                  <Progress value={aiStats.confidenceLevel} className="mt-2 h-2" />
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
                    <feature.icon className="w-6 h-6 text-primary" />
                    <Badge variant="secondary" className="text-xs">
                      {feature.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Progress value={feature.accuracy} className="flex-1 h-2" />
                    <span className="text-sm font-medium">{feature.accuracy}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Insights Panel */}
          <Card className="glass-container border-primary/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Live AI Processing Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAIInsights.map((insight, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm">{insight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <ExcelMapper />
      </div>
    </div>
  );
};

export default ExcelMapperPage;