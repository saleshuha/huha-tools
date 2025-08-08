import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu, Home, Package, Database, TrendingUp, Wrench, BarChart3, Users, LogOut, Merge, Edit3, Archive, Files, File, ChevronRight, ShoppingCart } from "lucide-react";

const navigationItems = [
  { title: "Homepage", url: "/", icon: Home },
];

const coreItems = [
  { title: "Instock Inventory", url: "/inventory", icon: Package },
  { title: "Processed Orders", url: "/processed-orders", icon: Database },
  { title: "Sales & Replenishment", url: "/replenishment", icon: TrendingUp },
  { title: "PO Tracker", url: "/po-tracker", icon: ShoppingCart },
  { title: "User Management", url: "/users", icon: Users },
];

const toolsItems = [
  { title: "Excel File Mapper", url: "/excel-mapper", icon: File },
  { title: "Excel Editor", url: "/excel-editor", icon: Edit3 },
  { title: "Batch Processor", url: "/batch", icon: Files },
  { title: "ASIN QTY Sum", url: "/asin-sum", icon: Database },
  { title: "Zip Splitter", url: "/zip-splitter", icon: Archive },
  { title: "File Merger", url: "/file-merger", icon: Merge },
  { title: "Bulk Column Editor", url: "/bulk-column-editor", icon: Database },
  { title: "SKU Cost Management", url: "/sku-costs", icon: Database },
];

function DesktopNav() {
  return (
    <nav className="hidden md:flex items-center gap-2">
      <NavigationMenu>
        <NavigationMenuList>
          {navigationItems.map((item) => (
            <NavigationMenuItem key={item.title}>
              <NavLink to={item.url} end className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`
              }>
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </div>
              </NavLink>
            </NavigationMenuItem>
          ))}

          <NavigationMenuItem>
            <NavigationMenuTrigger className="text-sm">Core</NavigationMenuTrigger>
            <NavigationMenuContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-[420px]">
                {coreItems.map((item) => (
                  <NavLink key={item.title} to={item.url} end className={({ isActive }) =>
                    `flex items-center gap-2 p-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`
                  }>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                  </NavLink>
                ))}
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger className="text-sm">Tools</NavigationMenuTrigger>
            <NavigationMenuContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-[520px]">
                {toolsItems.map((item) => (
                  <NavLink key={item.title} to={item.url} end className={({ isActive }) =>
                    `flex items-center gap-2 p-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`
                  }>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                  </NavLink>
                ))}
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {/* Standalone important routes */}
          <NavigationMenuItem>
            <NavLink to="/stores" end className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`
            }>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Carrefour Sales</span>
              </div>
            </NavLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  );
}

function MobileNav() {
  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px]">
          <SheetHeader>
            <SheetTitle>HuHa Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {[{ label: 'Home', items: navigationItems }, { label: 'Core', items: coreItems }, { label: 'Tools', items: toolsItems }].map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink key={item.title} to={item.url} end className={({ isActive }) =>
                      `flex items-center gap-2 p-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`
                    }>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-2 space-y-1">
              <NavLink to="/stores" end className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`
              }>
                <BarChart3 className="h-4 w-4" />
                <span>Carrefour Sales</span>
              </NavLink>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function NavBar() {
  return (
    <div className="sticky top-14 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6">
        <div className="h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav />
            <DesktopNav />
          </div>
        </div>
      </div>
    </div>
  );
}