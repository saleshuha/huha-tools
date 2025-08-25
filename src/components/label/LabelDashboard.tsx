import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Printer, 
  Download, 
  Upload, 
  Tag, 
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus
} from "lucide-react";

export const LabelDashboard = () => {
  const [stats] = useState({
    totalTemplates: 12,
    labelsGenerated: 1245,
    recentPrints: 89,
    activeProjects: 3
  });

  const recentActivity = [
    { id: 1, action: "Created template", name: "Product Labels v2", time: "2 hours ago", status: "completed" },
    { id: 2, action: "Printed batch", name: "Warehouse SKUs", time: "4 hours ago", status: "completed" },
    { id: 3, action: "Uploaded data", name: "inventory_data.csv", time: "1 day ago", status: "completed" },
    { id: 4, action: "Generated preview", name: "QR Code Labels", time: "2 days ago", status: "completed" },
  ];

  const quickActions = [
    { title: "New Label Template", icon: Plus, description: "Create a new label design from scratch" },
    { title: "Upload CSV Data", icon: Upload, description: "Import product data for bulk label generation" },
    { title: "Quick Print", icon: Printer, description: "Print labels using existing templates" },
    { title: "Download Archive", icon: Download, description: "Export all templates and data" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-container">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card className="glass-container">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labels Generated</CardTitle>
            <Tag className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.labelsGenerated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+89 this week</p>
          </CardContent>
        </Card>

        <Card className="glass-container">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Prints</CardTitle>
            <Printer className="h-4 w-4 text-emerald" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentPrints}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="glass-container">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <BarChart3 className="h-4 w-4 text-sky" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="glass-container">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5"
              >
                <action.icon className="h-6 w-6 text-primary" />
                <div className="text-left">
                  <div className="font-semibold text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {activity.action}: <span className="text-primary">{activity.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-sky" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Template Storage</span>
                <span>68%</span>
              </div>
              <Progress value={68} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Print Queue</span>
                <span>23%</span>
              </div>
              <Progress value={23} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Data Processing</span>
                <span>91%</span>
              </div>
              <Progress value={91} className="h-2" />
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm">All printers online</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm">Templates synced</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm">2 pending uploads</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};