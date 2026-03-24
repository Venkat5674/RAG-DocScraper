'use client';

import { useState, useRef } from 'react';
import { Globe, Download, Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'starting' | 'fetching_sitemap' | 'scraping' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState({ scraped: 0, total: 0, currentUrl: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('fetching_sitemap');
    setErrorMsg('');
    setDownloadUrl('');
    setProgress({ scraped: 0, total: 0, currentUrl: '' });
    
    try {
      // 1. Fetch the sitemap to get all URLs
      const sitemapRes = await fetch('/api/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const sitemapData = await sitemapRes.json();
      
      if (!sitemapRes.ok) {
        throw new Error(sitemapData.message || 'Failed to fetch sitemap');
      }

      const urlsToScrape: string[] = sitemapData.urls;
      
      setStatus('scraping');
      setProgress({ scraped: 0, total: urlsToScrape.length, currentUrl: urlsToScrape[0] });
      
      const zip = new JSZip();
      let scrapedCount = 0;
      
      // 2. Process URLs in chunks to avoid overwhelming the serverless functions
      const chunkSize = 3; // Process 3 pages concurrently
      
      for (let i = 0; i < urlsToScrape.length; i += chunkSize) {
        const chunk = urlsToScrape.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (targetUrl) => {
          setProgress(p => ({ ...p, currentUrl: targetUrl }));
          
          try {
            const scrapeRes = await fetch('/api/scrape-single', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: targetUrl })
            });
            
            if (scrapeRes.ok) {
              const data = await scrapeRes.json();
              zip.file(`${data.filename}.md`, data.markdown);
            }
          } catch (err) {
            console.error(`Failed to scrape ${targetUrl}:`, err);
          }
          
          scrapedCount++;
          setProgress(p => ({ ...p, scraped: scrapedCount }));
        }));
      }
      
      // 3. Generate the ZIP file entirely in the browser
      setStatus('completed');
      const blob = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(blob);
      setDownloadUrl(blobUrl);
      
    } catch (err: any) {
      setStatus('failed');
      setErrorMsg(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-100">
      <div className="max-w-3xl mx-auto pt-20 px-6 pb-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-6 shadow-lg shadow-blue-200">
            <FileText size={32} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mb-4">
            DocScraper RAG Pipeline
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Extract clean, structured Markdown from any documentation site for your Vector DB.
          </p>
          
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-800 text-sm font-medium">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
            100% Serverless & Vercel Ready! No external databases required.
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleScrape} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Target Documentation URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="url" 
                  id="url" 
                  required 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://react.dev" 
                  disabled={status === 'scraping' || status === 'starting'}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500 outline-none"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={status === 'scraping' || status === 'starting'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              {status === 'idle' || status === 'completed' ? (
                <>Start Scraping</>
              ) : (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  {status === 'starting' ? 'Initializing...' : 'Scraping in progress...'}
                </>
              )}
            </button>
          </form>

          {status !== 'idle' && (
            <div className="mt-8 pt-8 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Job Status
                {status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              </h3>
              
              <div className="space-y-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                    {status.toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Progress:</span>
                    <span className="font-medium tabular-nums">
                      {progress.scraped} / {progress.total || '?'} pages
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${status === 'completed' ? 'bg-green-500' : 'bg-blue-600 relative overflow-hidden'}`} 
                      style={{ width: `${progress.total ? (progress.scraped / progress.total) * 100 : 0}%` }}
                    >
                      {status === 'scraping' && (
                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -translate-x-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}></div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-gray-500 block mb-2">Currently scraping:</span>
                  <div className="truncate text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-mono">
                    {progress.currentUrl || 'Waiting to start...'}
                  </div>
                </div>
              </div>

              {status === 'failed' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Scraping Failed</h4>
                    <p className="text-sm mt-1">{errorMsg}</p>
                  </div>
                </div>
              )}

              {status === 'completed' && (
                <div className="mt-8 animate-in zoom-in-95 duration-300">
                  <a 
                    href={downloadUrl}
                    download
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm hover:shadow"
                  >
                    <Download className="h-5 w-5" />
                    Download Markdown Archive (.zip)
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
