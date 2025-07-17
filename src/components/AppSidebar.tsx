import { File, Files, Calculator, Archive, ChevronDown, FolderOpen, Package, CreditCard, Wrench, TrendingUp, LogOut } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
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

const toolsItems = [
  {
    title: "Excel File Mapper",
    url: "/",
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

const standaloneItems = [
  {
    title: "Sales & Ranking Tracker",
    url: "/sales-tracking",
    icon: TrendingUp,
    description: "Track and analyze product sales and ranking data"
  },
  {
    title: "Instock Inventory",
    url: "/inventory",
    icon: Package,
    description: "Track product inventory with ASIN and serial numbers"
  },
  {
    title: "Payments",
    url: "/payments",
    icon: CreditCard,
    description: "Track payments from e-commerce platforms"
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
    <Sidebar collapsible="icon" className="border-r w-72">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-foreground/70 font-semibold px-4 py-3">
            Application
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-3">
              {/* Tools dropdown */}
              <SidebarMenuItem>
                <Collapsible open={isToolsOpen} onOpenChange={setIsToolsOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`w-full p-4 rounded-lg transition-all duration-200 min-h-[80px] ${
                        isToolsSectionActive()
                          ? "bg-primary/10 border border-primary/20 text-primary" 
                          : "hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-start gap-4 w-full">
                        <Wrench className="h-6 w-6 flex-shrink-0 mt-1" />
                        {!isCollapsed && (
                          <div className="flex flex-col text-left flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-base leading-tight">
                                Tools
                              </span>
                              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
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
                        className={`w-full p-3 rounded-lg transition-all duration-200 min-h-[60px] ${
                          isActive(item.url)
                            ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
                            : "hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <NavLink 
                          to={item.url} 
                          end
                          className="flex items-start gap-3 no-underline w-full h-full"
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0 mt-1" />
                          {!isCollapsed && (
                            <div className="flex flex-col text-left flex-1 space-y-1">
                              <span className="font-medium text-sm leading-tight">
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

              {/* Standalone items */}
              {standaloneItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`w-full p-4 rounded-lg transition-all duration-200 min-h-[80px] ${
                      isActive(item.url)
                        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
                        : "hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <NavLink 
                      to={item.url} 
                      end
                      className="flex items-start gap-4 no-underline w-full h-full"
                    >
                      <item.icon className="h-6 w-6 flex-shrink-0 mt-1" />
                      {!isCollapsed && (
                        <div className="flex flex-col text-left flex-1 space-y-1">
                          <span className="font-semibold text-base leading-tight">
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button 
          onClick={handleLogout}
          variant="outline"
          className="w-full flex items-center gap-2 text-sm"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}