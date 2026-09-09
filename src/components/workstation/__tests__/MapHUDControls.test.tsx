import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapHUDControls } from '../MapHUDControls';

jest.mock('@/lib/audio-fx', () => ({
  playTactileClick: jest.fn(),
}));

describe('MapHUDControls Component', () => {
  it('renders RADAR, VECTORS, and CLOUDS buttons with correct active styling', () => {
    const onToggleRadar = jest.fn();
    const onToggleWindVectors = jest.fn();
    const onToggleClouds = jest.fn();

    render(
      <MapHUDControls
        radarActive={true}
        onToggleRadar={onToggleRadar}
        windVectorsActive={true}
        onToggleWindVectors={onToggleWindVectors}
        cloudsActive={false}
        onToggleClouds={onToggleClouds}
      />
    );

    // RADAR is active
    const radarBtn = screen.getByRole('button', { name: /radar/i });
    expect(radarBtn).toBeInTheDocument();
    expect(radarBtn).toHaveAttribute('title', 'Disable Precipitation Radar');

    // VECTORS is active
    const vectorsBtn = screen.getByRole('button', { name: /vectors/i });
    expect(vectorsBtn).toBeInTheDocument();
    expect(vectorsBtn).toHaveAttribute('title', 'Disable Wind Vectors');

    // CLOUDS is inactive
    const cloudsBtn = screen.getByRole('button', { name: /clouds/i });
    expect(cloudsBtn).toBeInTheDocument();
    expect(cloudsBtn).toHaveAttribute('title', 'Enable Cloud Meters');
  });

  it('triggers onToggle callbacks and plays tactile audio on click', () => {
    const { playTactileClick } = require('@/lib/audio-fx');
    const onToggleRadar = jest.fn();
    const onToggleWindVectors = jest.fn();
    const onToggleClouds = jest.fn();

    render(
      <MapHUDControls
        radarActive={false}
        onToggleRadar={onToggleRadar}
        windVectorsActive={false}
        onToggleWindVectors={onToggleWindVectors}
        cloudsActive={false}
        onToggleClouds={onToggleClouds}
      />
    );

    const radarBtn = screen.getByRole('button', { name: /radar/i });
    fireEvent.click(radarBtn);
    expect(onToggleRadar).toHaveBeenCalledTimes(1);
    expect(playTactileClick).toHaveBeenCalled();

    const vectorsBtn = screen.getByRole('button', { name: /vectors/i });
    fireEvent.click(vectorsBtn);
    expect(onToggleWindVectors).toHaveBeenCalledTimes(1);

    const cloudsBtn = screen.getByRole('button', { name: /clouds/i });
    fireEvent.click(cloudsBtn);
    expect(onToggleClouds).toHaveBeenCalledTimes(1);
  });

  it('does not render an empty container when zoom controls are omitted', () => {
    const { container } = render(
      <MapHUDControls
        radarActive={true}
        onToggleRadar={jest.fn()}
        windVectorsActive={true}
        onToggleWindVectors={jest.fn()}
        cloudsActive={false}
        onToggleClouds={jest.fn()}
      />
    );

    // Only one cluster div should exist (the layer toggle cluster)
    const clusters = container.querySelectorAll('.backdrop-blur-md');
    expect(clusters.length).toBe(1);
  });

  it('renders zoom controls container when zoom handlers are provided', () => {
    const onZoomIn = jest.fn();
    const onZoomOut = jest.fn();

    const { container } = render(
      <MapHUDControls
        radarActive={true}
        onToggleRadar={jest.fn()}
        windVectorsActive={true}
        onToggleWindVectors={jest.fn()}
        cloudsActive={false}
        onToggleClouds={jest.fn()}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
    );

    const clusters = container.querySelectorAll('.backdrop-blur-md');
    expect(clusters.length).toBe(2);

    const zoomInBtn = screen.getByTitle('Zoom In');
    fireEvent.click(zoomInBtn);
    expect(onZoomIn).toHaveBeenCalledTimes(1);
  });
});
