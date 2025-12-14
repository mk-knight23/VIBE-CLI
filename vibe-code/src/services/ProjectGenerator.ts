// Project Generator System
import { FileSystemEngine } from './FileSystem';
import * as path from 'path';

export interface ProjectTemplate {
  name: string;
  files: { path: string; content: string }[];
  commands?: string[];
}

export class ProjectGenerator {
  private fs: FileSystemEngine;
  private templates: Map<string, ProjectTemplate> = new Map();

  constructor(fs: FileSystemEngine) {
    this.fs = fs;
    this.initTemplates();
  }

  private initTemplates() {
    this.templates.set('react', {
      name: 'React App',
      files: [
        { path: 'package.json', content: JSON.stringify({
          name: 'react-app',
          version: '1.0.0',
          dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' }
        }, null, 2) },
        { path: 'src/App.jsx', content: 'export default function App() { return <div>Hello React</div>; }' },
        { path: 'src/index.jsx', content: 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);' },
        { path: 'index.html', content: '<!DOCTYPE html><html><head><title>React App</title></head><body><div id="root"></div><script type="module" src="/src/index.jsx"></script></body></html>' }
      ],
      commands: ['npm install']
    });

    this.templates.set('nextjs', {
      name: 'Next.js App',
      files: [
        { path: 'package.json', content: JSON.stringify({
          name: 'nextjs-app',
          version: '1.0.0',
          scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
          dependencies: { next: '^14.0.0', react: '^18.0.0', 'react-dom': '^18.0.0' }
        }, null, 2) },
        { path: 'app/page.tsx', content: 'export default function Home() { return <main><h1>Next.js App</h1></main>; }' },
        { path: 'app/layout.tsx', content: 'export default function RootLayout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }' }
      ],
      commands: ['npm install']
    });

    this.templates.set('express', {
      name: 'Express API',
      files: [
        { path: 'package.json', content: JSON.stringify({
          name: 'express-api',
          version: '1.0.0',
          main: 'index.js',
          scripts: { start: 'node index.js' },
          dependencies: { express: '^4.18.0' }
        }, null, 2) },
        { path: 'index.js', content: 'const express = require("express");\nconst app = express();\n\napp.get("/", (req, res) => res.json({ message: "Hello API" }));\n\napp.listen(3000, () => console.log("Server running on port 3000"));' }
      ],
      commands: ['npm install']
    });

    this.templates.set('python-web', {
      name: 'Python Web API',
      files: [
        { path: 'app.py', content: 'from web_framework import WebApp, jsonify\n\napp = WebApp(__name__)\n\n@app.route("/")\ndef home():\n    return jsonify({"message": "Hello Web"})\n\nif __name__ == "__main__":\n    app.run(debug=True)' },
        { path: 'requirements.txt', content: 'web-framework==3.0.0' }
      ],
      commands: ['pip install -r requirements.txt']
    });

    this.templates.set('html-css-js', {
      name: 'HTML/CSS/JS Landing Page',
      files: [
        { path: 'index.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Landing Page</title>\n    <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n    <header>\n        <h1>Welcome</h1>\n    </header>\n    <main>\n        <p>Your landing page content here</p>\n    </main>\n    <script src="script.js"></script>\n</body>\n</html>' },
        { path: 'styles.css', content: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: Arial, sans-serif; line-height: 1.6; }\nheader { background: #333; color: #fff; padding: 2rem; text-align: center; }\nmain { padding: 2rem; max-width: 1200px; margin: 0 auto; }' },
        { path: 'script.js', content: 'console.log("Landing page loaded");' }
      ]
    });
  }

  async generate(templateName: string, targetDir: string, projectName: string): Promise<void> {
    const template = this.templates.get(templateName);
    if (!template) throw new Error(`Template ${templateName} not found`);

    const projectPath = path.join(targetDir, projectName);
    await this.fs.createFolder(projectPath);

    for (const file of template.files) {
      const filePath = path.join(projectPath, file.path);
      await this.fs.createFile(filePath, file.content);
    }
  }

  getTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  getTemplate(name: string): ProjectTemplate | undefined {
    return this.templates.get(name);
  }
}
