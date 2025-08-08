import { NavLink } from "react-router-dom";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import { Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

function SignOutButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: "Signed out" });
    } catch (e: any) {
      toast({ title: "Sign out failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onSignOut} variant="outline" size="sm" disabled={loading}>
      <LogOut className="h-4 w-4 mr-2" /> Sign Out
    </Button>
  );
}

export function TopHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6">
        <div className="h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 rounded-md p-1.5">
                <img src="/lovable-uploads/4f9a15c5-2d12-4ee0-b0bd-e982c5b4ece7.png" alt="HuHa logo" className="h-6 w-6 object-contain" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-sm text-foreground tracking-wide">HuHa Product Management System</span>
                <span className="text-[10px] text-muted-foreground">Professional Inventory & Analytics Platform</span>
              </div>
            </div>
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