"use client";

import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  FileCheck, 
  Mountain, 
  Compass, 
  RotateCcw, 
  Sparkles, 
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route } from '@/types';
import { playTactileClick, playTelemetryChirp } from '@/lib/audio-fx';
import { SAMPLE_EXPEDITIONS, createAlpine45KmSampleRoute } from '@/lib/sample-routes';
import { toast } from 'sonner';

interface GpxDropzoneProps {
  route: Route | null;
  onRouteLoaded: (route: Route) => void;
  onResetRoute?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function GpxDropzone({
  route,
  onRouteLoaded,
  onResetRoute,
  isLoading = false,
  className,
}: GpxDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processGpxFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      toast.error('Invalid format. Please supply a valid .gpx file');
      return;
    }

    setIsProcessing(true);
    playTelemetryChirp();
    toast.loading(`Parsing GPX route: ${file.name}...`, { id: 'gpx-upload' });

    try {
      const formData = new FormData();
      formData.append('gpx', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.route) {
        throw new Error(json.error || 'Failed to parse GPX route coordinates');
      }

      toast.dismiss('gpx-upload');
      toast.success(`Loaded: ${json.data.route.name}`, {
        description: `${json.data.route.totalDistance.toFixed(1)} km • ${json.data.route.points.length} waypoints`,
      });

      onRouteLoaded(json.data.route);
    } catch (err) {
      toast.dismiss('gpx-upload');
      console.error('GPX Ingestion Error:', err);
      toast.error(err instanceof Error ? err.message : 'Error processing GPX file');
    } finally {
      setIsProcessing(false);
    }
  }, [onRouteLoaded]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processGpxFile(files[0]);
      }
    },
    [processGpxFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processGpxFile(files[0]);
    }
  };

  const handleLoadAlpine45 = () => {
    playTactileClick();
    const sample = createAlpine45KmSampleRoute();
    toast.success('Loaded "Alpine 45km" Swiss Traverse', {
      description: '45.0 km • +1,850m gain • Klausen Pass summit',
    });
    onRouteLoaded(sample);
  };

  const handleSelectPreset = (presetId: string) => {
    playTactileClick();
    setShowPresetMenu(false);
    const preset = SAMPLE_EXPEDITIONS.find((p) => p.id === presetId);
    if (preset) {
      toast.success(`Loaded: ${preset.title}`, {
        description: `${preset.distanceKm} km • +${preset.elevationGainM}m elevation`,
      });
      onRouteLoaded(preset.route);
    }
  };

  return (
    <div className={cn("space-y-3 font-mono", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#A89F91]">
          <Compass className="h-3.5 w-3.5 text-[#E5A93C]" />
          <span>ROUTE INGESTION • GPX</span>
        </div>

        {route && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#82937D]/20 text-[#82937D] border border-[#82937D]/40">
            <span className="h-1.5 w-1.5 rounded-full bg-[#82937D]" />
            ARMED
          </span>
        )}
      </div>

      {!route ? (
        <div className="space-y-2.5">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 select-none overflow-hidden",
              isDragOver
                ? "border-[#E5A93C] bg-[#E5A93C]/10 shadow-[0_0_20px_rgba(229,169,60,0.2)]"
                : "border-[#453A2E] hover:border-[#E5A93C]/60 bg-[#16120F]/80 hover:bg-[#1c1814]"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx,application/gpx+xml"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center border transition-all duration-150",
                  isDragOver
                    ? "bg-[#E5A93C]/20 border-[#E5A93C] text-[#E5A93C] scale-105"
                    : "bg-[#28221B] border-[#453A2E] text-[#A89F91] group-hover:text-[#E5A93C] group-hover:border-[#E5A93C]/50"
                )}
              >
                <UploadCloud className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-semibold text-[#F5F2EB] group-hover:text-[#E5A93C] transition-colors">
                  {isDragOver ? "Drop GPX track here" : "Drag and drop GPX track or browse"}
                </p>
                <p className="font-mono text-[10px] text-[#A89F91] mt-0.5">
                  Standard WGS84 GPS Track (.gpx) • Max 15MB
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadAlpine45}
              disabled={isLoading || isProcessing}
              className="flex-1 py-2 px-3 rounded-lg border border-[#453A2E] bg-[#28221B] hover:bg-[#342B23] text-[#E5A93C] font-mono text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50"
            >
              <Mountain className="h-3.5 w-3.5 text-[#E5A93C]" />
              <span>Load Sample Route (Alpine 45km)</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPresetMenu(!showPresetMenu)}
                title="Select from other route presets"
                className="p-2 rounded-lg border border-[#453A2E] bg-[#16120F] hover:bg-[#28221B] text-[#F5F2EB] transition-colors cursor-pointer"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {showPresetMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[#453A2E] bg-[#16120F]/95 backdrop-blur-md shadow-2xl p-1.5 z-50 space-y-1 font-mono text-[11px]">
                  <div className="px-2 py-1 text-[10px] text-[#A89F91] uppercase tracking-wider border-b border-[#453A2E]">
                    EXPEDITION ROUTE PRESETS
                  </div>
                  {SAMPLE_EXPEDITIONS.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => handleSelectPreset(exp.id)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#28221B] text-[#F5F2EB] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-[#F5F2EB]">{exp.title}</div>
                        <div className="text-[10px] text-[#A89F91]">{exp.region}</div>
                      </div>
                      <span className="text-[10px] text-[#E5A93C] font-bold">{exp.distanceKm}k</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#453A2E] bg-[#1c1814]/90 p-3.5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#82937D] uppercase tracking-wider">
                <FileCheck className="h-3.5 w-3.5" />
                <span>EXPEDITION ARMED</span>
              </div>
              <h3 className="font-bold text-sm text-[#F5F2EB] truncate mt-0.5" title={route.name}>
                {route.name}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                playTactileClick();
                if (onResetRoute) onResetRoute();
              }}
              title="Replace / Clear Route"
              className="p-1 rounded-md hover:bg-[#28221B] text-[#A89F91] hover:text-[#E5A93C] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs select-none tabular-nums">
            <div className="p-2 rounded-lg bg-[#16120F] border border-[#453A2E]">
              <span className="text-[10px] text-[#A89F91] uppercase block">DISTANCE</span>
              <span className="font-bold text-[#E5A93C]">{route.totalDistance.toFixed(1)} km</span>
            </div>

            <div className="p-2 rounded-lg bg-[#16120F] border border-[#453A2E]">
              <span className="text-[10px] text-[#A89F91] uppercase block">ELEV GAIN</span>
              <span className="font-bold text-[#82937D]">
                {route.totalElevationGain ? `+${Math.round(route.totalElevationGain)}m` : 'N/A'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#16120F] border border-[#453A2E]">
              <span className="text-[10px] text-[#A89F91] uppercase block">WAYPOINTS</span>
              <span className="font-bold text-[#F5F2EB]">{route.points.length} nodes</span>
            </div>

            <div className="p-2 rounded-lg bg-[#16120F] border border-[#453A2E]">
              <span className="text-[10px] text-[#A89F91] uppercase block">EST DURATION</span>
              <span className="font-bold text-[#E5A93C]">
                {route.estimatedDuration ? `${route.estimatedDuration.toFixed(1)}h` : '~3.5h'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadAlpine45}
            className="w-full py-1.5 rounded-lg border border-[#453A2E] hover:border-[#E5A93C]/50 bg-[#16120F] text-[#A89F91] hover:text-[#E5A93C] font-mono text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-[#E5A93C]" />
            <span>Switch to Alpine 45km Track</span>
          </button>
        </div>
      )}
    </div>
  );
}
