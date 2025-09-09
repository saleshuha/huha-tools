import { File, Files, Calculator, Archive, ChevronDown, FolderOpen, Package, Wrench, LogOut, Home, Users, TrendingUp, Merge, Edit3, Database, CreditCard, Upload, BarChart3, DollarSign, Store, ShoppingCart, Globe, ExternalLink, Eye, Trash2, Settings, Tag, FileSpreadsheet, Truck, Palette, ShoppingBag, Printer } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useState } from "react"
import { Capacitor } from "@capacitor/core"
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
  },
  {
    title: "Noon File Cleaner",
    url: "/noon-file-cleaner",
    icon: Trash2
  }
]

const poTrackerItems = [
  {
    title: "Source Product Importer",
    url: "/sunsky-importer",
    icon: Globe
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
  const isNative = Capacitor.isNativePlatform()
  
  const { toast } = useToast()
  const { isAdmin } = useUserProfile()

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

  const isPOTrackerSectionActive = () => {
    return isActive("/po-tracker") || poTrackerItems.some(item => isActive(item.url))
  }

  const isAmazonSectionActive = () => {
    return isActive("/order-processing") || isActive("/po-tracker") || isActive("/amazon-fulfillment") || isActive("/amazon-vendor-central") || isActive("/amazon-image-uploader")
  }

  const isNoonSectionActive = () => {
    return isActive("/noon-order-processing") || isActive("/noon-order-tracking")
  }

  const isSourceSectionActive = () => {
    return isActive("/sunsky-importer") || isActive("/sunsky-order-tracking")
  }

  const [isToolsOpen, setIsToolsOpen] = useState(() => isToolsSectionActive())
  const [isPaymentReportsOpen, setIsPaymentReportsOpen] = useState(() => isPaymentReportsSectionActive())
  const [isPOTrackerOpen, setIsPOTrackerOpen] = useState(() => isPOTrackerSectionActive())
  const [isAmazonOpen, setIsAmazonOpen] = useState(() => isAmazonSectionActive())
  const [isNoonOpen, setIsNoonOpen] = useState(() => isNoonSectionActive())
  const [isSourceOpen, setIsSourceOpen] = useState(() => isSourceSectionActive())

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


  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium px-3 py-2 text-xs uppercase tracking-wide">
            {!isCollapsed && "HuHa Dashboard"}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {/* Navigation items */}
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`group relative w-full rounded-md transition-all duration-200 ${
                      isActive(item.url)
                        ? "bg-primary/90 text-primary-foreground shadow-sm" 
                        : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <NavLink 
                      to={item.url} 
                      end
                      className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium text-sm">
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
                  className={`group relative w-full rounded-md transition-all duration-200 ${
                    isActive("/inventory")
                      ? "bg-primary/90 text-primary-foreground shadow-sm" 
                      : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <NavLink 
                    to="/inventory" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
                  >
                    <Database className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">
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
                  className={`group relative w-full rounded-md transition-all duration-200 ${
                    isActive("/replenishment")
                      ? "bg-primary/90 text-primary-foreground shadow-sm" 
                      : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <NavLink 
                    to="/replenishment" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
                  >
                    <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">
                        Sales & Replenishment
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* QZ Tray Setup */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`group relative w-full rounded-md transition-all duration-200 ${
                    isActive("/qz-tray")
                      ? "bg-primary/90 text-primary-foreground shadow-sm" 
                      : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <NavLink 
                    to="/qz-tray" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
                  >
                    <Printer className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">
                        QZ Tray Setup
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Amazon Section - only show when not collapsed */}
              {!isCollapsed && (
                <SidebarMenuItem>
                  <Collapsible open={isAmazonOpen} onOpenChange={setIsAmazonOpen}>
                    <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      className={`group relative w-full rounded-md transition-all duration-200 ${
                        isAmazonSectionActive()
                          ? "bg-primary/90 text-primary-foreground shadow-sm" 
                          : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md cursor-pointer">
                          <ShoppingBag className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm">
                            Amazon
                          </span>
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${
                            isAmazonOpen ? "rotate-180" : ""
                          }`} />
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1 pl-3 z-50 relative">
                      {/* DF Order Processing */}
                      <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                          isActive("/order-processing")
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to="/order-processing" 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <FileSpreadsheet className="h-4 w-4 flex-shrink-0 opacity-75" />
                          <span className="font-medium text-xs">
                            DF Order Processing
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                      
                      {/* PO - SS Stock Tracker */}
                      <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                          isActive("/po-tracker")
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to="/po-tracker" 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <ShoppingCart className="h-4 w-4 flex-shrink-0 opacity-75" />
                          <span className="font-medium text-xs">
                            PO - SS Stock Tracker
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                      
                      {/* Amazon Fulfillment Tracker */}
                      <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                          isActive("/amazon-fulfillment")
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to="/amazon-fulfillment" 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <Package className="h-4 w-4 flex-shrink-0 opacity-75" />
                          <span className="font-medium text-xs">
                            Amazon Fulfillment Tracker
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                      
                      {/* Amazon Image Uploader */}
                      <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                          isActive("/amazon-image-uploader")
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to="/amazon-image-uploader" 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <Upload className="h-4 w-4 flex-shrink-0 opacity-75" />
                          <span className="font-medium text-xs">
                            Amazon Image Uploader
                          </span>
                        </NavLink>
                      </SidebarMenuButton>

                      {/* Amazon Vendor Central - Hide in native app */}
                      {!isNative && (
                        <SidebarMenuButton
                          asChild
                          className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                            isActive("/amazon-vendor-central")
                              ? "bg-primary/90 text-primary-foreground shadow-sm" 
                              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <NavLink 
                            to="/amazon-vendor-central" 
                            end
                            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                          >
                            <Settings className="h-4 w-4 flex-shrink-0 opacity-75" />
                            <span className="font-medium text-xs">
                              Amazon Vendor Central
                            </span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Noon Section - only show when not collapsed */}
              {!isCollapsed && (
                <SidebarMenuItem>
                  <Collapsible open={isNoonOpen} onOpenChange={setIsNoonOpen}>
                    <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      className={`group relative w-full rounded-md transition-all duration-200 ${
                        isNoonSectionActive()
                          ? "bg-primary/90 text-primary-foreground shadow-sm" 
                          : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md cursor-pointer">
                          <Store className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm">
                            Noon
                          </span>
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${
                            isNoonOpen ? "rotate-180" : ""
                          }`} />
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1 pl-3 z-50 relative">
                      {/* Noon Orders Processing */}
                      <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                          isActive("/noon-order-processing")
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to="/noon-order-processing" 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <Upload className="h-4 w-4 flex-shrink-0 opacity-75" />
                          <span className="font-medium text-xs">
                            Noon Orders Processing
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                      
                      {/* Noon Orders Tracking */}
                      <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                          isActive("/noon-order-tracking")
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to="/noon-order-tracking" 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <Package className="h-4 w-4 flex-shrink-0 opacity-75" />
                          <span className="font-medium text-xs">
                            Noon Orders Tracking
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Source Section - only show when not collapsed */}
              {!isCollapsed && (
                <SidebarMenuItem>
                  <Collapsible open={isSourceOpen} onOpenChange={setIsSourceOpen}>
                    <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      className={`group relative w-full rounded-md transition-all duration-200 ${
                        isSourceSectionActive()
                          ? "bg-primary/90 text-primary-foreground shadow-sm" 
                          : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md cursor-pointer">
                          <Globe className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm">
                            Source
                          </span>
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${
                            isSourceOpen ? "rotate-180" : ""
                          }`} />
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1 pl-3 z-50 relative">
                      {/* Source Product Importer */}
                      <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                          isActive("/sunsky-importer")
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to="/sunsky-importer" 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <Globe className="h-4 w-4 flex-shrink-0 opacity-75" />
                          <span className="font-medium text-xs">
                            Source Product Importer
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                      
                      {/* Source Order Tracking */}
                      <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                          isActive("/sunsky-order-tracking")
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to="/sunsky-order-tracking" 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <Truck className="h-4 w-4 flex-shrink-0 opacity-75" />
                          <span className="font-medium text-xs">
                            Source Order Tracking
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Label Designer */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`group relative w-full rounded-md transition-all duration-200 ${
                    isActive("/label-designer")
                      ? "bg-primary/90 text-primary-foreground shadow-sm" 
                      : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <NavLink 
                    to="/label-designer" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
                  >
                    <Tag className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">
                        Label Designer
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Carrefour Sales Tracker */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`group relative w-full rounded-md transition-all duration-200 ${
                    isActive("/carrefour-payments")
                      ? "bg-primary/90 text-primary-foreground shadow-sm" 
                      : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <NavLink 
                    to="/carrefour-payments" 
                    end
                    className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
                  >
                    <BarChart3 className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">
                        Carrefour Sales Tracker
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Tools dropdown - only show when not collapsed and not in native app */}
              {!isCollapsed && !isNative && (
                <SidebarMenuItem>
                  <Collapsible open={isToolsOpen} onOpenChange={setIsToolsOpen}>
                    <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      className={`group relative w-full rounded-md transition-all duration-200 ${
                        isToolsSectionActive()
                          ? "bg-primary/90 text-primary-foreground shadow-sm" 
                          : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md cursor-pointer">
                          <Wrench className="h-5 w-5 flex-shrink-0" />
                          <span className="font-medium text-sm">
                            Tools
                          </span>
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${
                            isToolsOpen ? "rotate-180" : ""
                          }`} />
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1 pl-3 z-50 relative">
                      {toolsItems.map((item) => (
                        <SidebarMenuButton
                          key={item.title}
                          asChild
                          className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                            isActive(item.url)
                              ? "bg-primary/90 text-primary-foreground shadow-sm" 
                              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <NavLink 
                            to={item.url} 
                            end
                            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0 opacity-75" />
                            <span className="font-medium text-xs">
                              {item.title}
                            </span>
                          </NavLink>
                        </SidebarMenuButton>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Data Viewer standalone item - Hide in native app */}
              {!isNative && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    className={`group relative w-full rounded-md transition-all duration-200 ${
                      isActive("/data-viewer")
                        ? "bg-primary/90 text-primary-foreground shadow-sm" 
                        : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
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
                        <span className="font-medium text-sm">
                          Data Viewer
                        </span>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-3 border-t border-sidebar-border">
        {/* Progress Indicator */}
        <SidebarProgressIndicator />
        
        {/* Notification Logs above User Management */}
        <div className="mb-1">
          <SidebarNotificationLogs />
        </div>
        
        <SidebarMenuButton 
          asChild
          className={`group relative w-full rounded-md transition-all duration-200 ${
            isActive("/users")
              ? "bg-primary/90 text-primary-foreground shadow-sm" 
              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
          }`}
        >
          <NavLink 
            to="/users" 
            end
            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-medium text-sm">
                User Management
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
        
        {/* Preview Settings */}
        <SidebarMenuButton 
          asChild
          className={`group relative w-full rounded-md transition-all duration-200 ${
            isActive("/preview-settings")
              ? "bg-primary/90 text-primary-foreground shadow-sm" 
              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
          }`}
        >
          <NavLink 
            to="/preview-settings" 
            end
            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
          >
            <Palette className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-medium text-sm">
                Preview Settings
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
        
        <Button 
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center gap-2 text-sm mt-2"
          size="sm"
        >
          <LogOut className="h-3 w-3" />
          {!isCollapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}