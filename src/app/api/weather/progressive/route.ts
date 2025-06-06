import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Progressive weather forecast endpoint for large routes.',
    description: 'Processes weather data in chunks to avoid timeouts on large routes.',
    status: 'working'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Progressive weather API called with:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Progressive weather API is working!',
      data: {
        received: body,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Progressive weather API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
