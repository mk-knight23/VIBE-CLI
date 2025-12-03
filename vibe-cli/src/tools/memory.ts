import fs from 'fs';
import path from 'path';

const memoryFile = path.join(process.cwd(), '.vibe', 'memory.json');
const todosFile = path.join(process.cwd(), '.vibe', 'todos.json');

interface Memory {
  [key: string]: any;
}

interface Todo {
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export async function saveMemory(key: string, value: any): Promise<string> {
  const dir = path.dirname(memoryFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  let memory: Memory = {};
  if (fs.existsSync(memoryFile)) {
    memory = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
  }
  
  memory[key] = value;
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
  
  return `Saved to memory: ${key}`;
}

export async function loadMemory(key?: string): Promise<any> {
  if (!fs.existsSync(memoryFile)) return key ? null : {};
  
  const memory = JSON.parse(fs.readFileSync(memoryFile, 'utf-8'));
  return key ? memory[key] : memory;
}

export async function writeTodos(todos: Todo[]): Promise<string> {
  const dir = path.dirname(todosFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(todosFile, JSON.stringify(todos, null, 2));
  
  const inProgress = todos.find(t => t.status === 'in_progress');
  const completed = todos.filter(t => t.status === 'completed').length;
  
  return `Updated todos: ${completed}/${todos.length} completed${inProgress ? `\nCurrent: ${inProgress.description}` : ''}`;
}

export async function loadTodos(): Promise<Todo[]> {
  if (!fs.existsSync(todosFile)) return [];
  return JSON.parse(fs.readFileSync(todosFile, 'utf-8'));
}

export async function clearTodos(): Promise<string> {
  if (fs.existsSync(todosFile)) fs.unlinkSync(todosFile);
  return 'Todos cleared';
}
