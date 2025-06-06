// Test script for weather API validation
const testWeatherAPI = async () => {
  const testRoute = {
    id: "test-route-123",
    name: "Test Route",
    description: "A test route for validation",
    points: [
      {
        lat: 40.7128,
        lon: -74.0060,
        elevation: 10,
        distance: 0
      },
      {
        lat: 40.7589,
        lon: -73.9851,
        elevation: 15,
        distance: 5.2
      }
    ],
    totalDistance: 5.2,
    totalElevationGain: 5,
    estimatedDuration: 1200000, // 20 minutes in milliseconds
    createdAt: new Date().toISOString()
  };

  const testSettings = {
    startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    averageSpeed: 15,
    forecastInterval: 5,
    units: "metric",
    timezone: "UTC"
  };

  const requestBody = {
    route: testRoute,
    settings: testSettings
  };

  console.log('Testing weather API with data:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch('http://localhost:3001/api/weather', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('API Error:', result);
    } else {
      console.log('✅ API call successful!');
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Run the test
testWeatherAPI();
