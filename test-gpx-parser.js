// Simple test script to verify GPX parser works
const fs = require('fs');
const path = require('path');

// Mock File API for Node.js
class MockFile {
  constructor(content, name, options = {}) {
    this.content = content;
    this.name = name;
    this.type = options.type || '';
    this.size = Buffer.byteLength(content, 'utf8');
  }

  async text() {
    return this.content;
  }
}

// Test the GPX parser
async function testGPXParser() {
  try {
    // Read the test GPX file
    const gpxContent = fs.readFileSync(path.join(__dirname, 'test-gpx.xml'), 'utf8');
    console.log('GPX Content:', gpxContent.substring(0, 200) + '...');
    
    // Create a mock file
    const mockFile = new MockFile(gpxContent, 'test.gpx', { type: 'application/gpx+xml' });
    
    console.log('Mock file created:', {
      name: mockFile.name,
      size: mockFile.size,
      type: mockFile.type
    });
    
    // Import and test the parser
    const { parseGPXFile } = await import('./src/lib/gpx-parser.ts');
    
    console.log('Testing GPX parser...');
    const route = await parseGPXFile(mockFile);
    
    console.log('Success! Parsed route:', {
      id: route.id,
      name: route.name,
      pointsCount: route.points.length,
      totalDistance: route.totalDistance,
      totalElevationGain: route.totalElevationGain,
      estimatedDuration: route.estimatedDuration
    });
    
  } catch (error) {
    console.error('Error testing GPX parser:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGPXParser();
