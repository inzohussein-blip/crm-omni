/**
 * OMNI-CRM I18N Languages API
 * 
 * GET: Get all languages
 * POST: Create a new language
 */

import { NextRequest, NextResponse } from 'next/server';
import { translationService } from '@/lib/i18n-service';

// GET /api/i18n/languages - Get all languages
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const languages = includeInactive
      ? await translationService.getAllLanguages()
      : await translationService.getLanguages();

    return NextResponse.json({
      success: true,
      data: languages,
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch languages' },
      { status: 500 }
    );
  }
}

// POST /api/i18n/languages - Create a new language
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, nativeName, isRtl, isDefault } = body;

    // Validate required fields
    if (!code || !name || !nativeName) {
      return NextResponse.json(
        { success: false, error: 'Code, name, and nativeName are required' },
        { status: 400 }
      );
    }

    // Check if language already exists
    const existing = await translationService.getLanguageByCode(code.toLowerCase());
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Language with this code already exists' },
        { status: 400 }
      );
    }

    // Create language
    const language = await translationService.createLanguage({
      code: code.toLowerCase(),
      name,
      nativeName,
      isRtl: isRtl ?? false,
      isDefault: isDefault ?? false,
    });

    return NextResponse.json({
      success: true,
      data: language,
    });
  } catch (error) {
    console.error('Error creating language:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create language' },
      { status: 500 }
    );
  }
}

// PATCH /api/i18n/languages - Update a language
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, ...updates } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Language code is required' },
        { status: 400 }
      );
    }

    const language = await translationService.updateLanguage(code, updates);

    return NextResponse.json({
      success: true,
      data: language,
    });
  } catch (error) {
    console.error('Error updating language:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update language' },
      { status: 500 }
    );
  }
}

// DELETE /api/i18n/languages - Delete a language
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Language code is required' },
        { status: 400 }
      );
    }

    await translationService.deleteLanguage(code);

    return NextResponse.json({
      success: true,
      message: 'Language deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting language:', error);
    
    if (error.message === 'Cannot delete default language') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to delete language' },
      { status: 500 }
    );
  }
}
