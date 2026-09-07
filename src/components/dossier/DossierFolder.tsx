"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { playDossierFlip, playTactileClick } from '@/lib/audio-fx';

export interface DossierFolderProps {
  id: string;
  fileNumber: string; // e.g. "01", "02"
  title: string;
  category: string;
  classification?: string; // e.g. "UNCLASSIFIED // METEOROLOGY"
  coordinateStamp?: string; // e.g. "46°30'N 11°50'E"
  statusBadge?: string; // e.g. "SATELLITE SYNC: OK"
  accentColor?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export const DossierFolder: React.FC<DossierFolderProps> = ({
  id,
  fileNumber,
  title,
  category,
  classification = "UNCLASSIFIED // METEOROLOGY",
  coordinateStamp = "DATUM: WGS84 // GEO-RADAR",
  statusBadge = "LIVE TELEMETRY",
  accentColor = 'indigo',
  children,
  defaultExpanded = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const toggleExpand = () => {
    playDossierFlip();
    setIsExpanded(!isExpanded);
  };

  // Accent color tokens
  const colorMap = {
    indigo: {
      tabBg: "bg-indigo-600 dark:bg-indigo-500",
      tabText: "text-white",
      border: "border-indigo-500/20 dark:border-indigo-400/20",
      accentBg: "bg-indigo-500/10 dark:bg-indigo-400/10",
      badgeText: "text-indigo-600 dark:text-indigo-400",
      earFill: "#4f46e5",
      earFillDark: "#6366f1",
    },
    blue: {
      tabBg: "bg-blue-600 dark:bg-blue-500",
      tabText: "text-white",
      border: "border-blue-500/20 dark:border-blue-400/20",
      accentBg: "bg-blue-500/10 dark:bg-blue-400/10",
      badgeText: "text-blue-600 dark:text-blue-400",
      earFill: "#2563eb",
      earFillDark: "#3b82f6",
    },
    emerald: {
      tabBg: "bg-emerald-600 dark:bg-emerald-500",
      tabText: "text-white",
      border: "border-emerald-500/20 dark:border-emerald-400/20",
      accentBg: "bg-emerald-500/10 dark:bg-emerald-400/10",
      badgeText: "text-emerald-600 dark:text-emerald-400",
      earFill: "#059669",
      earFillDark: "#10b981",
    },
    amber: {
      tabBg: "bg-amber-600 dark:bg-amber-500",
      tabText: "text-white",
      border: "border-amber-500/20 dark:border-amber-400/20",
      accentBg: "bg-amber-500/10 dark:bg-amber-400/10",
      badgeText: "text-amber-600 dark:text-amber-400",
      earFill: "#d97706",
      earFillDark: "#f59e0b",
    },
    rose: {
      tabBg: "bg-rose-600 dark:bg-rose-500",
      tabText: "text-white",
      border: "border-rose-500/20 dark:border-rose-400/20",
      accentBg: "bg-rose-500/10 dark:bg-rose-400/10",
      badgeText: "text-rose-600 dark:text-rose-400",
      earFill: "#e11d48",
      earFillDark: "#f43f5e",
    },
    purple: {
      tabBg: "bg-purple-600 dark:bg-purple-500",
      tabText: "text-white",
      border: "border-purple-500/20 dark:border-purple-400/20",
      accentBg: "bg-purple-500/10 dark:bg-purple-400/10",
      badgeText: "text-purple-600 dark:text-purple-400",
      earFill: "#9333ea",
      earFillDark: "#a855f7",
    },
  };

  const currentThemeColor = colorMap[accentColor] || colorMap.indigo;

  return (
    <section
      id={id}
      className={`relative mb-12 scroll-mt-24 transition-all duration-500 ease-out group ${className}`}
      style={{ perspective: '2000px' }}
    >
      {/* 1. Physical Dossier Tab (Mosby's Files geometry with SVG ear curves) */}
      <div className="flex items-end select-none relative z-10 pl-2 sm:pl-6">
        <div
          onClick={toggleExpand}
          onMouseEnter={playTactileClick}
          className="flex items-center cursor-pointer group/tab transform transition-transform duration-300 hover:-translate-y-1"
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleExpand();
            }
          }}
        >
          {/* Left curved ear of the tab */}
          <svg
            className="h-8 sm:h-9 w-4 sm:w-5 -mr-[1px] flex-shrink-0 text-indigo-600 dark:text-indigo-500"
            viewBox="0 0 20 36"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,36 L0,36 C10,36 14,24 16,12 C17,6 18,0 20,0 L20,36 Z" />
          </svg>

