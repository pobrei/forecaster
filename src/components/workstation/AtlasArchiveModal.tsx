"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  X, 
  Trash2, 
  Calendar, 
  Mountain, 
  Wind, 
  Thermometer, 
  ArrowRight, 
  RefreshCw,
  Sparkles,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Route, WeatherForecast, AppSettings } from '@/types';
import { playTactileClick, playTelemetryChirp } from '@/lib/audio-fx';
import { toast } from 'sonner';

export interface SavedExpeditionSummary {
  id: string;
  name: string;
  description?: string;
  stats: {
    totalDistance: number;
    totalElevationGain?: number;
    estimatedDuration?: number;
    pointCount: number;
    forecastPointCount: number;
    minTemp?: number;
    maxTemp?: number;
    maxWind?: number;
  };
  savedAt: string;
}

export interface FullSavedExpedition extends SavedExpeditionSummary {
  route: Route;
  forecasts: WeatherForecast[];
  settings?: AppSettings;
}

interface AtlasArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: Route | null;
  onLoadExpedition: (expedition: { route: Route; forecasts: WeatherForecast[]; settings?: AppSettings }) => void;
  onSaveCurrentRoute?: () => void;
  isSavingCurrent?: boolean;
}

export function AtlasArchiveModal({
  isOpen,
  onClose,
  activeRoute,
  onLoadExpedition,
  onSaveCurrentRoute,
  isSavingCurrent = false,
}: AtlasArchiveModalProps) {
  const [expeditions, setExpeditions] = useState<SavedExpeditionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingExpeditionId, setLoadingExpeditionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpeditions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/expeditions');
      const data = await res.json();
      if (data.success && Array.isArray(data.expeditions)) {
        setExpeditions(data.expeditions);
      }
    } catch (err) {
      console.error('Failed to load expeditions from Atlas:', err);
      toast.error('Could not retrieve expeditions from Atlas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchExpeditions();
    }
  }, [isOpen, fetchExpeditions]);

  const handleLoad = async (id: string, name: string) => {
    setLoadingExpeditionId(id);
    playTactileClick();
    try {
      toast.loading(`Retrieving "${name}" from Atlas...`, { id: 'load-exp' });
      const res = await fetch(`/api/expeditions/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.expedition) {
        throw new Error(data.error || 'Failed to load expedition');
      }

      const full: FullSavedExpedition = data.expedition;
      playTelemetryChirp();
      onLoadExpedition({
        route: full.route,
        forecasts: full.forecasts || [],
        settings: full.settings,
      });

      toast.dismiss('load-exp');
      toast.success(`Loaded "${full.name}" into workstation!`);
      onClose();
    } catch (err) {
      toast.dismiss('load-exp');
      toast.error(err instanceof Error ? err.message : 'Error loading expedition');
    } finally {
      setLoadingExpeditionId(null);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${name}" from Atlas Archive?`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expeditions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete');
      }
      setExpeditions((prev) => prev.filter((exp) => exp.id !== id));
      toast.success(`Removed "${name}" from Atlas Archive`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[85vh] bg-[#181410] border-2 border-[#453A2E] rounded-xl shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-[#F5F2EB] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#453A2E] bg-[#1C1814]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#82937D]/20 border border-[#82937D]/40 text-[#82937D]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-sm font-bold tracking-wider uppercase text-[#F5F2EB]">
                  ATLAS EXPEDITION ARCHIVE
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#82937D]/20 text-[#82937D] border border-[#82937D]/40">
                  {expeditions.length} SAVED
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#A89F91] mt-0.5">
                MongoDB Atlas Cloud Persistence • Restore past routes & weather synthesis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchExpeditions}
              disabled={isLoading}
              title="Refresh expeditions"
              className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#28221B] transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin text-[#E5A93C]")} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#e06c75] hover:bg-[#28221B] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Action Bar: Save active route if armed */}
        {activeRoute && onSaveCurrentRoute && (
          <div className="px-4 py-2.5 bg-[#1C1814]/70 border-b border-[#453A2E]/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#A89F91]">
              <Sparkles className="h-3.5 w-3.5 text-[#E5A93C]" />
              <span>Active Route: <strong className="text-[#F5F2EB]">{activeRoute.name}</strong> ({activeRoute.totalDistance.toFixed(1)} km)</span>
            </div>

            <button
              type="button"
              onClick={onSaveCurrentRoute}
              disabled={isSavingCurrent}
              className="px-3 py-1 rounded bg-[#E5A93C] hover:bg-[#c9922e] text-[#12100E] font-mono text-xs font-bold tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              <span>{isSavingCurrent ? 'ARCHIVING...' : 'ARCHIVE ACTIVE ROUTE'}</span>
            </button>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {isLoading && expeditions.length === 0 ? (
            <div className="py-16 text-center text-[#A89F91] font-mono text-xs space-y-2">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-[#E5A93C]" />
              <p>QUERYING MONGODB ATLAS ARCHIVE...</p>
            </div>
          ) : expeditions.length === 0 ? (
            <div className="py-16 text-center text-[#A89F91] font-mono text-xs space-y-3">
              <Database className="h-10 w-10 mx-auto opacity-40 text-[#82937D]" />
              <p className="text-sm text-[#F5F2EB] font-bold">NO EXPEDITIONS ARCHIVED YET</p>
              <p className="max-w-sm mx-auto text-[11px] text-[#A89F91]">
                Load or ingest a GPX route, synthesize weather forecasts, and click &ldquo;Archive&rdquo; to save it to MongoDB Atlas.
              </p>
            </div>
          ) : (
            expeditions.map((exp) => {
              const dateStr = new Date(exp.savedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isItemLoading = loadingExpeditionId === exp.id;
              const isItemDeleting = deletingId === exp.id;

              return (
                <div
                  key={exp.id}
                  onClick={() => handleLoad(exp.id, exp.name)}
                  className={cn(
                    "group p-3.5 rounded-lg bg-[#1C1814] hover:bg-[#251F19] border border-[#453A2E] hover:border-[#E5A93C]/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    isItemLoading && "opacity-75 pointer-events-none"
                  )}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#F5F2EB] group-hover:text-[#E5A93C] transition-colors truncate">
                        {exp.name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#A89F91]">
                      <span className="flex items-center gap-1 text-[#F5F2EB]">
                        <Mountain className="h-3 w-3 text-[#E5A93C]" />
                        {exp.stats.totalDistance.toFixed(1)} km
                        {exp.stats.totalElevationGain ? ` • +${Math.round(exp.stats.totalElevationGain)}m` : ''}
                      </span>

                      {exp.stats.minTemp !== undefined && exp.stats.maxTemp !== undefined && (
                        <span className="flex items-center gap-1">
                          <Thermometer className="h-3 w-3 text-red-400" />
                          {exp.stats.minTemp}° to {exp.stats.maxTemp}°C
                        </span>
                      )}

                      {exp.stats.maxWind !== undefined && (
                        <span className="flex items-center gap-1">
                          <Wind className="h-3 w-3 text-cyan-400" />
                          Max {exp.stats.maxWind} m/s
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-[#A89F91]/70">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(exp.id, exp.name, e)}
                      disabled={isItemDeleting}
                      title="Delete expedition"
                      className="p-2 rounded bg-[#16120F] hover:bg-red-950/40 text-[#A89F91] hover:text-red-400 border border-[#453A2E] hover:border-red-900/60 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isItemLoading}
                      className="px-3 py-1.5 rounded bg-[#28221B] group-hover:bg-[#E5A93C] text-[#A89F91] group-hover:text-[#12100E] border border-[#453A2E] group-hover:border-[#E5A93C] font-mono text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <span>{isItemLoading ? 'LOADING...' : 'LOAD'}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#1C1814] border-t border-[#453A2E] text-center font-mono text-[10px] text-[#A89F91]">
          <span>STORAGE ENGINE: MONGODB ATLAS COLLECTION </span>
          <code className="text-[#E5A93C] bg-[#12100E] px-1.5 py-0.5 rounded border border-[#453A2E]">saved_expeditions</code>
        </div>
      </div>
    </div>
  );
}
