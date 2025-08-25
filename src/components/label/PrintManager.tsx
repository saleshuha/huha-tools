import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Printer, 
  Download, 
  Eye, 
  Play,
  Pause,
  Square,
  FileText,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Clock
} from "lucide-react";

export const PrintManager = () => {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [printQuantity, setPrintQuantity] = useState(1);
  const [printStatus, setPrintStatus] = useState("idle"); // idle, printing, paused, completed

  const templates = [
    { id: "1", name: "Product Labels v2", size: "50x30mm", lastUsed: "2 hours ago" },
    { id: "2", name: "Warehouse SKUs", size: "100x50mm", lastUsed: "1 day ago" },
    { id: "3", name: "QR Code Labels", size: "75x40mm", lastUsed: "3 days ago" },
    { id: "4", name: "Price Tags", size: "50x30mm", lastUsed: "1 week ago" },
  ];

  const printers = [
    { id: "1", name: "Zebra ZD420", status: "online", type: "Thermal", location: "Warehouse A" },
    { id: "2", name: "DYMO LabelWriter", status: "online", type: "Direct Thermal", location: "Office" },
    { id: "3", name: "Brother QL-820NWB", status: "offline", type: "Thermal", location: "Warehouse B" },
  ];

  const printJobs = [
    { id: "1", template: "Product Labels v2", quantity: 500, status: "completed", progress: 100, time: "10 min ago" },
    { id: "2", template: "Warehouse SKUs", quantity: 250, status: "printing", progress: 65, time: "Running" },
    { id: "3", template: "QR Code Labels", quantity: 100, status: "queued", progress: 0, time: "Pending" },
  ];

  const handlePrint = () => {
    if (!selectedTemplate) return;
    setPrintStatus("printing");
    // Print logic would go here
    console.log("Starting print job:", { template: selectedTemplate, quantity: printQuantity });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "text-success";
      case "offline": return "text-destructive";
      case "completed": return "text-success";
      case "printing": return "text-primary";
      case "queued": return "text-warning";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return CheckCircle2;
      case "printing": return Play;
      case "queued": return Clock;
      case "offline": return AlertTriangle;
      default: return CheckCircle2;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Print Setup */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                Print Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Template</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <Button
                      key={template.id}
                      variant={selectedTemplate === template.id ? "default" : "outline"}
                      className="h-auto p-4 justify-start"
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="text-left w-full">
                        <div className="font-semibold">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.size} • {template.lastUsed}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Print Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={printQuantity}
                    onChange={(e) => setPrintQuantity(Number(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="printer">Printer</Label>
                  <select className="w-full p-2 border rounded">
                    {printers.filter(p => p.status === "online").map((printer) => (
                      <option key={printer.id} value={printer.id}>
                        {printer.name} ({printer.location})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quality">Quality</Label>
                  <select className="w-full p-2 border rounded">
                    <option>Standard</option>
                    <option>High</option>
                    <option>Draft</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  onClick={handlePrint}
                  disabled={!selectedTemplate || printStatus === "printing"}
                  className="bg-gradient-primary hover:shadow-medium"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {printStatus === "printing" ? "Printing..." : "Start Print"}
                </Button>
                
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Print Jobs Queue */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                Print Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {printJobs.map((job) => {
                  const StatusIcon = getStatusIcon(job.status);
                  return (
                    <div key={job.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${getStatusColor(job.status)}`} />
                        <div>
                          <p className="font-medium">{job.template}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.quantity} labels • {job.time}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {job.status === "printing" && (
                          <div className="flex items-center gap-2">
                            <Progress value={job.progress} className="w-20" />
                            <span className="text-sm">{job.progress}%</span>
                          </div>
                        )}
                        
                        <Badge 
                          variant="secondary" 
                          className={`${
                            job.status === "completed" ? "bg-success/10 text-success" :
                            job.status === "printing" ? "bg-primary/10 text-primary" :
                            job.status === "queued" ? "bg-warning/10 text-warning" :
                            "bg-muted"
                          }`}
                        >
                          {job.status}
                        </Badge>
                        
                        {job.status === "printing" && (
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Pause className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Square className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Printer Status */}
        <div className="space-y-6">
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald" />
                Available Printers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {printers.map((printer) => (
                  <div key={printer.id} className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{printer.name}</h4>
                      <Badge 
                        variant="secondary"
                        className={`${
                          printer.status === "online" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {printer.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{printer.type}</p>
                    <p className="text-xs text-muted-foreground">{printer.location}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Print Statistics */}
          <Card className="glass-container">
            <CardHeader>
              <CardTitle className="text-lg">Today's Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Labels Printed</span>
                <span className="font-semibold">1,247</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Jobs Completed</span>
                <span className="font-semibold">23</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Active Printers</span>
                <span className="font-semibold">2 of 3</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Avg. Job Time</span>
                <span className="font-semibold">4.5 min</span>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Printer Utilization</span>
                  <span>78%</span>
                </div>
                <Progress value={78} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};