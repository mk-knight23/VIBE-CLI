# Vibe-CLI v7.0.0 - Step-by-Step Guide

**Complete guide for beginners to advanced users**

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Your First Project](#your-first-project)
3. [Working with Commands](#working-with-commands)
4. [Using Agent Mode](#using-agent-mode)
5. [Testing Your Code](#testing-your-code)
6. [Deploying to Cloud](#deploying-to-cloud)
7. [Advanced Workflows](#advanced-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Step 1: Install Node.js

**Check if Node.js is installed:**
```bash
node --version
```

**If not installed, download from:** https://nodejs.org (v16 or higher)

### Step 2: Install Vibe-CLI

**Using NPM (Recommended):**
```bash
npm install -g vibe-ai-cli
```

**Verify installation:**
```bash
vibe --version
```

**Expected output:** `7.0.0`

### Step 3: Start Vibe-CLI

```bash
vibe
```

**You should see:**
```
🎨 Vibe-CLI v7.0.0
✨ AI-Powered Development Platform

Type /help for available commands
>
```

### Step 4: Explore Help

```bash
> /help
```

**This shows all available commands organized by category.**

---

## Your First Project

### Example 1: Create a React App

**Step 1: Start the creation process**
```bash
vibe
> /create "React app with TypeScript and Tailwind"
```

**Step 2: Wait for AI to generate the project**
```
✨ Creating project...
📁 Setting up React + TypeScript + Tailwind
📦 Installing dependencies...
✅ Project created successfully!
```

**Step 3: Navigate to your project**
```bash
cd my-react-app
```

**Step 4: Start the development server**
```bash
npm run dev
```

**Step 5: Open in browser**
```
http://localhost:5173
```

### Example 2: Create an Express API

**Step 1: Create the API**
```bash
vibe
> /create "Express API with TypeScript and Prisma"
```

**Step 2: Set up database**
```bash
cd my-api
npx prisma init
```

**Step 3: Configure database in `.env`**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

**Step 4: Create your first model**
```bash
vibe
> Edit prisma/schema.prisma and add User model
```

**Step 5: Push to database**
```bash
npx prisma db push
```

**Step 6: Start the server**
```bash
npm run dev
```

---

## Working with Commands

### Core Commands

#### /help - Get Help
```bash
> /help                    # Show all commands
> /help create            # Help for specific command
> /help --search deploy   # Search commands
```

#### /model - Switch AI Model
```bash
> /model                  # Show available models
> Select model from list
> Model switched to GPT-4
```

#### /provider - Switch Provider
```bash
> /provider              # Show available providers
> Select provider
> Provider switched to MegaLLM
```

### Development Commands

#### /init - Initialize Project
```bash
> /init
> Select project type: React / Vue / Angular / Express
> Enter project name: my-app
> ✅ Project initialized
```

#### /component - Generate Component
```bash
> /component "UserCard with avatar and bio"
> ✅ Component created: src/components/UserCard.tsx
> ✅ Test created: src/components/UserCard.test.tsx
```

#### /api - Generate API Endpoint
```bash
> /api "User authentication with JWT"
> ✅ Created: src/routes/auth.ts
> ✅ Created: src/middleware/auth.ts
> ✅ Created: src/utils/jwt.ts
```

### Analysis Commands

#### /analyze - Analyze Code
```bash
> /analyze
> 📊 Analyzing codebase...
> 
> Files: 45
> Lines of Code: 3,245
> Functions: 127
> Components: 23
> 
> Issues Found:
> ⚠️  3 unused imports
> ⚠️  2 missing types
> ⚠️  1 potential bug
```

#### /security - Security Scan
```bash
> /security
> 🔒 Scanning for vulnerabilities...
> 
> ✅ No critical vulnerabilities found
> ⚠️  2 moderate issues:
>   - Outdated dependency: axios@0.21.0
>   - Missing CORS configuration
```

#### /performance - Performance Analysis
```bash
> /performance
> ⚡ Analyzing performance...
> 
> Bundle Size: 245 KB
> Load Time: 1.2s
> 
> Suggestions:
> 💡 Code split large components
> 💡 Lazy load images
> 💡 Enable compression
```

### Git Commands

#### /commit - Smart Commit
```bash
> /commit
> 📝 Analyzing changes...
> 
> Suggested commit message:
> "feat: add user authentication with JWT"
> 
> Accept? (y/n): y
> ✅ Committed successfully
```

#### /pr - Generate PR Description
```bash
> /pr
> 📝 Generating PR description...
> 
> ## Changes
> - Added user authentication
> - Implemented JWT tokens
> - Added login/logout endpoints
> 
> ## Testing
> - Added unit tests for auth
> - Tested login flow
> 
> Copy to clipboard? (y/n): y
```

---

## Using Agent Mode

### What is Agent Mode?

Agent mode allows AI to autonomously execute complex multi-step tasks.

### Example 1: Build Complete Feature

**Step 1: Start agent**
```bash
> /agent "Create a user profile feature with edit functionality"
```

**Step 2: Agent creates plan**
```
🤖 Agent Plan:
1. Create UserProfile component
2. Create EditProfile component
3. Add API endpoints
4. Add tests
5. Update routing

Approve plan? (y/n): y
```

**Step 3: Agent executes**
```
✅ Step 1/5: Created UserProfile component
✅ Step 2/5: Created EditProfile component
✅ Step 3/5: Added API endpoints
✅ Step 4/5: Added tests
✅ Step 5/5: Updated routing

🎉 Task completed successfully!
```

### Example 2: Full-Stack App

**Step 1: Start agent with complex task**
```bash
> /agent "Create a todo app with React frontend, Express backend, and PostgreSQL database"
```

**Step 2: Agent breaks down task**
```
🤖 Agent Plan:
1. Set up project structure
2. Create database schema
3. Build backend API
4. Create React components
5. Connect frontend to backend
6. Add authentication
7. Write tests
8. Set up deployment

Approve plan? (y/n): y
```

**Step 3: Monitor progress**
```
⏳ Step 1/8: Setting up project structure...
✅ Step 1/8: Project structure created

⏳ Step 2/8: Creating database schema...
✅ Step 2/8: Database schema created

... (continues for all steps)
```

### Example 3: Agent with Sub-Agents

**Step 1: Start complex agent**
```bash
> /agent "Build and deploy a microservices architecture"
```

**Step 2: Agent spawns sub-agents**
```
🤖 Main Agent: Creating microservices architecture
  
  🤖 Sub-Agent 1: Building Auth Service
  🤖 Sub-Agent 2: Building User Service
  🤖 Sub-Agent 3: Building API Gateway

✅ All sub-agents completed
✅ Main task completed
```

---

## Testing Your Code

### Generate Tests

**Step 1: Generate unit tests**
```bash
> /test:generate src/utils/helpers.ts
> ✅ Created: src/utils/helpers.test.ts
```

**Step 2: Run tests**
```bash
npm run test
```

**Step 3: Check coverage**
```bash
npm run test:coverage
```

### Test Commands

#### Run All Tests
```bash
npm run test:all
```

#### Run Specific Suite
```bash
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests
```

#### Watch Mode
```bash
npm run test:watch
```

---

## Deploying to Cloud

### Deploy to Vercel

**Step 1: Build your project**
```bash
> /build
> ✅ Build completed
```

**Step 2: Run tests**
```bash
> /test:all
> ✅ All tests passed
```

**Step 3: Deploy**
```bash
> /cloud vercel
> 🚀 Deploying to Vercel...
> ✅ Deployed successfully!
> 🌐 URL: https://my-app.vercel.app
```

### Deploy to AWS

**Step 1: Configure AWS credentials**
```bash
> /config set aws.accessKeyId YOUR_KEY
> /config set aws.secretAccessKey YOUR_SECRET
```

**Step 2: Deploy**
```bash
> /cloud aws
> 🚀 Deploying to AWS...
> ✅ Deployed successfully!
```

### Deploy with Docker

**Step 1: Create Dockerfile**
```bash
> /docker init
> ✅ Dockerfile created
```

**Step 2: Build image**
```bash
> /docker build
> ✅ Image built: my-app:latest
```

**Step 3: Run container**
```bash
> /docker run
> ✅ Container running on port 3000
```

---

## Advanced Workflows

### Workflow 1: Complete Development Cycle

```bash
# 1. Create project
> /create "Next.js app with authentication"

# 2. Add features
> /component "LoginForm"
> /component "Dashboard"
> /api "User authentication"

# 3. Add tests
> /test:generate

# 4. Run tests
> /test:all

# 5. Analyze code
> /analyze
> /security
> /performance

# 6. Commit changes
> /commit

# 7. Deploy
> /cloud vercel
```

### Workflow 2: API Development

```bash
# 1. Create API
> /create "Express API with Prisma"

# 2. Define schema
> Edit prisma/schema.prisma

# 3. Generate endpoints
> /api "User management"
> /api "Product management"
> /api "Order management"

# 4. Add tests
> /test:generate

# 5. Set up Docker
> /docker init
> /docker compose

# 6. Deploy
> /cloud aws
```

### Workflow 3: Microservices

```bash
# 1. Create services
> /agent "Create microservices architecture with auth, user, and payment services"

# 2. Set up infrastructure
> /k8s manifests
> /docker compose

# 3. Add monitoring
> /monitor setup

# 4. Deploy
> /cloud aws
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Command Not Found

**Problem:**
```bash
> /create
> Error: Command not found
```

**Solution:**
```bash
# Check if CLI is properly installed
vibe --version

# Reinstall if needed
npm uninstall -g vibe-ai-cli
npm install -g vibe-ai-cli
```

#### Issue 2: API Key Error

**Problem:**
```bash
> /model
> Error: Invalid API key
```

**Solution:**
```bash
# Check configuration
> /config list

# Reset configuration
> /config reset

# Set new API key
> /config set openrouter.apiKey YOUR_KEY
```

#### Issue 3: Build Fails

**Problem:**
```bash
> /build
> Error: Build failed
```

**Solution:**
```bash
# Check for errors
> /analyze

# Fix issues
> /fix

# Try build again
> /build
```

#### Issue 4: Tests Failing

**Problem:**
```bash
npm run test
> 5 tests failed
```

**Solution:**
```bash
# Run specific test
npm run test:unit

# Check test output
# Fix failing tests
# Run again
npm run test
```

---

## Tips & Best Practices

### 1. Use Help Frequently
```bash
> /help                    # When unsure
> /help <command>          # For specific command
```

### 2. Review Before Applying
```bash
# Always review AI suggestions before applying
# Use preview mode when available
```

### 3. Use Agent for Complex Tasks
```bash
# Let agent handle multi-step tasks
> /agent "Build complete feature"
```

### 4. Test Before Deploy
```bash
# Always run tests before deploying
> /test:all
> /cloud vercel
```

### 5. Use Workflows
```bash
# Save common workflows
> /workflow save "deploy-production"
> /workflow run "deploy-production"
```

---

## Next Steps

### Learn More
- Read [Complete Documentation](./COMPLETE_DOCUMENTATION.md)
- Watch video tutorials
- Join Discord community

### Practice
- Create sample projects
- Try different templates
- Experiment with agent mode

### Contribute
- Report bugs
- Suggest features
- Submit pull requests

---

**Happy Coding! 🚀**
