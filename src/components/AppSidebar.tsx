import { File, Files, Calculator, Archive, ChevronDown, FolderOpen, Package, Wrench, LogOut, Home, Users, TrendingUp, TrendingDown, Merge, Edit3, Database, CreditCard, Upload, BarChart3, DollarSign, Store, ShoppingCart, Globe, ExternalLink, Eye, Trash2, Settings, Tag, FileSpreadsheet, Truck, Palette, ShoppingBag, Printer, BookOpen, Building2, Info, Banknote, Activity } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useState } from "react"
import { Capacitor } from "@capacitor/core"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { useUserProfile } from "@/hooks/useUserProfile"
import { useUserPagePermissions } from "@/hooks/useUserPagePermissions"
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

// Routes with their added dates — items within 90 days get a "New" badge
const ROUTE_ADDED_DATES: Record<string, string> = {
  '/asin-sales-health': '2026-03-15',
  '/asin-cost-history': '2026-02-10',
  '/amazon-returns-analysis': '2026-01-20',
  '/market-purchases': '2026-01-05',
  '/noon-fbpi': '2025-12-28',
  '/global-sources': '2026-02-01',
  '/carrefour-payments': '2026-01-15',
}

const isNewRoute = (route: string): boolean => {
  const addedDate = ROUTE_ADDED_DATES[route]
  if (!addedDate) return false
  const added = new Date(addedDate)
  const now = new Date()
  const diffDays = (now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 90
}

const NewBadge = ({ route }: { route: string }) => {
  if (!isNewRoute(route)) return null
  return (
    <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-accent text-accent-foreground leading-none tracking-wide">
      New
    </span>
  )
}

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
  },
  {
    title: "Product File Manager",
    url: "/product-file-manager",
    icon: FileSpreadsheet
  },
  {
    title: "Noon Statement Analyzer",
    url: "/noon-financial-statements",
    icon: BarChart3
  }
]

