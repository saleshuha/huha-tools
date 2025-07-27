import { File, Files, Calculator, Archive, ChevronDown, FolderOpen, Package, Wrench, LogOut, Home, Users, TrendingUp } from "lucide-react"
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

const navigationItems = [
  {
    title: "Homepage",
    url: "/",
    icon: Home
  }
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
  }
]

const coreItems = [
  {
    title: "Instock Inventory",
    url: "/inventory",
    icon: Package
  },
  {
    title: "Sales & Replenishment",
    url: "/replenishment",
    icon: TrendingUp
  },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const isCollapsed = state === "collapsed"
  const [isToolsOpen, setIsToolsOpen] = useState(true)
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

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border w-64 bg-sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-semibold px-4 py-3 text-sm">
            HuHa Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {/* Navigation items */}
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`w-full p-3 rounded-lg transition-colors ${
                      isActive(item.url)
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <NavLink 
                      to={item.url} 
                      end
                      className="flex items-center gap-3 no-underline w-full"
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

              {/* Core Application Items */}
              {coreItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`w-full p-3 rounded-lg transition-colors ${
                      isActive(item.url)
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <NavLink 
                      to={item.url} 
                      end
                      className="flex items-center gap-3 no-underline w-full"
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

              {/* User Management */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`w-full p-3 rounded-lg transition-colors ${
                    isActive("/users")
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <NavLink 
                    to="/users" 
                    end
                    className="flex items-center gap-3 no-underline w-full"
                  >
                    <Users className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">
                        User Management
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
                      className={`w-full p-3 rounded-lg transition-colors ${
                        isToolsSectionActive()
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Wrench className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && (
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium text-sm">
                              Tools
                            </span>
                            <ChevronDown className={`h-3 w-3 transition-transform ${
                              isToolsOpen ? "rotate-180" : ""
                            }`} />
                          </div>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 mt-1 space-y-1">
                    {toolsItems.map((item) => (
                      <SidebarMenuButton 
                        key={item.title}
                        asChild
                        className={`w-full p-2 rounded-md transition-colors ${
                          isActive(item.url)
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <NavLink 
                          to={item.url} 
                          end
                          className="flex items-center gap-2 no-underline w-full"
                        >
                          <item.icon className="h-3 w-3 flex-shrink-0" />
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
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