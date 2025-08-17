import { File, Files, Calculator, Archive, ChevronDown, FolderOpen, Package, Wrench, LogOut, Home, Users, TrendingUp, Merge, Edit3, Database, CreditCard, Upload, BarChart3, DollarSign, Store, ShoppingCart, Globe, ExternalLink, Eye } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { useUserProfile } from "@/hooks/useUserProfile"
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
import { SidebarNotificationLogs } from "@/components/sidebar/SidebarNotificationLogs"
import { SidebarProgressIndicator } from "@/components/sidebar/SidebarProgressIndicator"

const navigationItems = [
  {
    title: "Homepage",
    url: "/",
    icon: Home
  },
]

const toolsItems = [
  {
    title: "Excel File Mapper",
    url: "/excel-mapper",
    icon: File
  },
  {
    title: "Batch Processor",
    url: "/batch",
    icon: Files
  },
  {
    title: "ASIN QTY Sum",
    url: "/asin-sum",
    icon: Calculator
  },
  {
    title: "Zip Splitter",
    url: "/zip-splitter",
    icon: Archive
  },
  {
    title: "File Merger",
    url: "/file-merger",
    icon: Merge
  },
  {
    title: "Excel Editor",
    url: "/excel-editor",
    icon: Edit3
  },
  {
    title: "Bulk Column Editor",
    url: "/bulk-column-editor",
    icon: Database
  }
]

const coreItems = [
  {
    title: "Amazon Fulfillment Tracker",
    url: "/amazon-fulfillment",
    icon: Package
  },
  {
    title: "Instock Inventory",
    url: "/inventory",
    icon: Database
  },
  {
    title: "Sales & Replenishment",
    url: "/replenishment",
    icon: TrendingUp
  },
]

const paymentReportsItems = [
  {
    title: "Noon Dashboard",
    url: "/noon-dashboard",
    icon: BarChart3
  },
  {
    title: "Store Management",
    url: "/noon-stores",
    icon: Store
  },
  {
    title: "Sales Data Upload",
    url: "/noon-sales-data",
    icon: Upload
  },
  {
    title: "Fees Reports",
    url: "/noon-fees-reports",
    icon: CreditCard
  },
  {
    title: "Payment Reports",
    url: "/payment-reports",
    icon: DollarSign
  },
  {
    title: "SKU Cost Management",
    url: "/noon-sku-costs",
    icon: Database
  },
  {
    title: "Analytics Dashboard",
    url: "/noon-analytics",
    icon: BarChart3
  }
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const isCollapsed = state === "collapsed"
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [isPaymentReportsOpen, setIsPaymentReportsOpen] = useState(false)
  
  const { toast } = useToast()
  const { isAdmin } = useUserProfile()

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

  const isPaymentReportsSectionActive = () => {
    return paymentReportsItems.some(item => isActive(item.url))
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border w-64 bg-sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold px-4 py-3 text-sm">
            HuHa Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="space-y-1">
              {/* Navigation items */}
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`group relative w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                      isActive(item.url)
                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25" 
                        : "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md"
                    }`}
                  >
                    <NavLink 
                      to={item.url} 
                      end
                      className="flex items-center gap-3 no-underline w-full px-4 py-3 rounded-xl"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-semibold text-sm">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Instock Inventory */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`group relative w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                    isActive("/inventory")
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25" 
                      : "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md"
                  }`}
                >
                  <NavLink 
                    to="/inventory" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-4 py-3 rounded-xl"
                  >
                    <Database className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-semibold text-sm">
                        Instock Inventory
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Sales & Replenishment */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`group relative w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                    isActive("/replenishment")
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25" 
                      : "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md"
                  }`}
                >
                  <NavLink 
                    to="/replenishment" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-4 py-3 rounded-xl"
                  >
                    <TrendingUp className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-semibold text-sm">
                        Sales & Replenishment
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* PO - SS Stock Tracker */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`group relative w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                    isActive("/po-tracker")
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25" 
                      : "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md"
                  }`}
                >
                  <NavLink 
                    to="/po-tracker" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-4 py-3 rounded-xl"
                  >
                    <ShoppingCart className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-semibold text-sm">
                        PO - SS Stock Tracker
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Amazon Fulfillment Tracker */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`group relative w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                    isActive("/amazon-fulfillment")
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25" 
                      : "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md"
                  }`}
                >
                  <NavLink 
                    to="/amazon-fulfillment" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-4 py-3 rounded-xl"
                  >
                    <Package className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-semibold text-sm">
                        Amazon Fulfillment Tracker
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Carrefour Sales Tracker */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`group relative w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                    isActive("/carrefour-payments")
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25" 
                      : "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md"
                  }`}
                >
                  <NavLink 
                    to="/carrefour-payments" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-4 py-3 rounded-xl"
                  >
                    <BarChart3 className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-semibold text-sm">
                        Carrefour Sales Tracker
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Tools dropdown */}
              <SidebarMenuItem>
                <Collapsible open={isToolsOpen} onOpenChange={setIsToolsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`group relative w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                        isToolsSectionActive()
                          ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25" 
                          : "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-3 no-underline w-full px-4 py-3 rounded-xl">
                        <Wrench className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="font-semibold text-sm">
                              Tools
                            </span>
                            <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${
                              isToolsOpen ? "rotate-180" : ""
                            }`} />
                          </>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1 pl-3">
                    {toolsItems.map((item) => (
                      <SidebarMenuButton 
                        key={item.title}
                        asChild
                        className={`group relative w-full rounded-lg transition-all duration-200 hover:scale-[1.01] ml-2 ${
                          isActive(item.url)
                            ? "bg-gradient-to-r from-primary/80 to-primary/70 text-primary-foreground shadow-md shadow-primary/20" 
                            : "hover:bg-gradient-to-r hover:from-sidebar-accent/60 hover:to-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to={item.url} 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0 opacity-75" />
                          {!isCollapsed && (
                            <span className="font-medium text-xs">
                              {item.title}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>

              {/* Data Viewer standalone item */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`group relative w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                    isActive("/data-viewer")
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25" 
                      : "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md"
                  }`}
                >
                  <a 
                    href="https://huha-data-viewer.lovable.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 no-underline w-full px-4 py-3 rounded-xl"
                  >
                    <Eye className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-semibold text-sm">
                        Data Viewer
                      </span>
                    )}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-3 pt-1 border-t border-sidebar-border">
        {/* Progress Indicator */}
        <SidebarProgressIndicator />
        
        {/* Notification Logs above User Management */}
        <div className="mb-3">
          <SidebarNotificationLogs />
        </div>
        
        <SidebarMenuButton 
          asChild
          className={`group relative w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${
            isActive("/users")
              ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25" 
              : "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md"
          }`}
        >
          <NavLink 
            to="/users" 
            end
            className="flex items-center gap-3 no-underline w-full px-4 py-3 rounded-xl"
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-semibold text-sm">
                User Management
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
        
        <Button 
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center gap-2 text-sm"
          size="sm"
        >
          <LogOut className="h-3 w-3" />
          {!isCollapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}