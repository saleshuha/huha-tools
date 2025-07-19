import { File, Files, Calculator, Archive, ChevronDown, FolderOpen, Package, CreditCard, Wrench, TrendingUp, LogOut, Home, Bot, Sparkles, Moon, Sun, Monitor, Zap, Brain, Activity } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/ui/mode-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const navigationItems = [
  {
    title: "AI Dashboard",
    url: "/",
    icon: Brain,
    description: "Intelligent insights, tasks, and analytics overview",
    aiFeatures: ["Smart Analytics", "Predictive Insights", "Auto Reports"]
  }
]

const toolsItems = [
  {
    title: "AI Excel Mapper",
    url: "/excel-mapper",
    icon: File,
    description: "Smart mapping with AI-powered column detection",
    aiFeatures: ["Auto-mapping", "Smart Validation", "Error Detection"]
  },
  {
    title: "AI Batch Processor",
    url: "/batch",
    icon: Files,
    description: "Intelligent batch processing with optimization",
    aiFeatures: ["Smart Batching", "Performance Optimization", "Auto-retry"]
  },
  {
    title: "AI ASIN Analyzer",
    url: "/asin-sum",
    icon: Calculator,
    description: "Advanced ASIN analysis with predictive insights",
    aiFeatures: ["Pattern Recognition", "Trend Analysis", "Smart Grouping"]
  },
  {
    title: "Smart Zip Manager",
    url: "/zip-splitter",
    icon: Archive,
    description: "Intelligent file management and optimization",
    aiFeatures: ["Size Optimization", "Smart Compression", "Auto-organization"]
  }
]

const coreItems = [
  {
    title: "AI Inventory Hub",
    url: "/inventory",
    icon: Package,
    description: "Smart inventory tracking with predictive analytics",
    aiFeatures: ["Stock Prediction", "Demand Forecasting", "Auto-reordering"]
  },
  {
    title: "AI Sales Intelligence",
    url: "/sales-tracking",
    icon: TrendingUp,
    description: "Advanced sales analytics with growth insights",
    aiFeatures: ["Trend Analysis", "Growth Predictions", "Performance Optimization"]
  },
  {
    title: "AI Payment Analytics",
    url: "/payments",
    icon: CreditCard,
    description: "Intelligent payment tracking and cash flow analysis",
    aiFeatures: ["Cash Flow Prediction", "Pattern Detection", "Fraud Prevention"]
  },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const isCollapsed = state === "collapsed"
  const [isToolsOpen, setIsToolsOpen] = useState(true)
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    }
  }

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/"
    }
    return location.pathname === path
  }

  const isToolsSectionActive = () => {
    return toolsItems.some(item => isActive(item.url))
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border w-72 bg-sidebar shadow-strong">
      <SidebarContent className="bg-gradient-surface">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-bold px-6 py-4 text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              AI-Powered HuHa
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </div>
            {!isCollapsed && <ModeToggle />}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`w-full p-3 rounded-lg transition-all duration-300 min-h-[60px] hover:scale-[1.02] group relative ${
                      isActive(item.url)
                        ? "bg-gradient-primary text-primary-foreground shadow-medium animate-glow-pulse" 
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground glass-container"
                    }`}
                  >
                    <NavLink 
                      to={item.url} 
                      end
                      className="flex items-start gap-4 no-underline w-full h-full"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300" />
                      {!isCollapsed && (
                        <div className="flex flex-col text-left flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm leading-tight">
                              {item.title}
                            </span>
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              <Sparkles className="w-2 h-2 mr-1" />
                              AI
                            </Badge>
                          </div>
                          <span className="text-xs opacity-80 leading-relaxed">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Core Application Items with AI features */}
              {coreItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`w-full p-3 rounded-lg transition-all duration-300 min-h-[55px] hover:scale-[1.02] group relative ${
                      isActive(item.url)
                        ? "bg-gradient-primary text-primary-foreground shadow-medium animate-glow-pulse" 
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground glass-container"
                    }`}
                  >
                    <NavLink 
                      to={item.url} 
                      end
                      className="flex items-start gap-4 no-underline w-full h-full"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300" />
                      {!isCollapsed && (
                        <div className="flex flex-col text-left flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm leading-tight">
                              {item.title}
                            </span>
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              <Activity className="w-2 h-2 mr-1" />
                              AI
                            </Badge>
                          </div>
                          <span className="text-xs opacity-80 leading-relaxed">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Enhanced AI Tools dropdown */}
              <SidebarMenuItem>
                <Collapsible open={isToolsOpen} onOpenChange={setIsToolsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`w-full p-3 rounded-lg transition-all duration-300 min-h-[55px] hover:scale-[1.02] group ${
                        isToolsSectionActive()
                          ? "bg-gradient-accent text-accent-foreground shadow-medium" 
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground glass-container"
                      }`}
                    >
                      <div className="flex items-start gap-4 w-full">
                        <Wrench className="h-5 w-5 flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300" />
                        {!isCollapsed && (
                          <div className="flex flex-col text-left flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm leading-tight">
                                  AI Tools
                                </span>
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  <Bot className="w-2 h-2 mr-1" />
                                  Smart
                                </Badge>
                              </div>
                              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${
                                isToolsOpen ? "rotate-180" : ""
                              }`} />
                            </div>
                            <span className="text-xs opacity-80 leading-relaxed">
                              Intelligent Excel and utility tools
                            </span>
                          </div>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-6 mt-2 space-y-2 animate-accordion-down">
                    {toolsItems.map((item) => (
                      <SidebarMenuButton 
                        key={item.title}
                        asChild
                        className={`w-full p-2 rounded-lg transition-all duration-300 min-h-[45px] hover:scale-[1.02] group ${
                          isActive(item.url)
                            ? "bg-gradient-primary text-primary-foreground shadow-medium" 
                            : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground glass-container border border-sidebar-border/30"
                        }`}
                      >
                        <NavLink 
                          to={item.url} 
                          end
                          className="flex items-start gap-3 no-underline w-full h-full"
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300" />
                          {!isCollapsed && (
                            <div className="flex flex-col text-left flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs leading-tight">
                                  {item.title}
                                </span>
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  <Sparkles className="w-2 h-2 mr-1" />
                                  AI
                                </Badge>
                              </div>
                              <span className="text-xs opacity-70 leading-relaxed">
                                {item.description}
                              </span>
                            </div>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar">
        <div className="space-y-2">
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center gap-2 text-sm hover:scale-105 transition-all duration-300 bg-gradient-to-r from-destructive/10 to-destructive/5 hover:from-destructive hover:to-destructive/80 hover:text-destructive-foreground border-destructive/20 hover:border-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && "Sign Out"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}