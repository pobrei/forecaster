"use client";

import { useState, useEffect, useCallback } from 'react';

interface AccessibilityState {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  prefersDarkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  isKeyboardUser: boolean;
  screenReaderActive: boolean;
}

export function useAccessibility() {
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersDarkMode: false,
    fontSize: 'medium',
    isKeyboardUser: false,
    screenReaderActive: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check media queries
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Update state based on media queries
    const updateAccessibilityState = () => {
      setAccessibilityState(prev => ({
        ...prev,
        prefersReducedMotion: reducedMotionQuery.matches,
        prefersHighContrast: highContrastQuery.matches,
        prefersDarkMode: darkModeQuery.matches,
      }));
    };

    // Initial check
    updateAccessibilityState();

    // Listen for changes
    reducedMotionQuery.addEventListener('change', updateAccessibilityState);
    highContrastQuery.addEventListener('change', updateAccessibilityState);
    darkModeQuery.addEventListener('change', updateAccessibilityState);

    // Detect keyboard usage
    let keyboardUsed = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        keyboardUsed = true;
        setAccessibilityState(prev => ({ ...prev, isKeyboardUser: true }));
      }
    };

    const handleMouseDown = () => {
      if (keyboardUsed) {
        keyboardUsed = false;
        setAccessibilityState(prev => ({ ...prev, isKeyboardUser: false }));
      }
    };

    // Detect screen reader
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasAriaLive = document.querySelector('[aria-live]');
      const hasScreenReaderText = document.querySelector('.sr-only');
      const userAgent = navigator.userAgent.toLowerCase();
      
      const screenReaderIndicators = [
        'nvda',
        'jaws',
        'voiceover',
        'talkback',
        'orca'
      ];

      const hasScreenReaderUA = screenReaderIndicators.some(indicator => 
        userAgent.includes(indicator)
      );

      setAccessibilityState(prev => ({
        ...prev,
        screenReaderActive: !!(hasAriaLive || hasScreenReaderText || hasScreenReaderUA)
      }));
    };

    // Get font size preference
    const getFontSizePreference = () => {
      const fontSize = localStorage.getItem('forecaster-font-size') as AccessibilityState['fontSize'];
      if (fontSize && ['small', 'medium', 'large'].includes(fontSize)) {
        setAccessibilityState(prev => ({ ...prev, fontSize }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    detectScreenReader();
    getFontSizePreference();

    return () => {
      reducedMotionQuery.removeEventListener('change', updateAccessibilityState);
      highContrastQuery.removeEventListener('change', updateAccessibilityState);
      darkModeQuery.removeEventListener('change', updateAccessibilityState);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const setFontSize = useCallback((size: AccessibilityState['fontSize']) => {
    setAccessibilityState(prev => ({ ...prev, fontSize: size }));
    localStorage.setItem('forecaster-font-size', size);
    
    // Apply font size to document
    const root = document.documentElement;
    switch (size) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      default:
        root.style.fontSize = '16px';
    }
  }, []);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (typeof window === 'undefined') return;

    // Create or update aria-live region
    let liveRegion = document.getElementById('sr-live-region');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'sr-live-region';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      document.body.appendChild(liveRegion);
    }

    // Clear and set new message
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion!.textContent = message;
    }, 100);
  }, []);

  const getFocusableElements = useCallback((container: HTMLElement = document.body) => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
      
      if (e.key === 'Escape') {
        // Allow escape to close modals/dialogs
        const escapeEvent = new CustomEvent('escape-pressed');
        container.dispatchEvent(escapeEvent);
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [getFocusableElements]);

  const getAccessibilityClasses = useCallback(() => {
    const classes = [];
    
    if (accessibilityState.prefersReducedMotion) {
      classes.push('motion-reduce');
    }
    
    if (accessibilityState.prefersHighContrast) {
      classes.push('high-contrast');
    }
    
    if (accessibilityState.isKeyboardUser) {
      classes.push('keyboard-user');
    }
    
    classes.push(`font-size-${accessibilityState.fontSize}`);
    
    return classes.join(' ');
  }, [accessibilityState]);

  return {
    ...accessibilityState,
    setFontSize,
    announceToScreenReader,
    getFocusableElements,
    trapFocus,
    getAccessibilityClasses,
  };
}
