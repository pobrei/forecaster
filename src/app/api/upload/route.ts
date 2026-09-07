import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseGPXFile, generateGPXHash, validateRoute } from '@/lib/gpx-parser';
import { getCachedRoute, setCachedRoute } from '@/lib/mongodb';
import { APIResponse, UploadResponse } from '@/types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, GPX_CONSTRAINTS } from '@/lib/constants';
import { createErrorHandler, withRetryAndTimeout } from '@/lib/api-error-handler';
import { createValidationMiddleware } from '@/lib/api-validation';
import { secureFileValidationSchema, gpxContentValidationSchema } from '@/lib/validation';
import { ValidationError } from '@/lib/error-tracking';

const uploadValidationSchema = z.object({
  gpx: z.instanceof(File)
    .refine((file) => file.size > 0, 'File cannot be empty')
    .refine((file) => file.size <= GPX_CONSTRAINTS.MAX_FILE_SIZE,
      `File size must be less than ${GPX_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`)
    .refine((file) => file.name.toLowerCase().trim().endsWith('.gpx'),
      'File must have .gpx extension')
    .refine((file) => {
      // iOS Safari compatible MIME type validation
      const validMimeTypes = GPX_CONSTRAINTS.MIME_TYPES;
      return file.type === '' || (validMimeTypes as readonly string[]).includes(file.type);
    }, 'Invalid file type - please select a GPX file')
});

const validateUpload = createValidationMiddleware<z.infer<typeof uploadValidationSchema>, UploadResponse>(uploadValidationSchema);

async function uploadHandler(
  validatedData: z.infer<typeof uploadValidationSchema>,
  _request: NextRequest
): Promise<NextResponse<APIResponse<UploadResponse>>> {
  const { gpx: file } = validatedData;

  // Enhanced file validation with iOS Safari compatibility
  console.log('Server-side file validation:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  });

  const fileValidation = secureFileValidationSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  });

  if (!fileValidation.success) {
    console.error('File validation failed:', fileValidation.error.issues);

    // Provide more specific error messages for iOS Safari users
    const errors = fileValidation.error.issues;
    const mimeTypeError = errors.find(e => e.path.includes('type'));
    const nameError = errors.find(e => e.path.includes('name'));

    let userFriendlyMessage = 'Invalid file properties. Please ensure you are uploading a valid GPX file.';

    if (mimeTypeError && file.type === '') {
      userFriendlyMessage = 'File type detection failed. This is common on iOS Safari. Please ensure your file has a .gpx extension and try again.';
    } else if (nameError) {
      userFriendlyMessage = 'Invalid filename. Please ensure your file has a .gpx extension and contains only letters, numbers, spaces, dots, and hyphens.';
    }

    throw new ValidationError(userFriendlyMessage, {
      errors: fileValidation.error.issues,
      isIOSSafariIssue: file.type === ''
    });
  }

  // Read and validate file content
  const content = await withRetryAndTimeout(
    () => file.text(),
    { maxRetries: 2, timeout: 10000 }
  );

  const contentValidation = gpxContentValidationSchema.safeParse(content);
  if (!contentValidation.success) {
    throw new ValidationError(
      'Invalid GPX content',
      { errors: contentValidation.error.issues }
    );
  }

  // Generate hash for caching
  const hash = generateGPXHash(content);

  // Check cache with fast timeout (max 800ms to avoid stalling response)
  let cachedRoute;
  try {
    cachedRoute = await withRetryAndTimeout(
      () => getCachedRoute(hash),
      { maxRetries: 1, timeout: 800 }
    );
  } catch (error) {
    // Log cache error but don't fail the request
    console.warn('Cache lookup failed or timed out, parsing directly:', error);
  }

  if (cachedRoute) {
    console.log('Route cache hit for hash:', hash);
    return NextResponse.json<APIResponse<UploadResponse>>({
      success: true,
      data: {
        route: cachedRoute.route,
        message: 'Route loaded from cache'
      },
      timestamp: new Date()
    });
  }

  // Parse GPX file
  const fileForParsing = new File([content], file.name, { type: file.type });
  const route = await parseGPXFile(fileForParsing);

  // Validate the parsed route
  if (!validateRoute(route)) {
    throw new ValidationError(ERROR_MESSAGES.GPX.NO_TRACKS);
  }

  // Cache the route in background (fire-and-forget, never delays upload response)
  setCachedRoute({
    hash,
    route,
    createdAt: new Date(),
    lastAccessed: new Date()
  }).catch(error => {
    console.warn('Failed to cache route in background:', error);
  });

  console.log(`Successfully processed GPX file: ${route.name}`);
  console.log(`Route stats: ${route.points.length} points, ${route.totalDistance.toFixed(2)}km`);

  return NextResponse.json<APIResponse<UploadResponse>>({
    success: true,
    data: {
      route,
      message: SUCCESS_MESSAGES.GPX_UPLOADED
    },
    timestamp: new Date()
  });
}

export const POST = createErrorHandler(
  (request: NextRequest) => validateUpload(request, uploadHandler)
);

export async function GET() {
  return NextResponse.json({
    message: 'GPX upload endpoint. Use POST to upload a GPX file.',
    supportedFormats: ['.gpx'],
    maxFileSize: '5MB',
    maxWaypoints: 2000,
    validation: {
      required: ['gpx file'],
      fileTypes: ['application/gpx+xml', 'text/xml', 'application/xml'],
      maxSize: '5MB',
      security: 'XXE protection enabled'
    }
  });
}
