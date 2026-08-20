import { parseGPXFile, sampleRoutePoints, generateGPXHash } from '../gpx-parser';

describe('GPX Parser Extended Tests', () => {
  test('Parses GPX with <rte> and <rtept> route elements', async () => {
    const rteGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Strava" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Alps Route</name>
  </metadata>
  <rte>
    <name>Pass Route</name>
    <rtept lat="46.50" lon="11.35">
      <ele>1200</ele>
      <time>2026-08-21T09:00:00Z</time>
    </rtept>
    <rtept lat="46.55" lon="11.40">
      <ele>1450</ele>
      <time>2026-08-21T09:30:00Z</time>
    </rtept>
    <rtept lat="46.60" lon="11.45">
      <ele>1800</ele>
      <time>2026-08-21T10:00:00Z</time>
    </rtept>
  </rte>
</gpx>`;

    const file = new File([rteGpx], 'alps.gpx', { type: 'application/gpx+xml' });
    const route = await parseGPXFile(file);

    expect(route.name).toBe('Pass Route');
    expect(route.points.length).toBe(3);
    expect(route.totalDistance).toBeGreaterThan(0);
    expect(route.totalElevationGain).toBe(600); // 1200->1450 (+250) + 1450->1800 (+350) = 600
  });

  test('Parses GPX with multiple <trk> tracks and combines points', async () => {
    const multiTrkGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Segment 1</name>
    <trkseg>
      <trkpt lat="45.0" lon="9.0"><ele>100</ele></trkpt>
      <trkpt lat="45.1" lon="9.1"><ele>150</ele></trkpt>
    </trkseg>
  </trk>
  <trk>
    <name>Segment 2</name>
    <trkseg>
      <trkpt lat="45.2" lon="9.2"><ele>200</ele></trkpt>
      <trkpt lat="45.3" lon="9.3"><ele>250</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const file = new File([multiTrkGpx], 'multi.gpx', { type: 'application/gpx+xml' });
    const route = await parseGPXFile(file);

    expect(route.points.length).toBe(4);
    expect(route.totalElevationGain).toBe(150);
  });

  test('sampleRoutePoints samples points correctly at desired interval', async () => {
    const multiPointGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Long Track</name>
    <trkseg>
      <trkpt lat="45.00" lon="9.00"><ele>100</ele></trkpt>
      <trkpt lat="45.10" lon="9.10"><ele>120</ele></trkpt>
      <trkpt lat="45.20" lon="9.20"><ele>140</ele></trkpt>
      <trkpt lat="45.30" lon="9.30"><ele>160</ele></trkpt>
      <trkpt lat="45.40" lon="9.40"><ele>180</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const file = new File([multiPointGpx], 'long.gpx', { type: 'application/gpx+xml' });
    const route = await parseGPXFile(file);

    const sampled = sampleRoutePoints(route, 15); // sample every 15km
    expect(sampled.length).toBeGreaterThanOrEqual(2);
    expect(sampled[0].distance).toBe(0);
    expect(sampled[sampled.length - 1].distance).toBeCloseTo(route.totalDistance, 1);
  });

  test('generateGPXHash generates unique hash for content', () => {
    const content1 = '<gpx>1</gpx>';
    const content2 = '<gpx>2</gpx>';
    expect(generateGPXHash(content1)).not.toBe(generateGPXHash(content2));
    expect(generateGPXHash(content1)).toBe(generateGPXHash(content1));
  });
});
