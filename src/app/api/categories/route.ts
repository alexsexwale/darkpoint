import { NextResponse } from 'next/server';
import { cjDropshipping } from '@/lib/cjdropshipping';
import { PRODUCT_CATEGORIES } from '@/lib/constants';

export async function GET() {
  try {
    console.log('Fetching categories from CJDropshipping API...');
    
    const response = await cjDropshipping.getCategories();

    if (!response.success || !response.data) {
      // Return fallback categories from our constants
      const fallbackCategories = PRODUCT_CATEGORIES.map(cat => ({
        id: cat.id,
        name: cat.label,
        parentId: '0',
        level: 1,
        slug: cat.id,
      }));

      return NextResponse.json({
        success: true,
        data: fallbackCategories,
        source: 'fallback',
      });
    }

    // Transform categories to a more usable format
    const transformedCategories = response.data.map(category => ({
      id: category.categoryId,
      name: category.categoryName,
      parentId: category.parentId,
      level: category.level,
      slug: category.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    }));

    // Group categories by level for easier navigation
    const groupedCategories = {
      main: transformedCategories.filter(cat => cat.level === 1),
      sub: transformedCategories.filter(cat => cat.level === 2),
      detailed: transformedCategories.filter(cat => cat.level > 2),
    };

    return NextResponse.json({
      success: true,
      data: transformedCategories,
      grouped: groupedCategories,
      source: 'cjdropshipping',
    });

  } catch (error) {
    console.error('Categories API error:', error);
    
    // Return fallback categories on error
    const fallbackCategories = PRODUCT_CATEGORIES.map(cat => ({
      id: cat.id,
      name: cat.label,
      parentId: '0',
      level: 1,
      slug: cat.id,
    }));

    return NextResponse.json({
      success: true,
      data: fallbackCategories,
      grouped: {
        main: fallbackCategories,
        sub: [],
        detailed: [],
      },
      source: 'fallback',
    });
  }
}