const poTrackerItems = [
  {
    title: "Source Product Importer",
    url: "/sunsky-importer",
    icon: Globe
  },
  {
    title: "Source Order Tracking",
    url: "/sunsky-order-tracking",
    icon: Package
  },
  {
    title: "Source API Documentation",
    url: "/sunsky-api-docs",
    icon: BookOpen
  },
  {
    title: "Global Sources",
    url: "/global-sources",
    icon: Building2
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
    title: "Receive Stock",
    url: "/receive-stock",
    icon: Truck
  },
  {
    title: "Sales & Replenishment",
    url: "/replenishment",
    icon: TrendingUp
  },
  {
    title: "Daily Orders Queue",
    url: "/velocity-analytics",
    icon: BarChart3
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
  const { isAdmin, profile } = useUserProfile()
  const { permissions } = useUserPagePermissions(profile?.id)

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
    return isActive("/order-processing") || isActive("/po-tracker") || isActive("/amazon-fulfillment") || isActive("/amazon-vendor-central") || isActive("/amazon-image-uploader") || isActive("/amazon-returns-analysis") || isActive("/asin-cost-history") || isActive("/asin-sales-health")
  }

  const isNoonSectionActive = () => {
    return isActive("/noon-order-processing") || isActive("/noon-order-tracking") || isActive("/noon-fbpi")
  }

  const isSourceSectionActive = () => {
    return isActive("/sunsky-importer") || isActive("/sunsky-order-tracking") || isActive("/sunsky-api-docs") || isActive("/global-sources")
  }

  const isInventorySectionActive = () => {
    return isActive("/receive-stock") || isActive("/inventory") || isActive("/replenishment")
  }

  const [isToolsOpen, setIsToolsOpen] = useState(() => isToolsSectionActive())
  const [isPaymentReportsOpen, setIsPaymentReportsOpen] = useState(() => isPaymentReportsSectionActive())
  const [isPOTrackerOpen, setIsPOTrackerOpen] = useState(() => isPOTrackerSectionActive())
  const [isAmazonOpen, setIsAmazonOpen] = useState(() => isAmazonSectionActive())
  const [isNoonOpen, setIsNoonOpen] = useState(() => isNoonSectionActive())
  const [isSourceOpen, setIsSourceOpen] = useState(() => isSourceSectionActive())
  const [isInventoryOpen, setIsInventoryOpen] = useState(() => isInventorySectionActive())

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

  // Check if user can access a route
  const canAccessRoute = (route: string) => {
    // Admins can access everything
    if (isAdmin) return true;
    
    // If no permissions are set, user can access all pages
    if (permissions.length === 0) return true;
    
    // Check if user has permission for this route
    return permissions.some(p => p.page_route === route);
  };


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
              {navigationItems.filter(item => canAccessRoute(item.url)).map((item) => (
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

              {/* Inventory Section - only show when not collapsed */}
              {!isCollapsed && (canAccessRoute('/receive-stock') || canAccessRoute('/inventory') || canAccessRoute('/replenishment')) && (
                <SidebarMenuItem>
                  <Collapsible open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ${
                          isInventorySectionActive()
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md cursor-pointer">
                          <Package className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm">
                            Inventory
                          </span>
                          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${
                            isInventoryOpen ? "rotate-180" : ""
                          }`} />
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-2 space-y-1 pl-3 z-50 relative">
                      {/* Receive Stock */}
                      {canAccessRoute('/receive-stock') && (
                        <SidebarMenuButton
                          asChild
                          className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                            isActive("/receive-stock")
                              ? "bg-primary/90 text-primary-foreground shadow-sm" 
                              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <NavLink 
                            to="/receive-stock" 
                            end
                            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                          >
                            <Truck className="h-4 w-4 flex-shrink-0 opacity-75" />
                            <span className="font-medium text-xs">
                              Receive Stock
                            </span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}
                      
                      {/* Instock Inventory */}
                      {canAccessRoute('/inventory') && (
                        <SidebarMenuButton
                          asChild
                          className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                            isActive("/inventory")
                              ? "bg-primary/90 text-primary-foreground shadow-sm" 
                              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <NavLink 
                            to="/inventory" 
                            end
                            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                          >
                            <Database className="h-4 w-4 flex-shrink-0 opacity-75" />
                            <span className="font-medium text-xs">
                              Instock Inventory
                            </span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}
                      
                      {/* Sales & Replenishment */}
                      {canAccessRoute('/replenishment') && (
                        <SidebarMenuButton
                          asChild
                          className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                            isActive("/replenishment")
                              ? "bg-primary/90 text-primary-foreground shadow-sm" 
                              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <NavLink 
                            to="/replenishment" 
                            end
                            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                          >
                            <TrendingUp className="h-4 w-4 flex-shrink-0 opacity-75" />
                            <span className="font-medium text-xs">
                              Sales & Replenishment
                            </span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Shopify Sync */}
              {canAccessRoute('/shopify-sync') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className={`group relative w-full rounded-md transition-all duration-200 ${
                      isActive("/shopify-sync")
                        ? "bg-primary/90 text-primary-foreground shadow-sm"
                        : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <NavLink
                      to="/shopify-sync"
                      end
                      className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
                    >
                      <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium text-sm">Shopify Sync</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {canAccessRoute('/market-purchases') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className={`group relative w-full rounded-md transition-all duration-200 ${
                      isActive("/market-purchases")
                        ? "bg-primary/90 text-primary-foreground shadow-sm"
                        : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <NavLink
                      to="/market-purchases"
                      end
                      className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-md"
                    >
                      <Banknote className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium text-sm">Market Purchases</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Amazon Section - only show when not collapsed */}
              {!isCollapsed && (canAccessRoute('/order-processing') || canAccessRoute('/po-tracker') || canAccessRoute('/amazon-fulfillment') || canAccessRoute('/amazon-image-uploader') || canAccessRoute('/amazon-vendor-central') || canAccessRoute('/amazon-returns-analysis') || canAccessRoute('/asin-cost-history') || canAccessRoute('/asin-sales-health')) && (
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
                      {canAccessRoute('/order-processing') && <SidebarMenuButton
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
                      </SidebarMenuButton>}
                      
                      {/* PO - SS Stock Tracker */}
                      {canAccessRoute('/po-tracker') && <SidebarMenuButton
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
                            Amazon Retail
                          </span>
                        </NavLink>
                      </SidebarMenuButton>}
                      
                      {/* Amazon Fulfillment Tracker */}
                      {canAccessRoute('/amazon-fulfillment') && <SidebarMenuButton
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
                      </SidebarMenuButton>}
                      
                      {/* Amazon Image Uploader */}
                      {canAccessRoute('/amazon-image-uploader') && <SidebarMenuButton
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
                      </SidebarMenuButton>}

                      {/* Amazon Vendor Central - Hide in native app */}
                      {!isNative && canAccessRoute('/amazon-vendor-central') && (
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

                      {/* Amazon Returns Analysis - Hide in native app */}
                      {!isNative && canAccessRoute('/amazon-returns-analysis') && (
                        <SidebarMenuButton
                          asChild
                          className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                            isActive("/amazon-returns-analysis")
                              ? "bg-primary/90 text-primary-foreground shadow-sm" 
                              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <NavLink 
                            to="/amazon-returns-analysis" 
                            end
                            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                          >
                            <TrendingDown className="h-4 w-4 flex-shrink-0 opacity-75" />
                            <span className="font-medium text-xs">
                              Amazon Returns Analysis
                            </span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}

                      {/* ASIN Cost History */}
                      {canAccessRoute('/asin-cost-history') && (
                        <SidebarMenuButton
                          asChild
                          className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                            isActive("/asin-cost-history")
                              ? "bg-primary/90 text-primary-foreground shadow-sm" 
                              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <NavLink 
                            to="/asin-cost-history" 
                            end
                            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                          >
                            <DollarSign className="h-4 w-4 flex-shrink-0 opacity-75" />
                            <span className="font-medium text-xs">
                              ASIN Cost History
                            </span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}

                      {/* ASIN Sales Health */}
                      {canAccessRoute('/asin-sales-health') && (
                        <SidebarMenuButton
                          asChild
                          className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                            isActive("/asin-sales-health")
                              ? "bg-primary/90 text-primary-foreground shadow-sm" 
                              : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <NavLink 
                            to="/asin-sales-health" 
                            end
                            className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                          >
                            <Activity className="h-4 w-4 flex-shrink-0 opacity-75" />
                            <span className="font-medium text-xs">
                              ASIN Sales Health
                            </span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Noon Section - only show when not collapsed */}
              {!isCollapsed && (canAccessRoute('/noon-order-processing') || canAccessRoute('/noon-order-tracking') || canAccessRoute('/noon-fbpi')) && (
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
                      {canAccessRoute('/noon-order-processing') && <SidebarMenuButton
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
                      </SidebarMenuButton>}
                      
                      {/* Noon Orders Tracking */}
                      {canAccessRoute('/noon-order-tracking') && <SidebarMenuButton
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
                      </SidebarMenuButton>}

                      {/* Noon FBPI Orders */}
                      {canAccessRoute('/noon-fbpi') && <SidebarMenuButton
                        asChild
                        className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                          isActive("/noon-fbpi")
                            ? "bg-primary/90 text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to="/noon-fbpi" 
                          end
                          className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                        >
                          <Package className="h-4 w-4 flex-shrink-0 opacity-75" />
                          <span className="font-medium text-xs">
                            FBPI Orders
                          </span>
                        </NavLink>
                      </SidebarMenuButton>}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Source Section - only show when not collapsed */}
              {!isCollapsed && (canAccessRoute('/sunsky-importer') || canAccessRoute('/sunsky-order-tracking') || canAccessRoute('/sunsky-api-docs') || canAccessRoute('/global-sources')) && (
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
                      {canAccessRoute('/sunsky-importer') && <SidebarMenuButton
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
                      </SidebarMenuButton>}
                      
                      {/* Source Order Tracking */}
                          {canAccessRoute('/sunsky-order-tracking') && <SidebarMenuButton
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
                          </SidebarMenuButton>}

                          {canAccessRoute('/sunsky-api-docs') && <SidebarMenuButton
                            asChild
                            className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                              isActive("/sunsky-api-docs")
                                ? "bg-primary/90 text-primary-foreground shadow-sm" 
                                : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                            }`}
                          >
                            <NavLink 
                              to="/sunsky-api-docs" 
                              end
                              className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                            >
                              <BookOpen className="h-4 w-4 flex-shrink-0 opacity-75" />
                              <span className="font-medium text-xs">
                                Source API Documentation
                              </span>
                            </NavLink>
                          </SidebarMenuButton>}

                          {/* Global Sources */}
                          {canAccessRoute('/global-sources') && <SidebarMenuButton
                            asChild
                            className={`group relative w-full rounded-md transition-all duration-200 ml-2 ${
                              isActive("/global-sources")
                                ? "bg-primary/90 text-primary-foreground shadow-sm" 
                                : "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                            }`}
                          >
                            <NavLink 
                              to="/global-sources" 
                              end
                              className="flex items-center gap-3 no-underline w-full px-3 py-2 rounded-lg"
                            >
                              <Building2 className="h-4 w-4 flex-shrink-0 opacity-75" />
                              <span className="font-medium text-xs">
                                Global Sources
                              </span>
                            </NavLink>
                          </SidebarMenuButton>}
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              )}

              {/* Label Designer */}
              {canAccessRoute('/label-designer') && <SidebarMenuItem>
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
              </SidebarMenuItem>}

              {/* Carrefour Sales Tracker */}
              {canAccessRoute('/carrefour-payments') && <SidebarMenuItem>
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
              </SidebarMenuItem>}

              {/* Tools dropdown - only show when not collapsed and not in native app */}
              {!isCollapsed && !isNative && toolsItems.some(item => canAccessRoute(item.url)) && (
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
                      {toolsItems.filter(item => canAccessRoute(item.url)).map((item) => (
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

              {/* QZ Tray Setup - positioned between Tools and Data Viewer */}
              {canAccessRoute('/qz-tray') && <SidebarMenuItem>
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
              </SidebarMenuItem>}

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
        {canAccessRoute('/preview-settings') && (
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
        )}
        
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