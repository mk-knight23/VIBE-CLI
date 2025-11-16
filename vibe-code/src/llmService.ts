import * as vscode from 'vscode';


/**
 * ChatMessage aligned with OpenRouter format.
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Stream chunk shape we surface to UI.
 */
export interface ChatStreamChunk {
  delta: string;
  done: boolean;
  error?: string;
  usageTokensApprox?: number;
}

export interface CompletionArgs {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * Approximate token counting (very lightweight). We avoid bundling heavy tokenizers
 * to keep package size small. Uses heuristic: tokens ~= charCount / 4.
 */
export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * FREE MODELS LIST (hardcoded — MUST match specification)
 * Only these models are allowed.
 */
export const FREE_MODELS = [
  'z-ai/glm-4-5-air:free', // DEFAULT - top performer for agents
  'deepseek/deepseek-coder-v2-lite-instruct:free',
  'qwen/qwen2.5-coder-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'tng/deepseek-r1t2-chimera:free' // Additional free option from results
] as const;

export interface RateLimitInfo {
  isRateLimited: boolean;
  resetSeconds?: number;
  statusCode?: number;
  raw?: string;
  retryAfter?: number; // seconds until retry is allowed
}

/**
 * Exponential backoff configuration for rate limit retries
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000, // Start with 1 second
  maxDelayMs: 30000, // Max 30 seconds
};

/**
 * Result of a completed streaming session.
 */
export interface CompletionResult {
  fullText: string;
  totalTokensApprox: number;
  rateLimit?: RateLimitInfo;
}

/**
 * Simple event emitter for streaming without external deps.
 */
export class Emitter<T> {
  private listeners: Array<(data: T) => void> = [];
  on(listener: (data: T) => void): vscode.Disposable {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const idx = this.listeners.indexOf(listener);
        if (idx >= 0) this.listeners.splice(idx, 1);
      },
    };
  }
  emit(data: T) {
    for (const l of [...this.listeners]) {
      try {
        l(data);
      } catch (err) {
        // swallow
      }
    }
  }
  clear() {
    this.listeners = [];
  }
}

/**
 * LLMService handles:
 * - Building request
 * - Streaming response (Server-Sent Events style)
 * - Token usage approximation & warning threshold
 * - Rate limit detection with exponential backoff retry
 */
export class LLMService {
  private context: vscode.ExtensionContext;
  private sessionTokenUsage = 0; // approximate tokens for current VS Code session
  private warnThreshold: number;
  private retryConfig: RetryConfig;
  private outputChannel: vscode.OutputChannel;

  constructor(context: vscode.ExtensionContext, outputChannel?: vscode.OutputChannel) {
    this.context = context;
    const cfg = vscode.workspace.getConfiguration('vibe');
    this.warnThreshold = cfg.get<number>('token.warnThreshold', 14000);
    this.retryConfig = DEFAULT_RETRY_CONFIG;
    this.outputChannel = outputChannel || vscode.window.createOutputChannel('Vibe LLM');
  }

  public getSessionTokenUsage(): number {
    return this.sessionTokenUsage;
  }

