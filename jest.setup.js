import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock OpenLayers
jest.mock('ol/Map', () => {
  return jest.fn().mockImplementation(() => ({
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    getView: jest.fn(() => ({
      fit: jest.fn(),
      setCenter: jest.fn(),
      setZoom: jest.fn(),
    })),
    addOverlay: jest.fn(),
    removeOverlay: jest.fn(),
    setTarget: jest.fn(),
    dispose: jest.fn(),
  }))
})

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(() => <div data-testid="line-chart" />),
  Bar: jest.fn(() => <div data-testid="bar-chart" />),
}))

// Mock file reading
global.FileReader = class {
  readAsText() {
    this.onload({ target: { result: '<gpx></gpx>' } })
  }
}

// Mock fetch
global.fetch = jest.fn()

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
