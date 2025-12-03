export function parseFilesFromResponse(response: string, projectName: string): Array<{path: string, content: string}> {
  const files: Array<{path: string, content: string}> = [];
  
  // Parse code blocks with filenames
  const blocks = response.matchAll(/```(\w+)?\s*\n([\s\S]*?)```/g);
  
  for (const block of blocks) {
    const lang = block[1] || 'txt';
    const content = block[2].trim();
    
    if (!content) continue;
    if (['bash', 'shell', 'sh'].includes(lang.toLowerCase())) continue;
    
    // Extract filename from comment
    const beforeBlock = response.substring(0, block.index);
    const lines = beforeBlock.split('\n').slice(-3);
    const context = lines.join(' ');
    
    let filename = '';
    
    // Look for filename in comment or context
    const filenameMatch = context.match(/filename:\s*([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/i) ||
                         context.match(/([a-zA-Z0-9_\-./]+\.(html|css|js|json|md|py|ts|jsx|tsx))/i);
    
    if (filenameMatch) {
      filename = filenameMatch[1];
    } else {
      // Infer from language
      const langMap: Record<string, string> = {
        'html': 'index.html',
        'css': 'style.css',
        'javascript': 'script.js',
        'js': 'script.js',
        'json': 'package.json',
        'markdown': 'README.md',
        'md': 'README.md',
        'python': 'main.py',
        'py': 'main.py'
      };
      
      filename = langMap[lang.toLowerCase()] || `file.${lang}`;
    }
    
    // Add project folder if not present
    if (!filename.includes('/') && !filename.startsWith(projectName)) {
      filename = `${projectName}/${filename}`;
    }
    
    // Avoid duplicates
    if (!files.some(f => f.path === filename)) {
      files.push({ path: filename, content });
    }
  }
  
  return files;
}
