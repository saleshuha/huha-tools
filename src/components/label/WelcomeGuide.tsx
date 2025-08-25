import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Palette, 
  Database, 
  Printer,
  FileText,
  ArrowRight,
  CheckCircle,
  Lightbulb
} from "lucide-react";

interface WelcomeGuideProps {
  onGetStarted: () => void;
}

export function WelcomeGuide({ onGetStarted }: WelcomeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Design Your Labels",
      description: "Use the drag-and-drop canvas to create professional labels with text, shapes, barcodes, and QR codes",
      icon: Palette,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Import Bulk Data",
      description: "Upload CSV or Excel files to generate multiple labels with different data automatically",
      icon: Database,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Save Templates",
      description: "Create reusable templates for consistent branding and faster label creation",
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Print Labels",
      description: "Export to PDF or generate ZPL code for Zebra printers with professional quality",
      icon: Printer,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const features = [
    "Professional canvas editor with Fabric.js",
    "Barcode & QR code generation",
    "CSV/Excel bulk data import",
    "Template management system",
    "PDF export & ZPL generation",
    "Zebra printer compatibility",
    "Real-time preview & editing",
    "Responsive design interface"
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lightbulb className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl mb-2">Welcome to Label Designer</CardTitle>
          <CardDescription className="text-base max-w-2xl mx-auto">
            Create professional labels with our powerful drag-and-drop designer. 
            Perfect for product labels, shipping labels, barcodes, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="hover-scale"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Creating Labels
          </Button>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            How It Works
          </CardTitle>
          <CardDescription>
            Follow these simple steps to create professional labels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border-2 transition-all duration-300 hover-scale ${
                  currentStep === index 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted hover:border-primary/50'
                }`}
                onMouseEnter={() => setCurrentStep(index)}
              >
                <div className={`w-10 h-10 rounded-full ${step.bgColor} flex items-center justify-center mb-3`}>
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Step {index + 1}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Features & Capabilities
          </CardTitle>
          <CardDescription>
            Everything you need for professional label design and printing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Start Tips */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-lg">💡 Quick Start Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <Badge variant="secondary" className="min-w-fit">1</Badge>
            <p>Start with the <strong>Designer</strong> tab to create your first label template</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="secondary" className="min-w-fit">2</Badge>
            <p>Use <strong>Templates</strong> to save and reuse your designs</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="secondary" className="min-w-fit">3</Badge>
            <p>Import data via <strong>Bulk Data</strong> for automated label generation</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="secondary" className="min-w-fit">4</Badge>
            <p>Export your labels via <strong>Print</strong> tab in multiple formats</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}