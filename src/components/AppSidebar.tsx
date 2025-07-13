import { File, Files, Calculator, ChevronDown, FolderOpen } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useState } from "react"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const excelMapperItems = [
  {
    title: "Single Processing",
    url: "/",
    icon: File,
    description: "Map one source file to one target file"
  },
  {
    title: "Batch Processor",
    url: "/batch",
    icon: Files,
    description: "Process multiple source files with one target template"
  }
]

const standaloneItems = [
  {
    title: "ASIN QTY Sum",
    url: "/asin-sum",
    icon: Calculator,
    description: "Sum quantities by unique ASIN"
  }
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const isCollapsed = state === "collapsed"
  const [isMapperOpen, setIsMapperOpen] = useState(true)

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/"
    }
    return location.pathname === path
  }

  const isMapperSectionActive = () => {
    return excelMapperItems.some(item => isActive(item.url))
  }

  return (
    <Sidebar collapsible="icon" className="border-r w-72">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-foreground/70 font-semibold px-4 py-3">
            Excel Tools
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-3">
              {/* Excel File Mapper with sub-buttons */}
              <SidebarMenuItem>
                <Collapsible open={isMapperOpen} onOpenChange={setIsMapperOpen}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={`w-full p-4 rounded-lg transition-all duration-200 min-h-[80px] ${
                        isMapperSectionActive()
                          ? "bg-primary/10 border border-primary/20 text-primary" 
                          : "hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-start gap-4 w-full">
                        <FolderOpen className="h-6 w-6 flex-shrink-0 mt-1" />
                        {!isCollapsed && (
                          <div className="flex flex-col text-left flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-base leading-tight">
                                Excel File Mapper
                              </span>
                              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                                isMapperOpen ? "rotate-180" : ""
                              }`} />
                            </div>
                            <span className="text-sm opacity-80 leading-relaxed">
                              Excel processing tools
                            </span>
                          </div>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-6 mt-2 space-y-2 animate-accordion-down">
                    {excelMapperItems.map((item) => (
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
    </Sidebar>
  )
}