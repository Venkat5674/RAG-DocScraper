import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import yaml from 'js-yaml';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ message: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove unwanted elements (sidebars, navs, footers)
    $('nav, footer, aside, header, script, style, noscript, iframe, .sidebar, .menu').remove();
    
    const title = $('title').text().trim() || 'Untitled';
    // Try to find the main content area, fallback to body
    const mainContent = $('main, article, .content, #content').html() || $('body').html() || '';
    
    const turndownService = new TurndownService({ codeBlockStyle: 'fenced' });
    const markdown = turndownService.turndown(mainContent);
    
    const metadata = {
      source_url: url,
      title: title,
      scraped_at: new Date().toISOString().split('T')[0],
    };
    
    const content = `---\n${yaml.dump(metadata)}---\n\n` + markdown;
    
    let filename = new URL(url).pathname.replace(/^\/|\/$/g, '').replace(/\//g, '_');
    if (!filename) filename = 'index';

    return NextResponse.json({ markdown: content, filename });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
