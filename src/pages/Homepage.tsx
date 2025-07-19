import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Zap, TrendingUp, Target, Users, ArrowRight, Sparkles, Activity, BarChart3, FileText, Package, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Homepage = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const aiFeatures = [
    {
      id: "inventory",
      title: "AI Inventory Intelligence",
      description: "Smart stock predictions, demand forecasting, and automated reorder alerts",
      icon: Package,
      color: "from-blue-500 to-cyan-500",
      route: "/inventory",
      metrics: { accuracy: 94, saved: "2.3hrs", improvement: "+23%" }
    },
    {
      id: "sales",
      title: "AI Sales Analytics", 
      description: "Advanced pattern recognition, growth predictions, and performance optimization",
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
      route: "/sales-tracking",
      metrics: { accuracy: 96, saved: "4.1hrs", improvement: "+31%" }
    },
    {
      id: "payments",
      title: "AI Payment Intelligence",
      description: "Fraud detection, cash flow predictions, and automated reconciliation",
      icon: CreditCard,
      color: "from-purple-500 to-violet-500", 
      route: "/payments",
      metrics: { accuracy: 99, saved: "1.8hrs", improvement: "+18%" }
    },
    {
      id: "excel",
      title: "AI Excel Mapper",
      description: "Intelligent column detection, smart validation, and error prevention",
      icon: FileText,
      color: "from-orange-500 to-red-500",
      route: "/excel-mapper",
      metrics: { accuracy: 92, saved: "3.2hrs", improvement: "+45%" }
    }
  ];

  const aiInsights = [
    { label: "Revenue Growth", value: "+24.5%", trend: "up" },
    { label: "Efficiency Gain", value: "+18.3%", trend: "up" },
    { label: "Error Reduction", value: "-67.2%", trend: "down" },
    { label: "Time Saved", value: "12.4hrs", trend: "neutral" }
  ];

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      {/* AI Dashboard Header */}
      <div className="glass-container p-8 mb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Brain className="w-12 h-12 text-primary animate-pulse" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-primary rounded-full animate-ping"></div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                AI-Powered Business Hub
              </h1>
              <p className="text-muted-foreground text-lg">
                Intelligent automation and insights for your e-commerce operations
              </p>
            </div>
          </div>
          <Badge className="px-4 py-2 bg-gradient-primary text-primary-foreground">
            <Activity className="w-4 h-4 mr-2" />
            AI Active
          </Badge>
        </div>

        {/* AI Insights Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {aiInsights.map((insight, index) => (
            <Card key={index} className="glass-container border-primary/20 hover:shadow-glow transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{insight.label}</p>
                    <p className="text-2xl font-bold text-primary">{insight.value}</p>
                  </div>
                  <div className={`w-2 h-8 rounded-full bg-gradient-to-t ${
                    insight.trend === 'up' ? 'from-green-500 to-emerald-400' :
                    insight.trend === 'down' ? 'from-red-500 to-orange-400' :
                    'from-blue-500 to-cyan-400'
                  }`}></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Feature Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {aiFeatures.map((feature) => (
          <Card 
            key={feature.id}
            className={`glass-container border-primary/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-strong cursor-pointer group ${
              hoveredCard === feature.id ? 'animate-glow-pulse' : ''
            }`}
            onMouseEnter={() => setHoveredCard(feature.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => navigate(feature.route)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-medium`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* AI Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{feature.metrics.accuracy}%</div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{feature.metrics.saved}</div>
                  <div className="text-xs text-muted-foreground">Time Saved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{feature.metrics.improvement}</div>
                  <div className="text-xs text-muted-foreground">Improvement</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI Optimization</span>
                  <span>{feature.metrics.accuracy}%</span>
                </div>
                <Progress value={feature.metrics.accuracy} className="h-2" />
              </div>

              {/* Action Button */}
              <Button 
                className="w-full group/btn bg-gradient-primary hover:shadow-medium transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(feature.route);
                }}
              >
                <span>Launch AI {feature.title.split(' ')[1]}</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Quick Stats */}
      <Card className="glass-container mt-6 border-primary/20 animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            AI Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                10.2M
              </div>
              <div className="text-sm text-muted-foreground">Data Points Processed</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                98.7%
              </div>
              <div className="text-sm text-muted-foreground">AI Accuracy Rate</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                47.3hrs
              </div>
              <div className="text-sm text-muted-foreground">Weekly Time Saved</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Homepage;