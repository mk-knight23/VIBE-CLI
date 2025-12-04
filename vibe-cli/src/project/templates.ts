// Project Templates System
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export interface Template {
  id: string;
  name: string;
  description: string;
  files: Record<string, string>;
  commands?: string[];
}

export const templates: Record<string, Template> = {
  react: {
    id: 'react',
    name: 'React App',
    description: 'React with TypeScript and Vite',
    files: {
      'package.json': JSON.stringify({
        name: 'react-app',
        version: '1.0.0',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.0.0',
          typescript: '^5.0.0',
          vite: '^4.0.0'
        }
      }, null, 2),
      'src/App.tsx': `import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>React App</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}`,
      'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          lib: ['ES2020', 'DOM'],
          jsx: 'react-jsx',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          esModuleInterop: true
        },
        include: ['src']
      }, null, 2)
    },
    commands: ['npm install']
  },

  node: {
    id: 'node',
    name: 'Node.js API',
    description: 'Express API with TypeScript',
    files: {
      'package.json': JSON.stringify({
        name: 'node-api',
        version: '1.0.0',
        scripts: {
          dev: 'ts-node src/server.ts',
          build: 'tsc',
          start: 'node dist/server.js'
        },
        dependencies: {
          express: '^4.18.0',
          cors: '^2.8.5'
        },
        devDependencies: {
          '@types/express': '^4.17.0',
          '@types/cors': '^2.8.0',
          '@types/node': '^20.0.0',
          typescript: '^5.0.0',
          'ts-node': '^10.0.0'
        }
      }, null, 2),
      'src/server.ts': `import express from 'express'
import cors from 'cors'

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'API is running' })
})

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`)
})`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true
        }
      }, null, 2)
    },
    commands: ['npm install']
  },

  fullstack: {
    id: 'fullstack',
    name: 'Full-Stack App',
    description: 'React + Node.js + MongoDB',
    files: {
      'package.json': JSON.stringify({
        name: 'fullstack-app',
        version: '1.0.0',
        scripts: {
          dev: 'concurrently "npm run dev:client" "npm run dev:server"',
          'dev:client': 'cd client && npm run dev',
          'dev:server': 'cd server && npm run dev'
        }
      }, null, 2),
      'client/package.json': '{}',
      'server/package.json': '{}'
    },
    commands: ['npm install', 'cd client && npm install', 'cd server && npm install']
  }
};

export class TemplateEngine {
  async create(templateId: string, projectName: string): Promise<void> {
    const template = templates[templateId];
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    console.log(`Creating ${template.name}...`);

    // Create project directory
    await mkdir(projectName, { recursive: true });

    // Create all files
    for (const [path, content] of Object.entries(template.files)) {
      const fullPath = join(projectName, path);
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      
      if (dir) {
        await mkdir(dir, { recursive: true });
      }
      
      await writeFile(fullPath, content, 'utf-8');
      console.log(`✓ ${path}`);
    }

    console.log(`\n✅ Created ${projectName}/`);
    
    if (template.commands) {
      console.log('\nNext steps:');
      console.log(`  cd ${projectName}`);
      template.commands.forEach(cmd => console.log(`  ${cmd}`));
    }
  }

  listTemplates(): Template[] {
    return Object.values(templates);
  }

  getTemplate(id: string): Template | undefined {
    return templates[id];
  }
}
