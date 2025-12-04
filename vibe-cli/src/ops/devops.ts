// DevOps Operations
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';

const execAsync = promisify(exec);

export class DevOps {
  // DOCKER OPERATIONS
  async dockerBuild(tag: string, dockerfile: string = 'Dockerfile'): Promise<string> {
    const { stdout } = await execAsync(`docker build -t ${tag} -f ${dockerfile} .`);
    return stdout;
  }

  async dockerRun(image: string, options: any = {}): Promise<string> {
    const port = options.port ? `-p ${options.port}:${options.port}` : '';
    const detach = options.detach ? '-d' : '';
    const name = options.name ? `--name ${options.name}` : '';
    
    const { stdout } = await execAsync(`docker run ${detach} ${port} ${name} ${image}`);
    return stdout;
  }

  async dockerCompose(action: 'up' | 'down' | 'restart' | 'logs'): Promise<string> {
    const { stdout } = await execAsync(`docker-compose ${action}`);
    return stdout;
  }

  async dockerPs(): Promise<string> {
    const { stdout } = await execAsync('docker ps');
    return stdout;
  }

  async dockerLogs(container: string): Promise<string> {
    const { stdout } = await execAsync(`docker logs ${container}`);
    return stdout;
  }

  async generateDockerfile(type: 'node' | 'python' | 'go'): Promise<string> {
    const dockerfiles: Record<string, string> = {
      node: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]`,
      
      python: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]`,
      
      go: `FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o main .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]`
    };

    await writeFile('Dockerfile', dockerfiles[type], 'utf-8');
    return `Generated Dockerfile for ${type}`;
  }

  // KUBERNETES OPERATIONS
  async k8sApply(file: string): Promise<string> {
    const { stdout } = await execAsync(`kubectl apply -f ${file}`);
    return stdout;
  }

  async k8sGet(resource: string): Promise<string> {
    const { stdout } = await execAsync(`kubectl get ${resource}`);
    return stdout;
  }

  async k8sLogs(pod: string): Promise<string> {
    const { stdout } = await execAsync(`kubectl logs ${pod}`);
    return stdout;
  }

  async k8sScale(deployment: string, replicas: number): Promise<string> {
    const { stdout } = await execAsync(`kubectl scale deployment ${deployment} --replicas=${replicas}`);
    return stdout;
  }

  async generateK8sManifest(name: string, image: string, port: number): Promise<string> {
    const manifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
      - name: ${name}
        image: ${image}
        ports:
        - containerPort: ${port}
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}
spec:
  selector:
    app: ${name}
  ports:
  - port: 80
    targetPort: ${port}
  type: LoadBalancer`;

    await writeFile(`${name}-k8s.yaml`, manifest, 'utf-8');
    return `Generated ${name}-k8s.yaml`;
  }

  // CI/CD OPERATIONS
  async generateGitHubActions(type: 'node' | 'python' | 'docker'): Promise<string> {
    const workflows: Record<string, string> = {
      node: `name: Node.js CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - run: npm ci
    - run: npm test
    - run: npm run build`,

      python: `name: Python CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - run: pip install -r requirements.txt
    - run: pytest`,

      docker: `name: Docker CI

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: docker/build-push-action@v4
      with:
        push: true
        tags: user/app:latest`
    };

    await writeFile('.github/workflows/ci.yml', workflows[type], 'utf-8');
    return 'Generated .github/workflows/ci.yml';
  }

  // MONITORING
  async monitor(service: string): Promise<any> {
    const { stdout } = await execAsync(`docker stats ${service} --no-stream`);
    return this.parseDockerStats(stdout);
  }

  private parseDockerStats(output: string): any {
    const lines = output.split('\n');
    if (lines.length < 2) return {};
    
    const headers = lines[0].split(/\s+/);
    const values = lines[1].split(/\s+/);
    
    return {
      cpu: values[2],
      memory: values[3],
      network: values[7]
    };
  }

  async healthCheck(url: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`curl -f ${url}/health || echo "DOWN"`);
      return !stdout.includes('DOWN');
    } catch {
      return false;
    }
  }

  // BACKUP
  async backup(source: string, destination: string): Promise<string> {
    const { stdout } = await execAsync(`tar -czf ${destination} ${source}`);
    return `Backed up ${source} to ${destination}`;
  }

  async restore(backup: string, destination: string): Promise<string> {
    const { stdout } = await execAsync(`tar -xzf ${backup} -C ${destination}`);
    return `Restored ${backup} to ${destination}`;
  }
}
