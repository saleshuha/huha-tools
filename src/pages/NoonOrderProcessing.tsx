import React from 'react';
import { NoonOrdersUploader } from '@/components/NoonOrdersUploader';

export default function NoonOrderProcessingPage() {
  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Enhanced Background Effects */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary-light)/0.08),transparent_50%)]" />
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary via-primary-light to-primary-dark shadow-glow"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 opacity-100 transition-opacity duration-700"></div>
      </div>
      
      {/* Enhanced Container with Proper Spacing */}
      <div className="relative z-10 app-container space-y-8 py-8 animate-fade-in">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent mb-2">
            🌙 Noon Orders Processing
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload and process Noon order files with store management
          </p>
        </div>

        <NoonOrdersUploader />
      </div>
    </div>
  );
}