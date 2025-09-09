import { QZTraySetup } from "@/components/label/QZTraySetup";
import { QZTrayStatus } from "@/components/QZTrayStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer } from "lucide-react";

export default function QZTrayPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-lg">
            <Printer className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">QZ Tray Printer Setup</h1>
            <p className="text-muted-foreground text-lg">
              Configure and manage your QZ Tray connection for label printing
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>
              Current QZ Tray connection status and available printers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QZTrayStatus />
          </CardContent>
        </Card>

        {/* Setup Guide */}
        <QZTraySetup />
      </div>
    </div>
  );
}