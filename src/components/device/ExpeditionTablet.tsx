"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Power,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Battery,
  Navigation,
  Database,
  Radio
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { playTactileClick, playTelemetryChirp } from '@/lib/audio-fx';

interface ExpeditionTabletProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Isolated Tablet Clock component so 1-second ticks NEVER cause
 * the ExpeditionTablet parent or its children to re-render.
 */
function TabletClock() {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDate(
        now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).toUpperCase()
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2.5 text-muted-foreground">
      <span className="font-semibold text-foreground tracking-wider">{time || '12:00:00'}</span>
      <span className="text-[10px] hidden sm:inline-block text-muted-foreground/75">{date}</span>
      <span className="text-[9px] px-1.5 py-0.5 rounded border border-border/50 bg-muted/40 font-bold uppercase hidden md:inline-block">
        UTC+2
      </span>
    </div>
  );
}

export function ExpeditionTablet({ children, className }: ExpeditionTabletProps) {
  const [isPoweredOn, setIsPoweredOn] = useState(true);
  const [isPoweringOff, setIsPoweringOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [batteryLevel] = useState<number>(98);
  const { theme, setTheme } = useTheme();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const togglePower = useCallback(() => {
    playTactileClick();
    if (isPoweredOn) {
      setIsPoweringOff(true);
      setTimeout(() => {
        setIsPoweredOn(false);
        setIsPoweringOff(false);
      }, 500);
    } else {
      setIsPoweredOn(true);
      playTelemetryChirp();
    }
  }, [isPoweredOn]);

  const toggleFullscreen = useCallback(() => {
    playTactileClick();
    setIsFullscreen((prev) => !prev);
  }, []);

  const toggleTheme = useCallback(() => {
    playTactileClick();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Keyboard shortcut listener: P = power toggle, F = fullscreen toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePower();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePower, toggleFullscreen]);

  return (
    <div
      className={cn(
        "relative w-full h-dvh max-h-dvh flex items-center justify-center overflow-hidden select-none",
        isFullscreen ? "p-0 m-0" : "p-2 sm:p-4 md:p-6"
      )}
    >
      {/* Expedition Tablet Outer Container - Solid, Zero Jitter, Fixed Resolution */}
      <div
        className={cn(
          "relative w-full flex flex-col will-change-transform",
          isFullscreen
            ? "h-full w-full max-w-none max-h-none rounded-none border-none shadow-none"
            : "max-w-[1440px] h-full max-h-[920px] min-h-[580px] rounded-[34px] sm:rounded-[44px] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)]",
          className
        )}
      >
        {/* ========================================================= */}
        {/* PHYSICAL HARDWARE SIDE BUTTONS (Inspired by areebali.com) */}
        {/* ========================================================= */}
        {!isFullscreen && (
          <>
            {/* Top-Right Physical Power Button */}
            <div className="absolute -top-3 right-16 sm:right-24 z-30 flex items-center gap-2">
              <button
                type="button"
                onClick={togglePower}
                title={isPoweredOn ? "Put Expedition Tablet to sleep (P)" : "Wake up Expedition Tablet (P)"}
                className={cn(
                  "px-3 py-1 rounded-t-md font-mono text-[9px] uppercase tracking-widest cursor-pointer select-none flex items-center gap-1.5 shadow-md active:translate-y-0.5",
                  isPoweredOn
                    ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-t border-x border-orange-400/50 shadow-orange-500/20"
                    : "bg-slate-700 hover:bg-slate-600 text-slate-300 border-t border-x border-slate-500/50"
                )}
              >
                <Power className="h-2.5 w-2.5" />
                <span>POWER {isPoweredOn ? '[ON]' : '[STANDBY]'}</span>
              </button>
            </div>

            {/* Left Edge Physical Hardware Rockers */}
            <div className="absolute -left-3.5 top-32 z-30 hidden sm:flex flex-col gap-3">
              {/* Fullscreen Mode Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                title="Expand tablet to full workspace (F)"
                className="w-3.5 h-12 rounded-l-md bg-slate-700 hover:bg-slate-600 border-l border-y border-slate-500/50 shadow-md cursor-pointer flex items-center justify-center text-slate-300 hover:text-white"
              >
                <span className="sr-only">Toggle Fullscreen</span>
                <Maximize2 className="h-2.5 w-2.5 rotate-90" />
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title="Toggle day/night sensor mode"
                className="w-3.5 h-10 rounded-l-md bg-slate-700 hover:bg-slate-600 border-l border-y border-slate-500/50 shadow-md cursor-pointer flex items-center justify-center text-slate-300 hover:text-white"
              >
                <span className="sr-only">Toggle Theme</span>
                {theme === 'dark' ? <Sun className="h-2 w-2" /> : <Moon className="h-2 w-2" />}
              </button>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* TABLET CHASSIS: CNC Brushed Aluminum / Titanium Casing   */}
        {/* ========================================================= */}
        <div
          className={cn(
            "relative w-full h-full flex flex-col overflow-hidden",
            isFullscreen
              ? "p-0 bg-background"
              : "p-2 sm:p-3.5 lg:p-4 rounded-[32px] sm:rounded-[42px] border border-border/80 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 dark:from-slate-800 dark:via-slate-900 dark:to-neutral-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.5)]"
          )}
        >
          {/* Subtle Technical Corner Hex Screw Rivets */}
          {!isFullscreen && (
            <>
              <div className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full border border-slate-400/80 dark:border-slate-600/80 bg-slate-300 dark:bg-slate-800 shadow-inner flex items-center justify-center opacity-60">
                <div className="w-1 h-0.5 bg-slate-500/80 rotate-45" />
              </div>
              <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full border border-slate-400/80 dark:border-slate-600/80 bg-slate-300 dark:bg-slate-800 shadow-inner flex items-center justify-center opacity-60">
                <div className="w-1 h-0.5 bg-slate-500/80 -rotate-45" />
              </div>
              <div className="absolute bottom-2.5 left-2.5 h-2 w-2 rounded-full border border-slate-400/80 dark:border-slate-600/80 bg-slate-300 dark:bg-slate-800 shadow-inner flex items-center justify-center opacity-60">
                <div className="w-1 h-0.5 bg-slate-500/80 -rotate-45" />
              </div>
              <div className="absolute bottom-2.5 right-2.5 h-2 w-2 rounded-full border border-slate-400/80 dark:border-slate-600/80 bg-slate-300 dark:bg-slate-800 shadow-inner flex items-center justify-center opacity-60">
                <div className="w-1 h-0.5 bg-slate-500/80 rotate-45" />
              </div>

              {/* Laser-Etched Technical Spec Markings */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-3 text-[7.5px] font-mono tracking-[0.25em] text-slate-500/70 dark:text-slate-400/50 uppercase select-none">
                <span>MIL-STD-810H // TACTICAL EXPEDITION SLATE</span>
                <span>•</span>
                <span>IP68 ALL-WEATHER HOUSING</span>
                <span>•</span>
                <span>GPS / GALILEO DUAL-BAND</span>
              </div>
            </>
          )}

          {/* ========================================================= */}
          {/* BLACK OBSIDIAN SCREEN BEZEL & DYNAMIC ISLAND              */}
          {/* ========================================================= */}
          <div
            className={cn(
              "relative w-full h-full flex flex-col overflow-hidden",
              isFullscreen
                ? "p-0 rounded-none border-none bg-background"
                : "rounded-[24px] sm:rounded-[34px] p-1.5 sm:p-2.5 bg-neutral-950 border border-neutral-800/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            )}
          >
            {/* Front Camera & Satellite Uplink Dynamic Pill (Solid, Steady LED) */}
            {!isFullscreen && (
              <div className="shrink-0 relative mx-auto mb-1.5 flex items-center justify-center select-none">
                <div className="h-3.5 px-3 rounded-full bg-neutral-900/90 border border-neutral-800 flex items-center gap-2 shadow-inner">
                  {/* Front camera lens */}
                  <div className="h-2 w-2 rounded-full bg-neutral-950 border border-neutral-700/60 flex items-center justify-center">
                    <div className="h-0.5 w-0.5 rounded-full bg-blue-500/80" />
                  </div>
                  {/* Steady Solid Emerald Satellite Link LED (No blinking) */}
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                    <span className="font-mono text-[7px] text-emerald-400 tracking-widest uppercase font-semibold">
                      SAT-LINK // ARMED
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* TOUCH SCREEN DISPLAY                                    */}
            {/* ======================================================= */}
            <div
              className={cn(
                "relative w-full flex-1 min-h-0 flex flex-col overflow-hidden bg-background text-foreground",
                isFullscreen
                  ? "rounded-none"
                  : "rounded-[18px] sm:rounded-[26px] shadow-[inset_0_0_20px_rgba(0,0,0,0.15)] border border-border/40"
              )}
            >
              {/* Subtle Screen Specular Sheen (Passive non-interfering layer) */}
              {!isFullscreen && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-br from-white/[0.025] via-transparent to-transparent"
                />
              )}

              {/* ===================================================== */}
              {/* TABLET TOP STATUS BAR (Solid High-Contrast, No Blur) */}
              {/* ===================================================== */}
              <div className="shrink-0 z-30 w-full px-4 sm:px-6 py-1.5 bg-background/95 border-b border-border/40 flex items-center justify-between text-[11px] font-mono select-none">
                {/* Left: Isolated Clock Component */}
                <TabletClock />

                {/* Center: Mission Header Pill */}
                <div className="flex items-center gap-2 text-[10px] tracking-wider uppercase text-muted-foreground">
                  <Navigation className="h-3 w-3 text-primary hidden sm:inline-block" />
                  <span className="truncate max-w-[200px] sm:max-w-none">
                    FIELD SLATE // WGS84 RECON
                  </span>
                </div>

                {/* Right: Telemetry Indicators */}
                <div className="flex items-center gap-3 text-muted-foreground">
                  {/* Database Atlas Synced indicator */}
                  <div
                    title="MongoDB Atlas Database Synced"
                    className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                    <Database className="h-3 w-3 text-emerald-500" />
                    <span className="hidden sm:inline font-semibold">ATLAS</span>
                  </div>

                  {/* Satellite Uplink */}
                  <div className="flex items-center gap-1 text-[10px]" title="Satellite Telemetry Connection">
                    <Radio className="h-3 w-3 text-sky-500" />
                    <span className="hidden sm:inline">5G / SAT</span>
                  </div>

                  {/* Battery */}
                  <div className="flex items-center gap-1 text-[10px]" title={`Battery: ${batteryLevel}%`}>
                    <Battery className="h-3.5 w-3.5 text-foreground" />
                    <span>{batteryLevel}%</span>
                  </div>

                  {/* View Mode Switcher Button inside screen bar */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen (F)" : "Expand to Fullscreen (F)"}
                    className="p-1 rounded hover:bg-muted text-foreground cursor-pointer"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* ===================================================== */}
              {/* INTERNAL SCREEN CONTENT (Smooth, Zero-Lag Scrolling) */}
              {/* ===================================================== */}
              {isPoweredOn ? (
                <div
                  ref={scrollContainerRef}
                  className={cn(
                    "relative flex-1 min-h-0 w-full overflow-y-auto overscroll-contain custom-slate-scrollbar",
                    isPoweringOff && "opacity-0 transition-opacity duration-300"
                  )}
                  style={{
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {children}
                </div>
              ) : (
                /* CRT / OLED Standby Screen */
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 select-none bg-neutral-950 text-neutral-300">
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-neutral-900 border border-neutral-800 shadow-2xl">
                    <Power className="h-8 w-8 text-orange-500" />
                  </div>

                  <div className="space-y-2 max-w-md">
                    <TabletClock />
                    <h3 className="font-mono text-sm tracking-widest text-orange-400 uppercase font-semibold">
                      EXPEDITION TABLET IN STANDBY
                    </h3>
                    <p className="font-sans text-xs text-neutral-400">
                      Atmospheric sensors and MongoDB background cache remain active. Press the physical Power button or key <kbd className="px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-white font-mono text-[10px]">P</kbd> to awake.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={togglePower}
                    className="px-6 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>AWAKE EXPEDITION SLATE</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
