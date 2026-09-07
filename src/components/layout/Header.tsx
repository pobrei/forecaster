"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import {
  Cloud,
  Github,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  // Navigation removed as requested - keeping only GitHub link and theme toggle

  return (
    <header
      className={cn(
        "relative z-30 w-full pt-1 transition-all duration-300 bg-transparent border-b border-border/30",
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 border border-primary/20">
              <Cloud className="h-5 w-5 text-primary transition-transform duration-300 hover:scale-110" />
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-foreground">
                  FORECASTER
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded border border-primary/30 bg-primary/10 text-primary font-medium uppercase">
                  DOSSIER v2.5
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground/80 tracking-wider -mt-0.5 uppercase">
                METEOROLOGICAL EXPEDITION INTELLIGENCE
              </span>
            </div>
          </div>

          {/* Desktop Navigation - Removed as requested */}

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <div 
              title="MongoDB Atlas Connected: Persistent Caching & Expedition Archive Active"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 select-none"
            >
              <Database className="h-3 w-3 text-emerald-500" />
              <span className="font-semibold tracking-wider">ATLAS CLOUD SYNCED</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hover:scale-105 transition-transform duration-200"
            >
              <a
                href="https://github.com/pobrei/forecaster"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </Button>

            <ThemeToggle />
          </div>
        </div>


      </div>
    </header>
  );
}
