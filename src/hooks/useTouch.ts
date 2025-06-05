"use client";

import { useGesture } from '@use-gesture/react'
import { useAnimation } from 'framer-motion'
import { useState, useRef, useCallback, useEffect } from 'react'

// Touch gesture configuration
interface TouchConfig {
  enableSwipe?: boolean
  enablePinch?: boolean
  enableDrag?: boolean
  swipeThreshold?: number
  pinchThreshold?: number
  dragThreshold?: number
}

// Touch gesture handlers
interface TouchHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinchIn?: (scale: number) => void
  onPinchOut?: (scale: number) => void
  onDragStart?: (position: { x: number; y: number }) => void
  onDrag?: (position: { x: number; y: number }) => void
  onDragEnd?: (position: { x: number; y: number }) => void
  onTap?: (position: { x: number; y: number }) => void
  onDoubleTap?: (position: { x: number; y: number }) => void
}

// Enhanced touch hook
export function useTouch(
  config: TouchConfig = {},
  handlers: TouchHandlers = {}
) {
  const {
    enableSwipe = true,
    enablePinch = true,
    enableDrag = true,
    swipeThreshold = 50,
    pinchThreshold = 0.1,
    dragThreshold = 10,
  } = config

  const [isPressed, setIsPressed] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  const ref = useRef<HTMLElement>(null)

  // Animation controls for touch feedback
  const controls = useAnimation()
  const [animationState, setAnimationState] = useState({
    scale: 1,
    x: 0,
    y: 0,
  })

  // Gesture handling
  const bind = useGesture(
    {
      onDrag: ({ active, movement: [mx, my], initial, first, last }) => {
        if (!enableDrag) return

        if (first) {
          setIsPressed(true)
          handlers.onDragStart?.({ x: initial[0], y: initial[1] })
        }

        if (active && (Math.abs(mx) > dragThreshold || Math.abs(my) > dragThreshold)) {
          handlers.onDrag?.({ x: mx, y: my })
          setAnimationState({ scale: 1, x: mx, y: my })
          controls.start({ x: mx, y: my })
        }

        if (last) {
          setIsPressed(false)
          handlers.onDragEnd?.({ x: mx, y: my })
          setAnimationState({ scale: 1, x: 0, y: 0 })
          controls.start({ x: 0, y: 0 })
        }
      },

      onPinch: ({ offset: [scale], first, last }) => {
        if (!enablePinch) return

        if (first) {
          setIsPressed(true)
        }

        if (scale > 1 + pinchThreshold) {
          handlers.onPinchOut?.(scale)
        } else if (scale < 1 - pinchThreshold) {
          handlers.onPinchIn?.(scale)
        }

        setAnimationState(prev => ({ ...prev, scale }))
        controls.start({ scale })

        if (last) {
          setIsPressed(false)
          setAnimationState(prev => ({ ...prev, scale: 1 }))
          controls.start({ scale: 1 })
        }
      },

      onMove: ({ movement: [mx, my], last, velocity: [vx, vy] }) => {
        if (!enableSwipe || !last) return

        const absX = Math.abs(mx)
        const absY = Math.abs(my)

        // Determine swipe direction based on movement and velocity
        if (absX > swipeThreshold || absY > swipeThreshold) {
          if (absX > absY) {
            // Horizontal swipe
            if (mx > 0 && vx > 0.5) {
              handlers.onSwipeRight?.()
            } else if (mx < 0 && vx < -0.5) {
              handlers.onSwipeLeft?.()
            }
          } else {
            // Vertical swipe
            if (my > 0 && vy > 0.5) {
              handlers.onSwipeDown?.()
            } else if (my < 0 && vy < -0.5) {
              handlers.onSwipeUp?.()
            }
          }
        }
      },

      onClick: ({ event }) => {
        const now = Date.now()
        const timeDiff = now - lastTap

        if (timeDiff < 300 && timeDiff > 0) {
          // Double tap
          handlers.onDoubleTap?.({
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
          })
        } else {
          // Single tap
          setTimeout(() => {
            if (Date.now() - now > 250) {
              handlers.onTap?.({
                x: (event as MouseEvent).clientX,
                y: (event as MouseEvent).clientY,
              })
            }
          }, 250)
        }

        setLastTap(now)
      },
    },
    {
      drag: { threshold: dragThreshold },
      pinch: { threshold: pinchThreshold },
    }
  )

  return {
    bind,
    controls,
    animationState,
    isPressed,
    ref,
  }
}

