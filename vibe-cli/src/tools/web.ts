export async function webFetch(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Vibe-CLI/4.1' }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return JSON.stringify(data, null, 2);
    }
    
    return await response.text();
  } catch (err: any) {
    throw new Error(`Failed to fetch ${url}: ${err.message}`);
  }
}

export async function googleWebSearch(query: string, numResults = 5): Promise<string> {
  // Simple DuckDuckGo instant answer API
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
    const response = await fetch(url);
    const data: any = await response.json();
    
    const results: string[] = [];
    
    if (data.AbstractText) {
      results.push(`Summary: ${data.AbstractText}`);
      if (data.AbstractURL) results.push(`Source: ${data.AbstractURL}`);
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      results.push('\nRelated Topics:');
      data.RelatedTopics.slice(0, numResults).forEach((topic: any) => {
        if (topic.Text) results.push(`- ${topic.Text}`);
      });
    }
    
    return results.length ? results.join('\n') : 'No results found';
  } catch (err: any) {
    throw new Error(`Search failed: ${err.message}`);
  }
}
