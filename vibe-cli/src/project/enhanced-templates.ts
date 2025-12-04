export interface Template {
  name: string;
  description: string;
  category: string;
  files: TemplateFile[];
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  setup: string[];
}

export interface TemplateFile {
  path: string;
  content: string;
}

export const templates: Record<string, Template> = {
  // Frontend Templates
  'react-vite-ts': {
    name: 'React + Vite + TypeScript',
    description: 'Modern React app with Vite and TypeScript',
    category: 'frontend',
    files: [
      {
        path: 'src/App.tsx',
        content: `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>Vite + React + TypeScript</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}

export default App`
      },
      {
        path: 'src/main.tsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`
      }
    ],
    dependencies: ['react', 'react-dom'],
    devDependencies: ['@types/react', '@types/react-dom', '@vitejs/plugin-react', 'typescript', 'vite'],
    scripts: {
      'dev': 'vite',
      'build': 'tsc && vite build',
      'preview': 'vite preview'
    },
    setup: ['npm install', 'npm run dev']
  },

  'nextjs-app': {
    name: 'Next.js App Router',
    description: 'Next.js 14 with App Router and TypeScript',
    category: 'frontend',
    files: [
      {
        path: 'app/page.tsx',
        content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to Next.js</h1>
      <p className="mt-4 text-xl">Built with App Router</p>
    </main>
  )
}`
      },
      {
        path: 'app/layout.tsx',
        content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Created with Vibe-CLI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`
      }
    ],
    dependencies: ['next', 'react', 'react-dom'],
    devDependencies: ['@types/node', '@types/react', '@types/react-dom', 'typescript'],
    scripts: {
      'dev': 'next dev',
      'build': 'next build',
      'start': 'next start'
    },
    setup: ['npm install', 'npm run dev']
  },

  // Backend Templates
  'express-ts': {
    name: 'Express + TypeScript',
    description: 'Express API with TypeScript and Prisma',
    category: 'backend',
    files: [
      {
        path: 'src/index.ts',
        content: `import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`)
})`
      },
      {
        path: 'src/routes/users.ts',
        content: `import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({ users: [] })
})

router.post('/', (req, res) => {
  res.json({ message: 'User created' })
})

export default router`
      }
    ],
    dependencies: ['express', 'cors', 'dotenv'],
    devDependencies: ['@types/express', '@types/cors', '@types/node', 'typescript', 'ts-node', 'nodemon'],
    scripts: {
      'dev': 'nodemon src/index.ts',
      'build': 'tsc',
      'start': 'node dist/index.js'
    },
    setup: ['npm install', 'npm run dev']
  },

  'fastapi': {
    name: 'FastAPI + SQLAlchemy',
    description: 'FastAPI with SQLAlchemy and PostgreSQL',
    category: 'backend',
    files: [
      {
        path: 'main.py',
        content: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.get("/health")
def health_check():
    return {"status": "ok"}`
      },
      {
        path: 'requirements.txt',
        content: `fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
python-dotenv==1.0.0`
      }
    ],
    dependencies: [],
    devDependencies: [],
    scripts: {
      'dev': 'uvicorn main:app --reload',
      'start': 'uvicorn main:app --host 0.0.0.0 --port 8000'
    },
    setup: ['pip install -r requirements.txt', 'python -m uvicorn main:app --reload']
  },

  // Full-Stack Templates
  't3-stack': {
    name: 'T3 Stack',
    description: 'Next.js + tRPC + Prisma + Tailwind',
    category: 'fullstack',
    files: [
      {
        path: 'src/server/api/root.ts',
        content: `import { createTRPCRouter } from './trpc'
import { userRouter } from './routers/user'

export const appRouter = createTRPCRouter({
  user: userRouter,
})

export type AppRouter = typeof appRouter`
      },
      {
        path: 'src/server/api/routers/user.ts',
        content: `import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'

export const userRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany()
  }),
  
  create: publicProcedure
    .input(z.object({ name: z.string(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.create({ data: input })
    }),
})`
      }
    ],
    dependencies: ['next', 'react', 'react-dom', '@trpc/server', '@trpc/client', '@trpc/react-query', '@tanstack/react-query', '@prisma/client', 'zod'],
    devDependencies: ['@types/node', '@types/react', '@types/react-dom', 'typescript', 'prisma', 'tailwindcss', 'postcss', 'autoprefixer'],
    scripts: {
      'dev': 'next dev',
      'build': 'next build',
      'start': 'next start',
      'db:push': 'prisma db push',
      'db:studio': 'prisma studio'
    },
    setup: ['npm install', 'npx prisma db push', 'npm run dev']
  },

  'mern-stack': {
    name: 'MERN Stack',
    description: 'MongoDB + Express + React + Node.js',
    category: 'fullstack',
    files: [
      {
        path: 'server/index.js',
        content: `const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(\`Server on port \${PORT}\`))`
      },
      {
        path: 'client/src/App.jsx',
        content: `import { useState, useEffect } from 'react'

function App() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then(res => res.json())
      .then(data => setData(data))
  }, [])

  return (
    <div className="App">
      <h1>MERN Stack App</h1>
      {data && <p>Server Status: {data.status}</p>}
    </div>
  )
}

export default App`
      }
    ],
    dependencies: ['express', 'mongoose', 'cors', 'dotenv', 'react', 'react-dom'],
    devDependencies: ['nodemon', 'concurrently', '@vitejs/plugin-react', 'vite'],
    scripts: {
      'server': 'nodemon server/index.js',
      'client': 'cd client && npm run dev',
      'dev': 'concurrently "npm run server" "npm run client"'
    },
    setup: ['npm install', 'cd client && npm install', 'cd .. && npm run dev']
  }
};

export function getTemplate(name: string): Template | undefined {
  return templates[name];
}

export function listTemplates(category?: string): Template[] {
  const allTemplates = Object.values(templates);
  if (category) {
    return allTemplates.filter(t => t.category === category);
  }
  return allTemplates;
}

export function getCategories(): string[] {
  return [...new Set(Object.values(templates).map(t => t.category))];
}
