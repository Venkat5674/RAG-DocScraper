import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ message: 'URL is required' }, { status: 400 });
    }

    const parsedUrl = new URL(url);
    const sitemapUrl = `${parsedUrl.origin}/sitemap.xml`;
    
    try {
      const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });
        const urls: string[] = [];
        
        $('loc').each((_, el) => {
          urls.push($(el).text());
        });
        
        if (urls.length > 0) {
          // Limit to 50 pages for Vercel Hobby tier safety
          return NextResponse.json({ urls: urls.slice(0, 50) });
        }
      }
    } catch (e) {
      console.error('Sitemap fetch error:', e);
    }

    // Fallback: just return the single URL if no sitemap is found
    return NextResponse.json({ urls: [url] });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
