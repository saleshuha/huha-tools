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
    icon: Home,
    description: "Calendar, tasks, and dashboard overview"
  }
]

const toolsItems = [
  {
    title: "Excel File Mapper",
    url: "/excel-mapper",
    icon: File,
    description: "Map one source file to one target file"
  },
  {
    title: "Batch Processor",
    url: "/batch",
    icon: Files,
    description: "Process multiple source files with one target template"
  },
  {
    title: "ASIN QTY Sum",
    url: "/asin-sum",
    icon: Calculator,
    description: "Sum quantities by unique ASIN"
  },
  {
    title: "Zip Splitter",
    url: "/zip-splitter",
    icon: Archive,
    description: "Split ZIP files by size or file count limits"
  }
]

const coreItems = [
  {
    title: "Instock Inventory",
    url: "/inventory",
    icon: Package,
    description: "Track product inventory with ASIN and serial numbers"
  },
  {
    title: "Sales & Replenishment",
    url: "/replenishment",
    icon: TrendingUp,
    description: "AI-powered inventory forecasting and restock recommendations"
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border w-72 bg-sidebar shadow-strong">
      <SidebarContent className="bg-gradient-surface">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 font-bold px-6 py-4 text-base">
            HuHa Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3">
            <SidebarMenu className="space-y-2">
              {/* Navigation items */}
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`w-full p-4 rounded-xl transition-all duration-300 min-h-[80px] hover:scale-[1.02] group ${
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
                      <item.icon className="h-6 w-6 flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300" />
                      {!isCollapsed && (
                        <div className="flex flex-col text-left flex-1 space-y-1">
                          <span className="font-bold text-base leading-tight">
                            {item.title}
                          </span>
                          <span className="text-sm opacity-80 leading-relaxed">
                            {item.description}
                          </span>
                        </div>
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
                    className={`w-full p-4 rounded-xl transition-all duration-300 min-h-[80px] hover:scale-[1.02] group ${
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
                      <item.icon className="h-6 w-6 flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300" />
                      {!isCollapsed && (
                        <div className="flex flex-col text-left flex-1 space-y-1">
                          <span className="font-bold text-base leading-tight">
                            {item.title}
                          </span>
                          <span className="text-sm opacity-80 leading-relaxed">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* User Management - Always show for now */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  className={`w-full p-4 rounded-xl transition-all duration-300 min-h-[80px] hover:scale-[1.02] group ${
                    isActive("/users")
                      ? "bg-gradient-primary text-primary-foreground shadow-medium animate-glow-pulse" 
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground glass-container"
                  }`}
                >
                  <NavLink 
                    to="/users" 
                    end
                    className="flex items-start gap-4 no-underline w-full h-full"
                  >
                    <Users className="h-6 w-6 flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300" />
                    {!isCollapsed && (
                      <div className="flex flex-col text-left flex-1 space-y-1">
                        <span className="font-bold text-base leading-tight">
                          User Management
                        </span>
                        <span className="text-sm opacity-80 leading-relaxed">
                          Manage user accounts and permissions
                        </span>
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Enhanced Tools dropdown */}
              <SidebarMenuItem>
                <Collapsible open={isToolsOpen} onOpenChange={setIsToolsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`w-full p-4 rounded-xl transition-all duration-300 min-h-[80px] hover:scale-[1.02] group ${
                        isToolsSectionActive()
                          ? "bg-gradient-accent text-accent-foreground shadow-medium" 
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground glass-container"
                      }`}
                    >
                      <div className="flex items-start gap-4 w-full">
                        <Wrench className="h-6 w-6 flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300" />
                        {!isCollapsed && (
                          <div className="flex flex-col text-left flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-base leading-tight">
                                Tools
                              </span>
                              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${
                                isToolsOpen ? "rotate-180" : ""
                              }`} />
                            </div>
                            <span className="text-sm opacity-80 leading-relaxed">
                              Excel and utility tools
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
                        className={`w-full p-3 rounded-lg transition-all duration-300 min-h-[60px] hover:scale-[1.02] group ${
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
                          <item.icon className="h-5 w-5 flex-shrink-0 mt-1 group-hover:scale-110 transition-transform duration-300" />
                          {!isCollapsed && (
                            <div className="flex flex-col text-left flex-1 space-y-1">
                              <span className="font-semibold text-sm leading-tight">
                                {item.title}
                              </span>
                              <span className="text-xs opacity-80 leading-relaxed">
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
        <Button 
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center gap-2 text-sm hover:scale-105 transition-all duration-300 bg-gradient-to-r from-destructive/10 to-destructive/5 hover:from-destructive hover:to-destructive/80 hover:text-destructive-foreground border-destructive/20 hover:border-destructive"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}