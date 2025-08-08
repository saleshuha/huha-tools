import { NavLink } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { Menu, Home, Package, Database, TrendingUp, Wrench, BarChart3, Upload, CreditCard, DollarSign, Store, ShoppingCart, Users, LogOut, Merge, Edit3, Archive, Files, File, ChevronRight } from "lucide-react";

// Local copies of navigation items (keeps theme/colors and routes intact)
const navigationItems = [
  { title: "Homepage", url: "/", icon: Home },
];

const toolsItems = [
  { title: "Excel File Mapper", url: "/excel-mapper", icon: File },
  { title: "Batch Processor", url: "/batch", icon: Files },
  { title: "ASIN QTY Sum", url: "/asin-sum", icon: Database },
  { title: "Zip Splitter", url: "/zip-splitter", icon: Archive },
  { title: "File Merger", url: "/file-merger", icon: Merge },
  { title: "Excel Editor", url: "/excel-editor", icon: Edit3 },
  { title: "Bulk Column Editor", url: "/bulk-column-editor", icon: Database },
];

const coreItems = [
  { title: "Instock Inventory", url: "/inventory", icon: Package },
  { title: "Processed Orders", url: "/processed-orders", icon: Database },
  { title: "Sales & Replenishment", url: "/replenishment", icon: TrendingUp },
];

const paymentReportsItems = [
  { title: "Noon Dashboard", url: "/noon-dashboard", icon: BarChart3 },
  { title: "Store Management", url: "/noon-stores", icon: Store },
  { title: "Sales Data Upload", url: "/noon-sales-data", icon: Upload },
  { title: "Fees Reports", url: "/noon-fees-reports", icon: CreditCard },
  { title: "Payment Reports", url: "/payment-reports", icon: DollarSign },
  { title: "SKU Cost Management", url: "/noon-sku-costs", icon: Database },
  { title: "Analytics Dashboard", url: "/noon-analytics", icon: BarChart3 },
];

function DesktopMenu() {
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

          <NavigationMenuItem>
            <NavigationMenuTrigger className="text-sm">Payment Reports</NavigationMenuTrigger>
            <NavigationMenuContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-[520px]">
                {paymentReportsItems.map((item) => (
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
            <NavLink to="/po-tracker" end className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`
            }>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span>PO Tracker</span>
              </div>
            </NavLink>
          </NavigationMenuItem>
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

function MobileMenu() {
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
            {[{ label: 'Home', items: navigationItems }, { label: 'Core', items: coreItems }, { label: 'Tools', items: toolsItems }, { label: 'Payment Reports', items: paymentReportsItems }].map((group) => (
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
              <NavLink to="/po-tracker" end className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`
              }>
                <ShoppingCart className="h-4 w-4" />
                <span>PO Tracker</span>
              </NavLink>
              <NavLink to="/stores" end className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`
              }>
                <BarChart3 className="h-4 w-4" />
                <span>Carrefour Sales</span>
              </NavLink>
              <NavLink to="/users" end className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`
              }>
                <Users className="h-4 w-4" />
                <span>Users</span>
              </NavLink>
              <SignOutButton className="w-full" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SignOutButton({ className = "" }: { className?: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: "Signed out" });
      // Router will redirect based on auth listener in App
    } catch (e: any) {
      toast({ title: "Sign out failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onSignOut} variant="outline" size="sm" className={className} disabled={loading}>
      <LogOut className="h-4 w-4 mr-2" /> Sign Out
    </Button>
  );
}

export function HeaderNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6">
        <div className="h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MobileMenu />
            <div className="hidden md:flex items-center gap-2">
              <div className="bg-primary/10 rounded-md p-1.5">
                <img src="/lovable-uploads/4f9a15c5-2d12-4ee0-b0bd-e982c5b4ece7.png" alt="HuHa logo" className="h-6 w-6 object-contain" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-sm text-foreground tracking-wide">HuHa Product Management System</span>
                <span className="text-[10px] text-muted-foreground">Professional Inventory & Analytics Platform</span>
              </div>
            </div>
            <DesktopMenu />
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:block text-xs font-medium text-foreground">اللَّهُمَّ صل عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ</span>
            <NavLink to="/users" className={({ isActive }) =>
              `hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`
            }>
              <Users className="h-4 w-4" /> Users
            </NavLink>
            <CountrySwitcher />
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
