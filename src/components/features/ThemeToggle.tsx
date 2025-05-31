"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ThemeToggle({ 
  className, 
  variant = "ghost", 
  size = "icon" 
}: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn("animate-pulse", className)}
        disabled
      >
        <div className="h-4 w-4 bg-muted rounded" />
        <span className="sr-only">Loading theme toggle</span>
      </Button>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />;
      case "dark":
        return <Moon className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />;
      case "system":
        return <Monitor className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />;
      default:
        return <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Switch to dark mode";
      case "dark":
        return "Switch to system mode";
      case "system":
        return "Switch to light mode";
      default:
        return "Toggle theme";
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={cycleTheme}
      className={cn(
        "transition-all duration-300 hover:scale-105 active:scale-95",
        className
      )}
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
      <span className="sr-only">{getLabel()}</span>
    </Button>
  );
}

export function ThemeToggleWithLabel({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-2 animate-pulse", className)}>
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 w-16 bg-muted rounded" />
      </div>
    );
  }

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm font-medium">Theme:</span>
      <div className="flex rounded-lg border p-1">
        {themes.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={theme === value ? "default" : "ghost"}
            size="sm"
            onClick={() => setTheme(value)}
            className={cn(
              "h-7 px-2 text-xs transition-all duration-200",
              theme === value && "shadow-sm"
            )}
          >
            <Icon className="h-3 w-3 mr-1" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
