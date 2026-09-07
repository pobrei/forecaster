"use client";

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Compass } from 'lucide-react';
import { isAudioMuted, setAudioMuted, playTactileClick } from '@/lib/audio-fx';

interface FilePill {
  id: string;
  num: string;
  label: string;
}

const DOSSIER_FILES: FilePill[] = [
  { id: 'dossier-ingest', num: '01', label: 'Ingest' },
  { id: 'dossier-ensemble', num: '02', label: 'Ensemble' },
  { id: 'dossier-radar', num: '03', label: 'Radar' },
  { id: 'dossier-dynamics', num: '04', label: 'Dynamics' },
  { id: 'dossier-dispatch', num: '05', label: 'Dispatch' },
];

export const DossierPillDock: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string>('dossier-ingest');
  const [isMuted, setIsMutedState] = useState<boolean>(true);
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    setIsMutedState(isAudioMuted());

    const handleAudioToggle = (e: Event) => {
      const custom = e as CustomEvent<{ muted: boolean }>;
      setIsMutedState(custom.detail.muted);
    };

    window.addEventListener('forecaster-audio-toggle', handleAudioToggle);

    // Live UTC Clock
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds} UTC`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => {
      window.removeEventListener('forecaster-audio-toggle', handleAudioToggle);
      clearInterval(timer);
    };
  }, []);

  const handleScrollToFile = (fileId: string) => {
    playTactileClick();
    setActiveFile(fileId);
    const element = document.getElementById(fileId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setAudioMuted(next);
    setIsMutedState(next);
    if (!next) {
      playTactileClick();
    }
  };

  return (
    <nav
      aria-label="Expedition Dossier Navigation"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] pointer-events-none transition-all duration-300"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-background/80 dark:bg-card/80 backdrop-blur-2xl border border-border/50 shadow-xl pointer-events-auto select-none">
        {/* Brand / Logo icon */}
        <div className="flex items-center gap-1.5 pl-1 pr-2 border-r border-border/40 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground">
          <Compass className="h-3.5 w-3.5 text-primary animate-[spin_24s_linear_infinite]" />
          <span className="hidden md:inline font-mono text-[10px] text-primary">DOSSIER</span>
        </div>

        {/* Dossier File Pills */}
        <div className="flex items-center gap-1">
          {DOSSIER_FILES.map((file) => {
            const isActive = activeFile === file.id;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => handleScrollToFile(file.id)}
                className={`relative px-2 sm:px-3 py-1 rounded-full font-mono text-[11px] tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span className="opacity-75">{file.num}</span>
                <span className="hidden sm:inline font-sans text-xs">{file.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Clock & Audio Mute Toggle (Gionatan Nese luxury aesthetic) */}
        <div className="flex items-center gap-2 pl-2 border-l border-border/40">
          {utcTime && (
            <span className="hidden lg:inline-block font-mono text-[10px] text-muted-foreground/80 tracking-wider">
              {utcTime}
            </span>
          )}

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Turn UI sound on' : 'Mute UI sound'}
            title={isMuted ? 'Sound FX: Off' : 'Sound FX: Active'}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isMuted
                ? 'text-muted-foreground/60 hover:text-foreground'
                : 'text-primary bg-primary/10 hover:bg-primary/20'
            }`}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </nav>
  );
};
