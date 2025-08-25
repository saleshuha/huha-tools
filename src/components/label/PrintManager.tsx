import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
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
  Clock,
  Zap
} from "lucide-react";

export const PrintManager = () => {
  const [selectedTemplate, setSelectedTemplate] = useState("1");
  const [printQuantity, setPrintQuantity] = useState(100);
  const [printStatus, setPrintStatus] = useState("idle");

  const templates = [
    { id: "1", name: "Product Labels Pro", size: "50x30mm", lastUsed: "5 minutes ago", elements: 4 },
    { id: "2", name: "Warehouse Inventory", size: "100x50mm", lastUsed: "2 hours ago", elements: 6 },
    { id: "3", name: "QR Menu Cards", size: "75x40mm", lastUsed: "1 day ago", elements: 3 },
  ];

  const printers = [
    { id: "1", name: "Zebra ZD420", status: "online", type: "Thermal", queue: 12 },
    { id: "2", name: "DYMO LabelWriter", status: "online", type: "Direct Thermal", queue: 3 },
    { id: "3", name: "Brother QL-820", status: "maintenance", type: "Thermal", queue: 0 },
  ];

  const printJobs = [
    { id: "1", template: "Product Labels Pro", quantity: 500, status: "completed", progress: 100, time: "2 min ago" },
    { id: "2", template: "Warehouse Inventory", quantity: 250, status: "printing", progress: 78, time: "Running" },
    { id: "3", template: "QR Menu Cards", quantity: 100, status: "queued", progress: 0, time: "Pending" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Print Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {template.size} • {template.elements} elements
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={printQuantity}
                    onChange={(e) => setPrintQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quality</Label>
                  <select className="w-full p-2 border rounded">
                    <option>High (300 DPI)</option>
                    <option>Standard (203 DPI)</option>
                    <option>Draft (150 DPI)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Printer</Label>
                  <select className="w-full p-2 border rounded">
                    {printers.filter(p => p.status === "online").map((printer) => (
                      <option key={printer.id} value={printer.id}>
                        {printer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="bg-gradient-primary hover:shadow-lg flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Print {printQuantity} Labels
                </Button>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Print Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {printJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
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
                      <Badge variant="secondary">{job.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Printers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {printers.map((printer) => (
                  <div key={printer.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{printer.name}</h4>
                      <Badge variant={printer.status === "online" ? "default" : "secondary"}>
                        {printer.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{printer.type}</p>
                    <p className="text-xs text-muted-foreground">{printer.queue} jobs in queue</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};