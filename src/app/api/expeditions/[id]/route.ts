import { NextRequest, NextResponse } from 'next/server';
import { getSavedExpeditionById, deleteSavedExpedition } from '@/lib/mongodb';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expedition ID required' },
        { status: 400 }
      );
    }

    const expedition = await getSavedExpeditionById(id);
    if (!expedition) {
      return NextResponse.json(
        { success: false, error: 'Expedition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      expedition
    });
  } catch (error) {
    console.error('Error fetching expedition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expedition' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expedition ID required' },
        { status: 400 }
      );
    }

    const deleted = await deleteSavedExpedition(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Expedition could not be deleted or was not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Expedition ${id} removed from archive`
    });
  } catch (error) {
    console.error('Error deleting expedition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expedition' },
      { status: 500 }
    );
  }
}
