// Animation utilities and configurations

export const animations = {
  // Fade animations
  fadeIn: "animate-fade-in",
  fadeOut: "animate-fade-out",
  fadeInUp: "animate-fade-in animate-slide-in-from-bottom",
  fadeInDown: "animate-fade-in animate-slide-in-from-top",
  fadeInLeft: "animate-fade-in animate-slide-in-from-left",
  fadeInRight: "animate-fade-in animate-slide-in-from-right",

  // Scale animations
  scaleIn: "animate-zoom-in",
  scaleOut: "animate-zoom-out",

  // Slide animations
  slideInFromTop: "animate-slide-in-from-top",
  slideInFromBottom: "animate-slide-in-from-bottom",
  slideInFromLeft: "animate-slide-in-from-left",
  slideInFromRight: "animate-slide-in-from-right",

  // Bounce animations
  bounceIn: "animate-bounce",
  pulse: "animate-pulse",
  spin: "animate-spin",

  // Hover animations
  hoverScale: "hover:scale-105 transition-transform duration-200",
  hoverScaleSmall: "hover:scale-102 transition-transform duration-200",
  hoverLift: "hover:-translate-y-1 hover:shadow-lg transition-all duration-200",
  hoverGlow: "hover:shadow-lg hover:shadow-primary/25 transition-all duration-300",

  // Focus animations
  focusRing: "focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200",
  focusScale: "focus:scale-105 transition-transform duration-200",

  // Loading animations
  shimmer: "animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
  skeleton: "animate-pulse bg-muted",

  // Stagger animations (for lists)
  staggerChildren: "space-y-2",
  staggerDelay: {
    1: "delay-0",
    2: "delay-100",
    3: "delay-200",
    4: "delay-300",
  },
} as const;

// Transition configurations
export const transitions = {
  default: "transition-all duration-200 ease-in-out",
  fast: "transition-all duration-150 ease-in-out",
  slow: "transition-all duration-300 ease-in-out",
  bounce: "transition-all duration-200 ease-bounce",
  spring: "transition-all duration-300 ease-spring",
} as const;

// Easing functions
export const easings = {
  easeInOut: "ease-in-out",
  easeIn: "ease-in",
  easeOut: "ease-out",
  linear: "linear",
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
} as const;

// Animation delays
export const delays = {
  none: "delay-0",
  short: "delay-75",
  medium: "delay-150",
  long: "delay-300",
  extraLong: "delay-500",
} as const;

// Utility function to combine animation classes
export function combineAnimations(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}

// Utility function to create staggered animations
export function createStaggeredAnimation(
  baseAnimation: string,
  itemCount: number,
  delayIncrement: number = 100
): string[] {
  return Array.from({ length: itemCount }, (_, index) => 
    `${baseAnimation} delay-[${index * delayIncrement}ms]`
  );
}

// Intersection Observer animation utility
export function createInViewObserver(
  element: HTMLElement,
  callback: (isInView: boolean) => void,
  threshold: number = 0.1
) {
  if (typeof window === 'undefined') return null;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        callback(true);
        observer.disconnect();
      }
    },
    { threshold }
  );

  observer.observe(element);
  return observer;
}

// Prefers reduced motion check
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Conditional animation utility
export function conditionalAnimation(
  animation: string,
  condition: boolean = true
): string {
  if (prefersReducedMotion()) return "";
  return condition ? animation : "";
}


