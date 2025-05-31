import { NextRequest, NextResponse } from 'next/server';
import { parseGPXFile, generateGPXHash, validateRoute } from '@/lib/gpx-parser';
import { getCachedRoute, setCachedRoute } from '@/lib/mongodb';
import { APIResponse, UploadResponse } from '@/types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('gpx') as File;

    if (!file) {
      return NextResponse.json<APIResponse<null>>({
        success: false,
        error: ERROR_MESSAGES.GPX.INVALID_FILE,
      }, { status: 400 });
    }

    // Generate hash for caching
    const content = await file.text();
    const hash = generateGPXHash(content);

    // Check cache first
    const cachedRoute = await getCachedRoute(hash);
    if (cachedRoute) {
      console.log('Route cache hit for hash:', hash);
      return NextResponse.json<APIResponse<UploadResponse>>({
        success: true,
        data: {
          route: cachedRoute.route,
          message: 'Route loaded from cache'
        }
      });
    }

    // Create a new File object from the content for parsing
    const fileForParsing = new File([content], file.name, { type: file.type });
    
    // Parse GPX file
    const route = await parseGPXFile(fileForParsing);

    // Validate the parsed route
    if (!validateRoute(route)) {
      return NextResponse.json<APIResponse<null>>({
        success: false,
        error: ERROR_MESSAGES.GPX.NO_TRACKS,
      }, { status: 400 });
    }

    // Cache the route
    await setCachedRoute({
      hash,
      route,
      createdAt: new Date(),
      lastAccessed: new Date()
    });

    console.log(`Successfully processed GPX file: ${route.name}`);
    console.log(`Route stats: ${route.points.length} points, ${route.totalDistance.toFixed(2)}km`);

    return NextResponse.json<APIResponse<UploadResponse>>({
      success: true,
      data: {
        route,
        message: SUCCESS_MESSAGES.GPX_UPLOADED
      }
    });

  } catch (error) {
    console.error('GPX upload error:', error);
    
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR;
    
    return NextResponse.json<APIResponse<null>>({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'GPX upload endpoint. Use POST to upload a GPX file.',
    supportedFormats: ['.gpx'],
    maxFileSize: '5MB',
    maxWaypoints: 2000
  });
}