// Touch-optimized button hook
export function useTouchButton(onPress?: () => void) {
  const [isPressed, setIsPressed] = useState(false)
  const controls = useAnimation()

  const bind = useGesture({
    onPointerDown: () => {
      setIsPressed(true)
      controls.start({ scale: 0.95 })
    },
    onPointerUp: () => {
      setIsPressed(false)
      controls.start({ scale: 1 })
      onPress?.()
    },
    onPointerLeave: () => {
      setIsPressed(false)
      controls.start({ scale: 1 })
    },
  })

  return {
    bind,
    controls,
    isPressed,
  }
}

// Swipeable list hook
export function useSwipeableList<T>(
  items: T[],
  onSwipeLeft?: (item: T, index: number) => void,
  onSwipeRight?: (item: T, index: number) => void
) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const controls = useAnimation()

  const bind = useGesture({
    onDrag: ({ active, movement: [mx], direction: [xDir], last, velocity: [vx] }) => {
      if (active) {
        controls.start({ x: mx })
      } else if (last) {
        const shouldSwipe = Math.abs(mx) > 50 || Math.abs(vx) > 0.5

        if (shouldSwipe) {
          if (xDir > 0 && currentIndex > 0) {
            // Swipe right - go to previous
            setCurrentIndex(currentIndex - 1)
            onSwipeRight?.(items[currentIndex], currentIndex)
          } else if (xDir < 0 && currentIndex < items.length - 1) {
            // Swipe left - go to next
            setCurrentIndex(currentIndex + 1)
            onSwipeLeft?.(items[currentIndex], currentIndex)
          }
        }

        controls.start({ x: 0 })
      }
    },
  })

  return {
    bind,
    controls,
    currentIndex,
    setCurrentIndex,
    currentItem: items[currentIndex],
  }
}

// Touch-optimized chart interactions
export function useTouchChart(
  onPointSelect?: (index: number) => void,
  onZoom?: (scale: number) => void,
  onPan?: (offset: { x: number; y: number }) => void
) {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })

  const bind = useGesture({
    onPinch: ({ offset: [scale] }) => {
      const newZoom = Math.max(0.5, Math.min(3, scale))
      setZoomLevel(newZoom)
      onZoom?.(newZoom)
    },
    onDrag: ({ movement: [mx, my], pinching }) => {
      if (!pinching) {
        const newOffset = { x: mx, y: my }
        setPanOffset(newOffset)
        onPan?.(newOffset)
      }
    },
    onPointerDown: ({ event }) => {
      // Calculate which point was touched based on chart dimensions
      const rect = (event.target as Element).getBoundingClientRect()
      const x = event.clientX - rect.left
      const pointIndex = Math.floor((x / rect.width) * 10) // Assuming 10 data points
      
      setSelectedPoint(pointIndex)
      onPointSelect?.(pointIndex)
    },
  })

  return {
    bind,
    selectedPoint,
    zoomLevel,
    panOffset,
    setSelectedPoint,
    resetZoom: () => {
      setZoomLevel(1)
      setPanOffset({ x: 0, y: 0 })
    },
  }
}

// Haptic feedback (for supported devices)
export function useHapticFeedback() {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      }
      navigator.vibrate(patterns[type])
    }
  }, [])

  return { triggerHaptic }
}

// Touch accessibility helpers
export function useTouchAccessibility() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true)
      }
    }

    const handlePointerDown = () => {
      setIsKeyboardUser(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  return { isKeyboardUser }
}
