import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Calendar, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { addDays, subDays } from "date-fns";

interface DateRangeSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: (dateFrom: Date | null, dateTo: Date | null) => Promise<void>;
  isLoading?: boolean;
}

export function DateRangeSyncDialog({
  open,
  onOpenChange,
  onSync,
  isLoading = false
}: DateRangeSyncDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const handlePreset = (days: number | null) => {
    if (days === null) {
      // All Time
      setDateRange(undefined);
    } else {
      setDateRange({
        from: subDays(new Date(), days),
        to: new Date()
      });
    }
  };

  const handleSync = async () => {
    const from = dateRange?.from || null;
    const to = dateRange?.to || null;
    await onSync(from, to);
  };

  const isValid = !dateRange || (dateRange.from && dateRange.to && dateRange.from <= dateRange.to);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Sync Orders by Date Range
          </DialogTitle>
          <DialogDescription>
            Select a date range to sync orders from Sunsky API
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePreset(7)}
              className="flex-1 min-w-[100px]"
            >
              Last 7 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePreset(30)}
              className="flex-1 min-w-[100px]"
            >
              Last 30 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePreset(90)}
              className="flex-1 min-w-[100px]"
            >
              Last 90 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePreset(null)}
              className="flex-1 min-w-[100px]"
            >
              All Time
            </Button>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {dateRange ? "Custom Date Range" : "All Time Selected"}
            </label>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              className="w-full"
            />
            {!isValid && (
              <p className="text-sm text-destructive">
                End date must be after start date
              </p>
            )}
          </div>

          {/* Info message */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            {dateRange?.from && dateRange?.to ? (
              <p>
                Syncing orders created between{" "}
                <strong>{dateRange.from.toLocaleDateString()}</strong> and{" "}
                <strong>{dateRange.to.toLocaleDateString()}</strong>
              </p>
            ) : (
              <p>Syncing all orders (no date filter)</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSync}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              "Sync Orders"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
