"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/features/ThemeToggle";
import { 
  Cloud, 
  Menu, 
  X, 
  Github, 
  ExternalLink,
  Zap,
  Shield,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigation = [
    { name: "Features", href: "#features", icon: Zap },
    { name: "About", href: "#about", icon: Shield },
    { name: "Mobile", href: "#mobile", icon: Smartphone },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b shadow-sm"
          : "bg-transparent",
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Cloud className="h-8 w-8 text-primary transition-transform duration-300 hover:scale-110" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Forecaster
              </span>
              <span className="text-xs text-muted-foreground -mt-1">
                Weather Planning
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 hover:scale-105"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hidden sm:flex hover:scale-105 transition-transform duration-200"
            >
              <a
                href="https://github.com/forecaster-app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </Button>

            <ThemeToggle />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-4 w-4 transition-transform duration-200 rotate-90" />
              ) : (
                <Menu className="h-4 w-4 transition-transform duration-200" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            isMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <nav className="py-4 space-y-2 border-t">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </a>
            ))}
            <div className="px-4 py-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full justify-start"
              >
                <a
                  href="https://github.com/forecaster-app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4 mr-2" />
                  View on GitHub
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </a>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
