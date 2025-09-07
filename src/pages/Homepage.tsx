import { BarChart3 } from "lucide-react";
import { HuhaHeader01 } from "@/components/ui/huha-header-01";
import { PageLayout } from "@/components/layout/PageLayout";

const Homepage = () => {
  return (
    <PageLayout>
      <HuhaHeader01
        icon={<BarChart3 className="w-5 h-5 text-primary-foreground" />}
        title="InStock Analytics Dashboard"
        subtitle="Comprehensive inventory management and analytics platform"
      />
      
      <div className="glass-container p-8">
        {/* Dashboard content would be added here */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Add your dashboard cards here */}
        </div>
      </div>
    </PageLayout>
  );
};

export default Homepage;
