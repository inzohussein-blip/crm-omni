/**
 * OMNI-CRM I18N Translations API
 * 
 * GET: Get translations for a language
 * POST: Set translations
 * DELETE: Delete translations
 */

import { NextRequest, NextResponse } from 'next/server';
import { translationService } from '@/lib/i18n-service';
import fs from 'fs';
import path from 'path';

// GET /api/i18n/translations - Get translations
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const languageCode = searchParams.get('languageCode') || 'en';
    const namespace = searchParams.get('namespace') || 'common';
    const all = searchParams.get('all') === 'true';
    const key = searchParams.get('key');

    // Get single translation
    if (key) {
      const value = await translationService.getTranslation(languageCode, namespace, key);
      return NextResponse.json({
        success: true,
        data: value,
      });
    }

    // Get all translations for all namespaces
    if (all) {
      // First try to get from database
      const dbTranslations = await translationService.getAllTranslations(languageCode);
      
      // If no translations in database, load from JSON files
      if (Object.keys(dbTranslations).length === 0) {
        const localePath = path.join(process.cwd(), 'src', 'locales', `${languageCode}.json`);
        
        if (fs.existsSync(localePath)) {
          const fileContent = fs.readFileSync(localePath, 'utf-8');
          const translations = JSON.parse(fileContent);
          
          return NextResponse.json({
            success: true,
            data: translations,
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        data: dbTranslations,
      });
    }

    // Get translations for a specific namespace
    const translations = await translationService.getTranslations(languageCode, namespace);
    
    // If no translations found, try loading from JSON file
    if (Object.keys(translations).length === 0) {
      const localePath = path.join(process.cwd(), 'src', 'locales', `${languageCode}.json`);
      
      if (fs.existsSync(localePath)) {
        const fileContent = fs.readFileSync(localePath, 'utf-8');
        const allTranslations = JSON.parse(fileContent);
        
        if (allTranslations[namespace]) {
          return NextResponse.json({
            success: true,
            data: allTranslations[namespace],
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: translations,
    });
  } catch (error) {
    console.error('Error fetching translations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch translations' },
      { status: 500 }
    );
  }
}

// POST /api/i18n/translations - Set translations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { languageCode, namespace, key, value, translations, action } = body;

    // Import translations
    if (action === 'import') {
      const { clearExisting } = body;
      const result = await translationService.importTranslations(
        languageCode,
        translations,
        clearExisting
      );
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // Set multiple translations
    if (translations && namespace) {
      const count = await translationService.setTranslations(
        languageCode,
        namespace,
        translations
      );
      
      return NextResponse.json({
        success: true,
        data: { count },
      });
    }

    // Set single translation
    if (languageCode && namespace && key && value !== undefined) {
      const translation = await translationService.setTranslation(
        languageCode,
        namespace,
        key,
        value
      );
      
      return NextResponse.json({
        success: true,
        data: translation,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error setting translations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set translations' },
      { status: 500 }
    );
  }
}

// DELETE /api/i18n/translations - Delete translations
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const languageCode = searchParams.get('languageCode');
    const namespace = searchParams.get('namespace');
    const key = searchParams.get('key');

    if (!languageCode) {
      return NextResponse.json(
        { success: false, error: 'Language code is required' },
        { status: 400 }
      );
    }

    // Delete a single translation
    if (key && namespace) {
      const result = await translationService.deleteTranslation(
        languageCode,
        namespace,
        key
      );
      
      return NextResponse.json({
        success: result,
        message: result ? 'Translation deleted' : 'Translation not found',
      });
    }

    // Delete all translations for a namespace
    if (namespace) {
      const count = await translationService.deleteNamespaceTranslations(
        languageCode,
        namespace
      );
      
      return NextResponse.json({
        success: true,
        data: { count },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Namespace and/or key is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting translations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete translations' },
      { status: 500 }
    );
  }
}

// GET /api/i18n/translations/stats - Get translation statistics
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, languageCode, referenceCode } = body;

    if (action === 'stats') {
      const stats = languageCode
        ? await translationService.getLanguageStats(languageCode)
        : await translationService.getAllLanguageStats();
      
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    if (action === 'missing') {
      const missing = await translationService.getMissingTranslations(
        languageCode,
        referenceCode || 'en'
      );
      
      return NextResponse.json({
        success: true,
        data: missing,
      });
    }

    if (action === 'export') {
      const translations = await translationService.exportTranslations(languageCode);
      
      return NextResponse.json({
        success: true,
        data: translations,
      });
    }

    if (action === 'copy') {
      const { sourceCode, targetCode } = body;
      const count = await translationService.copyTranslations(
        sourceCode,
        targetCode,
        namespace
      );
      
      return NextResponse.json({
        success: true,
        data: { count },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in translations action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
