import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const photoName = searchParams.get('name');
    const maxHeightPx = searchParams.get('maxHeightPx') || '400';
    const maxWidthPx = searchParams.get('maxWidthPx') || '400';

    if (!photoName) {
      return new NextResponse('Nome da foto ausente', { status: 400 });
    }

    const apiKey = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
    if (!apiKey) {
      // Retorna placeholder neutro
      return NextResponse.redirect('https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&auto=format&fit=crop&q=80');
    }

    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${maxHeightPx}&maxWidthPx=${maxWidthPx}&key=${apiKey}`;
    const photoRes = await fetch(photoUrl);

    if (!photoRes.ok) {
      return NextResponse.redirect('https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&auto=format&fit=crop&q=80');
    }

    const contentType = photoRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await photoRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return NextResponse.redirect('https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&auto=format&fit=crop&q=80');
  }
}
