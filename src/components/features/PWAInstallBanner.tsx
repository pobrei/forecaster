"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Download, Smartphone, Zap, Wifi, WifiOff } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
import { animations } from "@/lib/animations";
import { cn } from "@/lib/utils";

export function PWAInstallBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();

  if (isDismissed || isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setIsDismissed(true);
    }
  };

  return (
    <Card className={cn(
      "fixed bottom-4 left-4 right-4 z-50 border-primary/20 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50",
      animations.fadeInUp
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Install Forecaster App
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Get the full experience with offline access, faster loading, and native app features.
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>Faster</span>
              </div>
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                <span>Offline Ready</span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                <span>No Store</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="h-8 px-3 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Install
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDismissed(true)}
                className="h-8 px-2 text-xs"
              >
                Later
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDismissed(true)}
            className="h-6 w-6 flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PWAOfflineBanner() {
  const { isOnline } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isOnline || isDismissed) {
    return null;
  }

  return (
    <Card className={cn(
      "fixed top-4 left-4 right-4 z-50 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50",
      animations.fadeInDown
    )}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <WifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              You&apos;re offline
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Some features may be limited. Cached data is still available.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDismissed(true)}
            className="h-6 w-6 flex-shrink-0 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