  public resetSessionTokenUsage() {
    this.sessionTokenUsage = 0;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(2, attempt),
      this.retryConfig.maxDelayMs
    );
    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Perform a streamed completion with exponential backoff retry on rate limits.
   * Returns:
   * - emitter for chunks
   * - promise resolving once complete
   * - abort function
   */
  public streamChatCompletion(args: CompletionArgs): {
    emitter: Emitter<ChatStreamChunk>;
    done: Promise<CompletionResult>;
    abort: () => void;
  } {
    // Strict Enforcement: Block any non-free model attempts
    if (!FREE_MODELS.includes(args.model as typeof FREE_MODELS[number])) {
      const allowedModels = FREE_MODELS.join(', ');
      throw new Error(
        `Only free tier models allowed. Current free models: GLM-4.5-Air (default), DeepSeek Coder Lite, Qwen2.5 Coder, Phi-3 Mini. Requested model "${args.model}" is not in the allowed list: ${allowedModels}`
      );
    }

    const emitter = new Emitter<ChatStreamChunk>();
    const controller = new AbortController();
    const signal = args.signal ?? controller.signal;

    let fullText = '';
    let finished = false;
    let rateLimitInfo: RateLimitInfo | undefined;
    let headerUsageApprox = 0;

    const done = new Promise<CompletionResult>(async (resolve, reject) => {
      let attemptCount = 0;
      
      // Retry loop with exponential backoff for rate limits
      while (attemptCount <= this.retryConfig.maxRetries) {
        try {
          const body = {
            model: args.model,
            messages: args.messages,
            temperature: args.temperature ?? 0.1,
            stream: true,
          };

          this.outputChannel.appendLine(`[LLMService] Attempt ${attemptCount + 1}/${this.retryConfig.maxRetries + 1} - Requesting completion with model: ${args.model}`);

          const res = (await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${args.apiKey}`,
              'HTTP-Referer': 'https://github.com/mk-knight23/vibe-cli',
              'X-Title': 'Vibe VS Code',
            },
            body: JSON.stringify(body),
            signal,
          })) as Response;

          if (!res.ok) {
            const raw = await res.text();
            
            // Handle rate limit (429) with exponential backoff retry
            if (res.status === 429) {
              // Parse retry-after header if present
              const retryAfterHeader = res.headers.get('retry-after');
              const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;
              
              rateLimitInfo = {
                isRateLimited: true,
                statusCode: 429,
                raw,
                retryAfter: retryAfterSeconds || undefined,
              };

              if (attemptCount < this.retryConfig.maxRetries) {
                const backoffMs = retryAfterSeconds
                  ? retryAfterSeconds * 1000
                  : this.calculateBackoffDelay(attemptCount);
                
                this.outputChannel.appendLine(`[LLMService] Rate limit hit (429). Retrying in ${Math.floor(backoffMs / 1000)}s... (attempt ${attemptCount + 1}/${this.retryConfig.maxRetries})`);
                
                vscode.window.showWarningMessage(
                  `Vibe: Rate limit reached. Retrying in ${Math.floor(backoffMs / 1000)} seconds... (${attemptCount + 1}/${this.retryConfig.maxRetries})`
                );

                await this.sleep(backoffMs);
                attemptCount++;
                continue; // Retry the request
              } else {
                // Max retries exceeded
                this.outputChannel.appendLine(`[LLMService] Rate limit exceeded after ${this.retryConfig.maxRetries} retries.`);
                emitter.emit({
                  delta: '',
                  done: true,
                  error: `Rate limit reached after ${this.retryConfig.maxRetries} retries. Please wait and try again later.`,
                  usageTokensApprox: this.sessionTokenUsage,
                });
                finished = true;
                return resolve({
                  fullText,
                  totalTokensApprox: this.sessionTokenUsage,
                  rateLimit: rateLimitInfo,
                });
              }
            }
            
            // Non-rate-limit errors - don't retry
            throw new Error(`HTTP ${res.status}: ${truncate(raw, 300)}`);
          }

          // Success - process the response
          this.outputChannel.appendLine(`[LLMService] Request successful on attempt ${attemptCount + 1}`);

          if (!res.body) {
            throw new Error('No response body returned for streaming.');
          }

          const reader = (res.body as unknown as ReadableStream<Uint8Array>).getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done: streamDone, value } = await reader.read();
            if (streamDone) break;
            buffer += decoder.decode(value, { stream: true });

            // Process SSE lines
            const lines = buffer.split(/\r?\n/);
            // Keep last partial line in buffer
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.trim()) continue;
              if (line.startsWith('data:')) {
                const payload = line.slice(5).trim();
                if (payload === '[DONE]') {
                  finished = true;
                  break;
                }
                try {
                  const obj = JSON.parse(payload);
                  const contentDelta =
                    obj?.choices?.[0]?.delta?.content ??
                    obj?.choices?.[0]?.message?.content ??
                    '';

                  if (contentDelta) {
                    fullText += contentDelta;
                    const tokensDelta = approximateTokens(contentDelta);
                    this.sessionTokenUsage += tokensDelta;
                    emitter.emit({
                      delta: contentDelta,
                      done: false,
                      usageTokensApprox: this.sessionTokenUsage,
                    });

                    if (
                      this.sessionTokenUsage >= this.warnThreshold &&
                      this.sessionTokenUsage - tokensDelta < this.warnThreshold
                    ) {
                      vscode.window.showWarningMessage(
                        `Vibe: Session token usage approximated at ${this.sessionTokenUsage} (threshold ${this.warnThreshold}). Consider clearing chat or switching to smaller model.`
                      );
                    }
                  }
                } catch {
                  // Non-JSON lines ignored
                }
              }
            }
            if (finished) break;
          }

          // Parse x-openrouter-usage-estimated-tokens header from all responses
          const headerVal = res.headers.get('x-openrouter-usage-estimated-tokens');
          if (headerVal) {
            const parsed = Number(headerVal);
            if (!Number.isNaN(parsed) && parsed > 0) {
              headerUsageApprox = parsed;
              this.sessionTokenUsage = parsed;
              this.outputChannel.appendLine(`[LLMService] OpenRouter usage estimated tokens: ${parsed}`);
            }
          }

          emitter.emit({
            delta: '',
            done: true,
            usageTokensApprox: this.sessionTokenUsage,
          });

          resolve({
            fullText,
            totalTokensApprox: headerUsageApprox || this.sessionTokenUsage,
            rateLimit: rateLimitInfo,
          });
          
          return; // Exit the retry loop on success
        } catch (err: any) {
          if (signal.aborted) {
            emitter.emit({
              delta: '',
              done: true,
              error: 'Aborted',
              usageTokensApprox: this.sessionTokenUsage,
            });
            return resolve({
              fullText,
              totalTokensApprox: headerUsageApprox || this.sessionTokenUsage,
              rateLimit: rateLimitInfo,
            });
          }
          
          const msg = err?.message || String(err);
          this.outputChannel.appendLine(`[LLMService] Error on attempt ${attemptCount + 1}: ${msg}`);
          
          // Don't retry on non-rate-limit errors
          emitter.emit({
            delta: '',
            done: true,
            error: msg,
            usageTokensApprox: this.sessionTokenUsage,
          });
          return reject(err);
        }
      } // End of retry while loop
    });

    return {
      emitter,
      done,
      abort: () => controller.abort(),
    };
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

/**
 * Resolve OpenRouter API key with priority:
 *  1. process.env.OPENROUTER_API_KEY
 *  2. VS Code setting: vibe.openRouter.apiKey
 *  3. Hardcoded fallback (development only)
 *
 * Validation: Fail activation if no valid key found (except in debug mode)
 */
export function getOpenRouterApiKey(): string {
  const cfg = vscode.workspace.getConfiguration('vibe');

  const envKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const configKey = (cfg.get<string>('openRouter.apiKey', '') || '').trim();

  const apiKey = envKey || configKey;

  if (!apiKey) {
    const errorMsg =
      'Vibe: OpenRouter API key required. Set the OPENROUTER_API_KEY environment variable or the "vibe.openRouter.apiKey" VS Code setting. Only free-tier models are supported: GLM-4.5-Air (default), DeepSeek Coder Lite, Qwen2.5 Coder, Phi-3 Mini, DeepSeek R1T2 Chimera.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log('Vibe: OpenRouter API key loaded from ' + (envKey ? 'environment' : 'settings'));
  return apiKey;
}

/**
 * Build system prompt for given mode/persona/custom prompts.
 * This mirrors Kilo Code constraints: safe, grounded, reversible edits.
 */
export interface SystemPromptArgs {
  baseMode: string;
  personaLabel: string;
  personaDescription: string;
  customModePrompt?: string;
  autoApprove?: boolean;
  maxContextFiles?: number;
}

export function buildSystemPrompt(args: SystemPromptArgs): string {
  const base =
    'You are Vibe (Kilo-style), a privacy-first AI assistant inside VS Code. Respond with grounded, verifiable guidance. Avoid hallucinations by requesting file reads if uncertain. Provide diffs instead of whole-file rewrites when changing code.';
  const modeLine = `Current Mode: ${args.baseMode}`;
  const personaLine = `Persona: ${args.personaLabel} — ${args.personaDescription}`;
  const customLine = args.customModePrompt
    ? `Custom Mode Directive: ${args.customModePrompt}`
    : '';
  const approveLine = args.autoApprove
    ? 'Auto-approve mode ON: user intends to apply safe diffs. Still describe planned changes first.'
    : 'Auto-approve mode OFF: do not assume destructive operations are permitted; propose diffs & await confirmation.';
  const contextLine = `Context File Limit: ${args.maxContextFiles ?? 30}. Request additional files if needed.`;

  return [base, modeLine, personaLine, customLine, approveLine, contextLine]
    .filter(Boolean)
    .join('\n\n');
}