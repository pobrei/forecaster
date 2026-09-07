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

export function ExpeditionTablet({ children, className }: ExpeditionTabletProps) {
  const [isPoweredOn, setIsPoweredOn] = useState(true);
  const [isPoweringOff, setIsPoweringOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [batteryLevel] = useState<number>(98);
  const { theme, setTheme } = useTheme();

  // Tablet DOM refs & 2.5D Parallax mouse tilt
  const tabletRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // High-performance animation frame & scroll lock refs
  const rafIdRef = useRef<number | null>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const togglePower = useCallback(() => {
    playTactileClick();
    if (isPoweredOn) {
      setIsPoweringOff(true);
      setTimeout(() => {
        setIsPoweredOn(false);
        setIsPoweringOff(false);
      }, 550);
    } else {
      setIsPoweredOn(true);
      playTelemetryChirp();
    }
  }, [isPoweredOn]);

  const toggleFullscreen = useCallback(() => {
    playTactileClick();
    setIsFullscreen((prev) => !prev);
    setTilt({ x: 0, y: 0 });
  }, []);

  const toggleTheme = useCallback(() => {
    playTactileClick();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
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

  // Track active scrolling to eliminate GPU compositing lag during scroll
  const handleScroll = useCallback(() => {
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);
  }, []);

  // Subtle 3D tilt tracking in desk view mode throttled to RAF
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isFullscreen || isScrollingRef.current) return;
    const el = tabletRef.current;
    if (!el) return;

    if (rafIdRef.current) return; // Drop frame if one is already pending

    const clientX = e.clientX;
    const clientY = e.clientY;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (!tabletRef.current || isScrollingRef.current) return;

      const rect = tabletRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Subtle tactile parallax (max ±1.8 deg to avoid blur or composite thrashing)
      const rotX = Math.max(-1.8, Math.min(1.8, ((relY - centerY) / centerY) * -1.8));
      const rotY = Math.max(-2.2, Math.min(2.2, ((relX - centerX) / centerX) * 2.2));

      setTilt({ x: rotX, y: rotY });
    });
  }, [isFullscreen]);

  const handleMouseLeave = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setTilt({ x: 0, y: 0 });
  }, []);

  return (
    <div
      className={cn(
        "relative w-full h-dvh max-h-dvh flex items-center justify-center overflow-hidden select-none transition-all duration-500",
        isFullscreen ? "p-0 m-0" : "p-2 sm:p-4 md:p-6"
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Expedition Tablet Outer Container with Fixed Resolution Dimensions */}
      <div
        ref={tabletRef}
        style={{
          transform: isFullscreen
            ? 'none'
            : `perspective(1400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
          transition: isFullscreen ? 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'transform 0.12s ease-out',
        }}
        className={cn(
          "relative transition-all duration-500 ease-in-out w-full flex flex-col transform-gpu will-change-transform",
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
                  "px-3 py-1 rounded-t-md font-mono text-[9px] uppercase tracking-widest transition-all cursor-pointer select-none flex items-center gap-1.5 shadow-md active:translate-y-0.5",
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
                className="w-3.5 h-12 rounded-l-md bg-slate-700 hover:bg-slate-600 border-l border-y border-slate-500/50 shadow-md transition-all cursor-pointer flex items-center justify-center text-slate-300 hover:text-white"
              >
                <span className="sr-only">Toggle Fullscreen</span>
                <Maximize2 className="h-2.5 w-2.5 rotate-90" />
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title="Toggle day/night sensor mode"
                className="w-3.5 h-10 rounded-l-md bg-slate-700 hover:bg-slate-600 border-l border-y border-slate-500/50 shadow-md transition-all cursor-pointer flex items-center justify-center text-slate-300 hover:text-white"
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
            "relative w-full h-full flex flex-col overflow-hidden transition-all duration-500",
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
              "relative w-full h-full flex flex-col overflow-hidden transition-all duration-300",
              isFullscreen
                ? "p-0 rounded-none border-none bg-background"
                : "rounded-[24px] sm:rounded-[34px] p-1.5 sm:p-2.5 bg-neutral-950 border border-neutral-800/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            )}
          >
            {/* Front Camera & Satellite Uplink Dynamic Pill */}
            {!isFullscreen && (
              <div className="shrink-0 relative mx-auto mb-1.5 flex items-center justify-center select-none">
                <div className="h-3.5 px-3 rounded-full bg-neutral-900/90 border border-neutral-800 flex items-center gap-2 shadow-inner">
                  {/* Front camera lens */}
                  <div className="h-2 w-2 rounded-full bg-neutral-950 border border-neutral-700/60 flex items-center justify-center">
                    <div className="h-0.5 w-0.5 rounded-full bg-blue-500/80" />
                  </div>
                  {/* Active Satellite Link Sensor LED */}
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-[7px] text-emerald-500/90 tracking-widest uppercase">
                      SAT-LINK // ARMED
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* TOUCH SCREEN DISPLAY (With Glare Sheen & Status Bar)    */}
            {/* ======================================================= */}
            <div
              className={cn(
                "relative w-full flex-1 min-h-0 flex flex-col overflow-hidden bg-background text-foreground transition-all duration-300",
                isFullscreen
                  ? "rounded-none"
                  : "rounded-[18px] sm:rounded-[26px] shadow-[inset_0_0_20px_rgba(0,0,0,0.15)] border border-border/40"
              )}
            >
              {/* Diagonal Glass Specular Sheen (Apple / iPad glare effect) */}
              {!isFullscreen && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent opacity-80"
                />
              )}

              {/* ===================================================== */}
              {/* TABLET TOP STATUS BAR (Integrated Telemetry Bar)     */}
              {/* ===================================================== */}
              <div className="shrink-0 z-30 w-full px-4 sm:px-6 py-1.5 bg-background/90 backdrop-blur-md border-b border-border/40 flex items-center justify-between text-[11px] font-mono select-none">
                {/* Left: Clock & Date */}
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="font-semibold text-foreground tracking-wider">{currentTime || '12:00:00'}</span>
                  <span className="text-[10px] hidden sm:inline-block text-muted-foreground/75">{currentDate}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-border/50 bg-muted/40 font-bold uppercase hidden md:inline-block">
                    UTC+2
                  </span>
                </div>

                {/* Center: Mission Header Pill */}
                <div className="flex items-center gap-2 text-[10px] tracking-wider uppercase text-muted-foreground">
                  <Navigation className="h-3 w-3 text-primary animate-pulse hidden sm:inline-block" />
                  <span className="truncate max-w-[200px] sm:max-w-none">
                    FIELD SLATE // WGS84 RECON
                  </span>
                </div>

                {/* Right: Telemetry Indicators */}
                <div className="flex items-center gap-3 text-muted-foreground">
                  {/* Database Atlas Synced indicator */}
                  <div
                    title="MongoDB Atlas Database Synced"
                    className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400"
                  >
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
                    className="p-1 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
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
              {/* DISPLAY SCREEN CONTENT OR STANDBY SLEEP SCREEN        */}
              {/* ===================================================== */}
              {isPoweredOn ? (
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className={cn(
                    "relative flex-1 min-h-0 w-full overflow-y-auto overscroll-contain transform-gpu custom-slate-scrollbar",
                    isPoweringOff && "scale-y-[0.005] brightness-200 opacity-20 filter blur-xs"
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
                    <Power className="h-8 w-8 text-orange-500 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border border-orange-500/30 animate-ping opacity-30" />
                  </div>

                  <div className="space-y-2 max-w-md">
                    <div className="font-mono text-3xl font-extrabold tracking-widest text-white">
                      {currentTime || '12:00:00'}
                    </div>
                    <h3 className="font-mono text-sm tracking-widest text-orange-400 uppercase">
                      EXPEDITION TABLET IN STANDBY
                    </h3>
                    <p className="font-sans text-xs text-neutral-400">
                      Atmospheric sensors and MongoDB background cache remain active. Press the physical Power button or key <kbd className="px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-white font-mono text-[10px]">P</kbd> to awake.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={togglePower}
                    className="px-6 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
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
