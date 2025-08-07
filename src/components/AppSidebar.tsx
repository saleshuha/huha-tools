import React, { useState, createElement } from "react"
import { File, Files, Calculator, Archive, ChevronDown, FolderOpen, Package, Wrench, LogOut, Home, Users, TrendingUp, Merge, Edit3, Database, CreditCard, Upload, BarChart3, DollarSign, Store, ShoppingCart, Building, Zap } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
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

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    description: "Overview and key metrics"
  },
]

const inventoryItems = [
  {
    title: "Manage Inventory",
    url: "/inventory",
    icon: Package,
    description: "Stock levels and SKU management"
  },
  {
    title: "Processed Orders",
    url: "/processed-orders",
    icon: ShoppingCart,
    description: "Order fulfillment tracking"
  },
  {
    title: "Replenishment",
    url: "/replenishment",
    icon: TrendingUp,
    description: "Restock recommendations"
  },
  {
    title: "PO Tracker",
    url: "/po-tracker",
    icon: Building,
    description: "Purchase order management"
  }
]

const salesReportsItems = [
  {
    title: "Noon Dashboard",
    url: "/noon-dashboard",
    icon: BarChart3,
    description: "Sales performance overview"
  },
  {
    title: "Store Management",
    url: "/noon-stores",
    icon: Store,
    description: "Multi-store configuration"
  },
  {
    title: "Sales Data Upload",
    url: "/noon-sales-data",
    icon: Upload,
    description: "Import sales reports"
  },
  {
    title: "Fees Reports",
    url: "/noon-fees-reports",
    icon: CreditCard,
    description: "Platform fee analysis"
  },
  {
    title: "Payment Reports",
    url: "/payment-reports",
    icon: DollarSign,
    description: "Financial statements"
  },
  {
    title: "SKU Cost Management",
    url: "/noon-sku-costs",
    icon: Database,
    description: "Product cost tracking"
  },
  {
    title: "Analytics Dashboard",
    url: "/noon-analytics",
    icon: BarChart3,
    description: "Business intelligence"
  },
  {
    title: "Carrefour Sales",
    url: "/carrefour-payments",
    icon: Building,
    description: "Carrefour marketplace data"
  }
]

const toolsItems = [
  {
    title: "Excel File Mapper",
    url: "/excel-mapper",
    icon: File,
    description: "Map spreadsheet columns"
  },
  {
    title: "Batch Processor",
    url: "/batch",
    icon: Files,
    description: "Process multiple files"
  },
  {
    title: "ASIN QTY Sum",
    url: "/asin-sum",
    icon: Calculator,
    description: "Calculate quantity totals"
  },
  {
    title: "Zip Splitter",
    url: "/zip-splitter",
    icon: Archive,
    description: "Extract compressed files"
  },
  {
    title: "File Merger",
    url: "/file-merger",
    icon: Merge,
    description: "Combine multiple files"
  },
  {
    title: "Excel Editor",
    url: "/excel-editor",
    icon: Edit3,
    description: "Edit spreadsheet data"
  },
  {
    title: "Bulk Column Editor",
    url: "/bulk-column-editor",
    icon: Database,
    description: "Mass text replacement"
  }
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const isCollapsed = state === "collapsed"
  const [isInventoryOpen, setIsInventoryOpen] = useState(true)
  const [isSalesReportsOpen, setIsSalesReportsOpen] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  
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

  const isGroupActive = (items: any[]) => {
    return items.some(item => isActive(item.url))
  }

  const renderNavItem = (item: any, isSubItem = false) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton 
        asChild
        className={`group relative w-full transition-all duration-150 ${
          isSubItem ? 'ml-2 rounded-md h-8' : 'rounded-md h-9'
        } ${
          isActive(item.url)
            ? "bg-primary text-primary-foreground shadow-sm border-l-2 border-l-primary-foreground/20" 
            : "hover:bg-accent/50 hover:text-accent-foreground text-muted-foreground"
        }`}
      >
        <NavLink 
          to={item.url} 
          end
          className={`flex items-center no-underline w-full ${
            isSubItem ? 'px-3 py-1.5' : 'px-3 py-2'
          }`}
        >
          <item.icon className={`flex-shrink-0 ${isSubItem ? 'h-4 w-4' : 'h-4 w-4'}`} />
          {!isCollapsed && (
            <div className="ml-3 min-w-0 flex-1">
              <span className={`font-medium ${isSubItem ? 'text-xs' : 'text-sm'} block truncate`}>
                {item.title}
              </span>
              {!isSubItem && item.description && (
                <span className="text-xs text-muted-foreground/70 block truncate mt-0.5">
                  {item.description}
                </span>
              )}
            </div>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )

  const renderCollapsibleSection = (title: string, items: any[], isOpen: boolean, setIsOpen: (open: boolean) => void, icon: any) => (
    <SidebarMenuItem>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className={`group relative w-full rounded-md h-9 transition-all duration-150 ${
              isGroupActive(items)
                ? "bg-accent text-accent-foreground shadow-sm" 
                : "hover:bg-accent/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center w-full px-3 py-2">
              {icon && createElement(icon, { className: "h-4 w-4 flex-shrink-0" })}
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full ml-3">
                  <span className="font-medium text-sm">
                    {title}
                  </span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`} />
                </div>
              )}
            </div>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-0.5">
          {items.map((item) => renderNavItem(item, true))}
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )

  return (
    <Sidebar collapsible="icon" className="border-r bg-card/50 backdrop-blur-sm w-64">
      <SidebarContent className="py-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80 px-4 py-2 mb-1 uppercase tracking-wider">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-0.5">
              {navigationItems.map((item) => renderNavItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Inventory Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80 px-4 py-2 mb-1 uppercase tracking-wider">
            Inventory
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-0.5">
              {renderCollapsibleSection("Inventory Management", inventoryItems, isInventoryOpen, setIsInventoryOpen, Package)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sales & Reports Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80 px-4 py-2 mb-1 uppercase tracking-wider">
            Sales & Reports
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-0.5">
              {renderCollapsibleSection("Sales Analytics", salesReportsItems, isSalesReportsOpen, setIsSalesReportsOpen, BarChart3)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80 px-4 py-2 mb-1 uppercase tracking-wider">
            Utilities
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-0.5">
              {renderCollapsibleSection("Data Tools", toolsItems, isToolsOpen, setIsToolsOpen, Zap)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t space-y-1">
        {isAdmin && (
          <SidebarMenuButton 
            asChild
            className={`group relative w-full rounded-md h-9 transition-all duration-150 ${
              isActive("/users")
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <NavLink 
              to="/users" 
              end
              className="flex items-center no-underline w-full px-3 py-2"
            >
              <Users className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium text-sm ml-3">
                  User Management
                </span>
              )}
            </NavLink>
          </SidebarMenuButton>
        )}
        
        <Button 
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs font-medium border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
        >
          <LogOut className="h-3 w-3" />
          {!isCollapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}