          {/* Main Tab Body */}
          <div
            className={`h-8 sm:h-9 px-4 sm:px-6 flex items-center gap-2.5 sm:gap-3 rounded-t-sm shadow-sm ${currentThemeColor.tabBg} ${currentThemeColor.tabText}`}
          >
            <span className="font-mono text-[11px] sm:text-xs font-bold tracking-widest uppercase opacity-90">
              FILE // {fileNumber}
            </span>
            <span className="h-3 w-[1px] bg-white/30" />
            <span className="font-sans font-semibold text-xs sm:text-sm tracking-tight whitespace-nowrap">
              {title}
            </span>
            <span className="ml-1 opacity-75">
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 transition-transform group-hover/tab:-translate-y-0.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover/tab:translate-y-0.5" />
              )}
            </span>
          </div>

          {/* Right curved ear of the tab */}
          <svg
            className="h-8 sm:h-9 w-4 sm:w-5 -ml-[1px] flex-shrink-0 text-indigo-600 dark:text-indigo-500 scale-x-[-1]"
            viewBox="0 0 20 36"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,36 L0,36 C10,36 14,24 16,12 C17,6 18,0 20,0 L20,36 Z" />
          </svg>
        </div>

        {/* Tab-line metadata (Gionatan Nese monospaced coordinates & datum stamp) */}
        <div className="hidden md:flex items-center gap-4 ml-4 pb-2 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {statusBadge}
          </span>
          <span>•</span>
          <span>{classification}</span>
          <span>•</span>
          <span>{coordinateStamp}</span>
        </div>
      </div>

      {/* 2. Physical Dossier Body Card */}
      <div
        className={`relative rounded-xl border ${currentThemeColor.border} bg-card/85 dark:bg-card/75 backdrop-blur-xl shadow-xl transition-all duration-500 overflow-hidden ${
          isExpanded
            ? 'opacity-100 max-h-[5000px] transform hover:shadow-2xl'
            : 'opacity-60 max-h-0 border-transparent py-0 overflow-hidden shadow-none'
        }`}
      >
        {/* Archival Folder Hairline Ruler along top border */}
        <div className="h-2 w-full bg-muted/40 border-b border-border/40 flex items-center justify-between px-3 overflow-hidden select-none pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className={`h-full w-[1px] ${
                i % 5 === 0 ? 'bg-muted-foreground/40 h-2' : 'bg-muted-foreground/20 h-1'
              }`}
            />
          ))}
        </div>

        {/* Dossier Header Strip */}
        <div className="px-5 sm:px-8 py-3.5 border-b border-border/40 flex flex-wrap items-center justify-between gap-3 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
              <span className="text-primary font-bold">[{fileNumber}]</span>
              <span>{category}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="px-2 py-0.5 rounded border border-border/50 bg-background/50 uppercase">
              EXPEDITION DOSSIER
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded border border-border/50 bg-background/50">
              REF // FC-2026-X9
            </span>
          </div>
        </div>

        {/* Corner Crosshair Registration Marks (Technical Blueprint Style) */}
        <div className="absolute top-4 left-3 font-mono text-[10px] text-muted-foreground/40 pointer-events-none select-none">
          +
        </div>
        <div className="absolute top-4 right-3 font-mono text-[10px] text-muted-foreground/40 pointer-events-none select-none">
          +
        </div>
        <div className="absolute bottom-3 left-3 font-mono text-[10px] text-muted-foreground/40 pointer-events-none select-none">
          +
        </div>
        <div className="absolute bottom-3 right-3 font-mono text-[10px] text-muted-foreground/40 pointer-events-none select-none">
          +
        </div>

        {/* Inner Content Slot */}
        <div className="p-4 sm:p-7 relative z-10">{children}</div>

        {/* Archival Folder Crease Shadow at Bottom */}
        <div className="h-1.5 w-full bg-gradient-to-t from-black/5 dark:from-black/20 to-transparent pointer-events-none" />
      </div>
    </section>
  );
};
