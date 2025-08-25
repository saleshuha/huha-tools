import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
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
  Plus,
  TrendingUp,
  Users,
  Zap,
  Award
} from "lucide-react";

interface DashboardStats {
  totalTemplates: number;
  labelsGenerated: number;
  recentPrints: number;
  activeProjects: number;
  templatesThisMonth: number;
  printSuccess: number;
  avgProcessingTime: number;
  totalUsers: number;
}

export const LabelDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTemplates: 0,
    labelsGenerated: 0,
    recentPrints: 0,
    activeProjects: 0,
    templatesThisMonth: 0,
    printSuccess: 0,
    avgProcessingTime: 0,
    totalUsers: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading stats with animation
  useEffect(() => {
    const loadStats = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const finalStats = {
        totalTemplates: 24,
        labelsGenerated: 3247,
        recentPrints: 156,
        activeProjects: 7,
        templatesThisMonth: 8,
        printSuccess: 98.7,
        avgProcessingTime: 2.4,
        totalUsers: 12
      };

      // Animate numbers counting up
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          setStats({
            totalTemplates: Math.floor((finalStats.totalTemplates * i) / steps),
            labelsGenerated: Math.floor((finalStats.labelsGenerated * i) / steps),
            recentPrints: Math.floor((finalStats.recentPrints * i) / steps),
            activeProjects: Math.floor((finalStats.activeProjects * i) / steps),
            templatesThisMonth: Math.floor((finalStats.templatesThisMonth * i) / steps),
            printSuccess: Number(((finalStats.printSuccess * i) / steps).toFixed(1)),
            avgProcessingTime: Number(((finalStats.avgProcessingTime * i) / steps).toFixed(1)),
            totalUsers: Math.floor((finalStats.totalUsers * i) / steps)
          });
        }, i * 50);
      }
      
      setTimeout(() => setIsLoading(false), 1500);
    };

    loadStats();
  }, []);

  const recentActivity = [
    { 
      id: 1, 
      action: "Template Created", 
      name: "Premium Product Labels", 
      time: "5 minutes ago", 
      status: "completed",
      user: "Sarah Chen"
    },
    { 
      id: 2, 
      action: "Batch Printed", 
      name: "Warehouse Inventory", 
      time: "12 minutes ago", 
      status: "completed",
      user: "Mike Rodriguez"
    },
    { 
      id: 3, 
      action: "Data Uploaded", 
      name: "product_catalog_v2.xlsx", 
      time: "1 hour ago", 
      status: "completed",
      user: "Emma Thompson"
    },
    { 
      id: 4, 
      action: "QR Code Generated", 
      name: "Digital Menu Cards", 
      time: "2 hours ago", 
      status: "completed",
      user: "Alex Kumar"
    },
  ];

  const quickActions = [
    { 
      title: "New Template", 
      icon: Plus, 
      description: "Start with a blank canvas or template",
      color: "from-blue-500 to-blue-600",
      action: () => console.log("Create template")
    },
    { 
      title: "Import Data", 
      icon: Upload, 
      description: "Upload CSV/Excel for bulk generation",
      color: "from-emerald-500 to-emerald-600",
      action: () => console.log("Import data")
    },
    { 
      title: "Quick Print", 
      icon: Printer, 
      description: "Print existing templates instantly",
      color: "from-purple-500 to-purple-600",
      action: () => console.log("Quick print")
    },
    { 
      title: "Export All", 
      icon: Download, 
      description: "Download templates and data",
      color: "from-orange-500 to-orange-600",
      action: () => console.log("Export all")
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Stats Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Templates</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTemplates}</div>
            <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{stats.templatesThisMonth} this month
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Labels Generated</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Tag className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.labelsGenerated.toLocaleString()}</div>
            <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400">
              <Zap className="h-3 w-3 mr-1" />
              +{stats.recentPrints} today
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Success Rate</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Award className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.printSuccess}%</div>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
              <Clock className="h-3 w-3 mr-1" />
              Avg: {stats.avgProcessingTime}s
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Projects</CardTitle>
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeProjects}</div>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
              <Users className="h-3 w-3 mr-1" />
              {stats.totalUsers} team members
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-6 h-6 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    className="h-auto p-6 flex flex-col items-start space-y-3 hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-900 hover:bg-gradient-to-r hover:from-white hover:to-slate-50 dark:hover:from-slate-900 dark:hover:to-slate-800"
                    onClick={action.action}
                  >
                    <div className={`w-10 h-10 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left space-y-1">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{action.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{action.description}</div>
                    </div>
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-4 p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm"
                  >
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {activity.action}
                        </p>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                          {activity.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{activity.name}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{activity.time}</span>
                        <span>by {activity.user}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                System Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Template Storage</span>
                  <span className="font-medium">2.4 GB / 10 GB</span>
                </div>
                <Progress value={24} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Print Queue</span>
                  <span className="font-medium">3 jobs pending</span>
                </div>
                <Progress value={15} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Processing Power</span>
                  <span className="font-medium">87% available</span>
                </div>
                <Progress value={87} className="h-2" />
              </div>

              <div className="pt-4 space-y-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">All printers online</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Templates synced</span>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">2 pending uploads</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};