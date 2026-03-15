import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { useAsinSalesHealth } from '@/hooks/useAsinSalesHealth';
import { HealthSummaryCards } from '@/components/asin-sales-health/HealthSummaryCards';
import { UploadCalendar } from '@/components/asin-sales-health/UploadCalendar';
import { MonthlyUploadPanel } from '@/components/asin-sales-health/MonthlyUploadPanel';
import { SalesHealthDashboard } from '@/components/asin-sales-health/SalesHealthDashboard';

const currentYear = new Date().getFullYear();

export default function AsinSalesHealth() {
  const [country, setCountry] = useState('UAE');
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { locks, loading, asinHealthData, summary, uploadMonthlyData, unlockMonth } = useAsinSalesHealth(country);

  const isMonthLocked = (y: number, m: number) => locks.some(l => l.year === y && l.month === m);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">ASIN Sales Health Tracker</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UAE">UAE</SelectItem>
              <SelectItem value="KSA">KSA</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYear(y => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{year}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYear(y => y + 1)} disabled={year >= currentYear}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <HealthSummaryCards summary={summary} />

      {/* Calendar + Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <UploadCalendar
            locks={locks}
            onSelectMonth={(y, m) => { setYear(y); setSelectedMonth(m); }}
            onUnlock={(y, m) => unlockMonth(y, m, country)}
            selectedYear={year}
          />
          {year > 2025 && (
            <UploadCalendar
              locks={locks}
              onSelectMonth={(y, m) => { setYear(y); setSelectedMonth(m); }}
              onUnlock={(y, m) => unlockMonth(y, m, country)}
              selectedYear={year - 1}
            />
          )}
        </div>
        {selectedMonth && (
          <MonthlyUploadPanel
            selectedYear={year}
            selectedMonth={selectedMonth}
            country={country}
            onUpload={uploadMonthlyData}
            isLocked={isMonthLocked(year, selectedMonth)}
          />
        )}
      </div>

      {/* Health Dashboard */}
      <SalesHealthDashboard data={asinHealthData} loading={loading} />
    </div>
  );
}
