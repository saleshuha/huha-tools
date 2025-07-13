import { File, Files, Calculator } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const navigationItems = [
  {
    title: "Single File Mapper",
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
    description: "Make the sum of the ASIN QTY and get the unique ASIN with SUM qty"
  }
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const isCollapsed = state === "collapsed"

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/"
    }
    return location.pathname === path
  }

  return (
    <Sidebar collapsible="icon" className="border-r w-72">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-foreground/70 font-semibold px-4 py-3">
            Excel Mapper Tools
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-3">
              {navigationItems.map((item) => (
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
    </Sidebar>
  )
}