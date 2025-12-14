import * as vscode from 'vscode';

export interface VibeConfiguration {
  // API Keys (secure storage)
  openrouterApiKey: string;
  megallmApiKey: string;
  agentrouterApiKey: string;
  routewayApiKey: string;

  // Provider Settings
  provider: 'openrouter' | 'megallm' | 'agentrouter' | 'routeway';
  defaultModel: string;
  executionMode: 'ask' | 'code' | 'debug' | 'architect' | 'orchestrator';

  // Safety Settings
  autoApproveUnsafeOps: boolean;
  maxContextFiles: number;
  contextWindowSize: number;

  // Feature Toggles
  streamingEnabled: boolean;
  enableMemorySystem: boolean;
  memoryMaxItems: number;
  enableTaskHistory: boolean;
  taskHistoryMaxItems: number;
  enableDiffPreview: boolean;
  diffPreviewTimeout: number;
  enableToolExecutionFeedback: boolean;
  toolExecutionTimeout: number;

  // Advanced Features
  enableBatchOperations: boolean;
  batchOperationMaxFiles: number;
  enableDependencyTracking: boolean;
  enableProviderFallback: boolean;
  providerRetryAttempts: number;
  providerTimeout: number;
  enableRateLimiting: boolean;
  rateLimitRequestsPerMinute: number;

  // Logging & Monitoring
  enableStructuredLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enablePerformanceMonitoring: boolean;
  performanceLogThreshold: number;

  // Git Integration
  enableGitIntegration: boolean;
  gitAutoCommit: boolean;

  // Sandbox Settings
  enableSandbox: boolean;
  sandboxTimeout: number;
  allowNetworkInSandbox: boolean;

  // Project Generation
  enableProjectGeneration: boolean;
  projectTemplatesPath: string;

  // Agent Mode
  enableAgentMode: boolean;
  agentMaxSteps: number;
  agentDecisionTimeout: number;

  // Security & Quality
  enableSecurityScanning: boolean;
  securityScanLevel: 'basic' | 'standard' | 'comprehensive';
  enableCodeQualityAnalysis: boolean;
  codeQualityThreshold: number;

  // File Management
  enableAutoSave: boolean;
  autoSaveDelay: number;
  enableBackupOnEdit: boolean;
  backupRetentionDays: number;

  // Telemetry
  enableTelemetry: boolean;
  telemetryLevel: 'minimal' | 'standard' | 'detailed';
}

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: VibeConfiguration;
  private configChangeEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

  public readonly onDidChangeConfiguration: vscode.Event<void> = this.configChangeEmitter.event;

  private constructor() {
    this.config = this.loadConfiguration();
    this.setupConfigurationWatcher();
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Get the current configuration
   */
  public getConfiguration(): VibeConfiguration {
    return { ...this.config };
  }

  /**
   * Update a configuration value
   */
  public async updateConfiguration<K extends keyof VibeConfiguration>(
    key: K,
    value: VibeConfiguration[K]
  ): Promise<void> {
    // Validate the value
    if (!this.validateConfigurationValue(key, value)) {
      throw new Error(`Invalid value for configuration '${key}': ${value}`);
    }

    // Update VS Code settings
    const config = vscode.workspace.getConfiguration('vibe');
    await config.update(key, value, vscode.ConfigurationTarget.Global);

    // Update local cache
    this.config[key] = value;

    // Notify listeners
    this.configChangeEmitter.fire();
  }

  /**
   * Get a specific configuration value
   */
  public get<K extends keyof VibeConfiguration>(key: K): VibeConfiguration[K] {
    return this.config[key];
  }

  /**
   * Check if a feature is enabled
   */
  public isFeatureEnabled(feature: keyof VibeConfiguration): boolean {
    const value = this.config[feature];
    return typeof value === 'boolean' ? value : false;
  }

  /**
   * Get API key for a specific provider
   */
  public getApiKey(provider: 'openrouter' | 'megallm' | 'agentrouter' | 'routeway'): string {
    switch (provider) {
      case 'openrouter':
        return this.config.openrouterApiKey;
      case 'megallm':
        return this.config.megallmApiKey;
      case 'agentrouter':
        return this.config.agentrouterApiKey;
      case 'routeway':
        return this.config.routewayApiKey;
      default:
        return '';
    }
  }

  /**
   * Set API key for a specific provider
   */
  public async setApiKey(
    provider: 'openrouter' | 'megallm' | 'agentrouter' | 'routeway',
    apiKey: string
  ): Promise<void> {
    const key = `${provider}ApiKey` as keyof VibeConfiguration;
    await this.updateConfiguration(key, apiKey);
  }

  /**
   * Get all provider configurations
   */
  public getProviderConfigs() {
    return {
      openrouter: {
        apiKey: this.config.openrouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        models: [
          'x-ai/grok-4.1-fast',
          'z-ai/glm-4.5-air:free',
          'deepseek/deepseek-chat-v3',
          'qwen/qwen3-coder-32b-instruct',
          'openai-gpt-oss-20b',
          'google/gemini-2.0-flash-exp:free'
        ]
      },
      megallm: {
        apiKey: this.config.megallmApiKey,
        baseURL: 'https://ai.megallm.io/v1',
        models: [
          'llama-3.3-70b-instruct',
          'deepseek-r1-distill-llama-70b',
          'moonshotai/kimi-k2-instruct-0905',
          'deepseek-ai/deepseek-v3.1-terminus',
          'minimaxai/minimax-m2',
          'qwen/qwen3-next-80b-a3b-instruct',
          'deepseek-ai/deepseek-v3.1',
          'mistralai/mistral-nemotron',
          'alibaba-qwen3-32b',
          'openai-gpt-oss-120b',
          'llama3-8b-instruct',
          'claude-3.5-sonnet'
        ]
      },
      agentrouter: {
        apiKey: this.config.agentrouterApiKey,
        baseURL: 'https://api.agentrouter.ai/v1',
        models: [
          'anthropic/claude-haiku-4.5',
          'anthropic/claude-sonnet-4.5',
          'deepseek/deepseek-r1',
          'deepseek/deepseek-v3.1',
          'deepseek/deepseek-v3.2',
          'zhipu/glm-4.5',
          'zhipu/glm-4.6'
        ]
      },
      routeway: {
        apiKey: this.config.routewayApiKey,
        baseURL: 'https://api.routeway.ai/v1',
        models: [
          'moonshot/kimi-k2',
          'minimax/minimax-m2',
          'zhipu/glm-4.6-free',
          'deepseek/deepseek-v3-free',
          'meta/llama-3.2-3b-free',
          'gpt-4o-mini'
        ]
      }
    };
  }

  /**
   * Validate configuration values
   */
  private validateConfigurationValue<K extends keyof VibeConfiguration>(
    key: K,
    value: any
  ): boolean {
    const validators: Partial<Record<keyof VibeConfiguration, (val: any) => boolean>> = {
      // String validations
      openrouterApiKey: (val) => typeof val === 'string',
      megallmApiKey: (val) => typeof val === 'string',
      agentrouterApiKey: (val) => typeof val === 'string',
      routewayApiKey: (val) => typeof val === 'string',
      defaultModel: (val) => typeof val === 'string' && val.length > 0,
      projectTemplatesPath: (val) => typeof val === 'string',

      // Enum validations
      provider: (val) => ['openrouter', 'megallm', 'agentrouter', 'routeway'].includes(val),
      executionMode: (val) => ['ask', 'code', 'debug', 'architect', 'orchestrator'].includes(val),
      logLevel: (val) => ['error', 'warn', 'info', 'debug'].includes(val),
      securityScanLevel: (val) => ['basic', 'standard', 'comprehensive'].includes(val),
      telemetryLevel: (val) => ['minimal', 'standard', 'detailed'].includes(val),

      // Boolean validations
      autoApproveUnsafeOps: (val) => typeof val === 'boolean',
      streamingEnabled: (val) => typeof val === 'boolean',
      enableMemorySystem: (val) => typeof val === 'boolean',
      enableTaskHistory: (val) => typeof val === 'boolean',
      enableDiffPreview: (val) => typeof val === 'boolean',
      enableToolExecutionFeedback: (val) => typeof val === 'boolean',
      enableBatchOperations: (val) => typeof val === 'boolean',
      enableDependencyTracking: (val) => typeof val === 'boolean',
      enableProviderFallback: (val) => typeof val === 'boolean',
      enableRateLimiting: (val) => typeof val === 'boolean',
      enableStructuredLogging: (val) => typeof val === 'boolean',
      enableGitIntegration: (val) => typeof val === 'boolean',
      gitAutoCommit: (val) => typeof val === 'boolean',
      enableSandbox: (val) => typeof val === 'boolean',
      allowNetworkInSandbox: (val) => typeof val === 'boolean',
      enableProjectGeneration: (val) => typeof val === 'boolean',
      enableAgentMode: (val) => typeof val === 'boolean',
      enablePerformanceMonitoring: (val) => typeof val === 'boolean',
      enableSecurityScanning: (val) => typeof val === 'boolean',
      enableCodeQualityAnalysis: (val) => typeof val === 'boolean',
      enableAutoSave: (val) => typeof val === 'boolean',
      enableBackupOnEdit: (val) => typeof val === 'boolean',
      enableTelemetry: (val) => typeof val === 'boolean',

      // Number validations with ranges
      maxContextFiles: (val) => typeof val === 'number' && val >= 1 && val <= 100,
      contextWindowSize: (val) => typeof val === 'number' && [32000, 64000, 128000, 256000, 512000].includes(val),
      memoryMaxItems: (val) => typeof val === 'number' && val >= 10 && val <= 10000,
      taskHistoryMaxItems: (val) => typeof val === 'number' && val >= 5 && val <= 500,
      diffPreviewTimeout: (val) => typeof val === 'number' && val >= 5000 && val <= 120000,
      toolExecutionTimeout: (val) => typeof val === 'number' && val >= 10000 && val <= 300000,
      batchOperationMaxFiles: (val) => typeof val === 'number' && val >= 1 && val <= 100,
      providerRetryAttempts: (val) => typeof val === 'number' && val >= 1 && val <= 10,
      providerTimeout: (val) => typeof val === 'number' && val >= 5000 && val <= 120000,
      rateLimitRequestsPerMinute: (val) => typeof val === 'number' && val >= 10 && val <= 1000,
      sandboxTimeout: (val) => typeof val === 'number' && val >= 5000 && val <= 120000,
      agentMaxSteps: (val) => typeof val === 'number' && val >= 5 && val <= 100,
      agentDecisionTimeout: (val) => typeof val === 'number' && val >= 1000 && val <= 60000,
      performanceLogThreshold: (val) => typeof val === 'number' && val >= 100 && val <= 60000,
      codeQualityThreshold: (val) => typeof val === 'number' && val >= 0 && val <= 100,
      autoSaveDelay: (val) => typeof val === 'number' && val >= 0 && val <= 10000,
      backupRetentionDays: (val) => typeof val === 'number' && val >= 1 && val <= 365
    };

    const validator = validators[key];
    return validator ? validator(value) : true;
  }

  /**
   * Load configuration from VS Code settings
   */
  private loadConfiguration(): VibeConfiguration {
    const config = vscode.workspace.getConfiguration('vibe');

    return {
      // API Keys
      openrouterApiKey: config.get<string>('openrouterApiKey', ''),
      megallmApiKey: config.get<string>('megallmApiKey', ''),
      agentrouterApiKey: config.get<string>('agentrouterApiKey', ''),
      routewayApiKey: config.get<string>('routewayApiKey', ''),

      // Provider Settings
      provider: config.get<'openrouter' | 'megallm' | 'agentrouter' | 'routeway'>('provider', 'megallm'),
      defaultModel: config.get<string>('defaultModel', 'qwen/qwen3-next-80b-a3b-instruct'),
      executionMode: config.get<'ask' | 'code' | 'debug' | 'architect' | 'orchestrator'>('executionMode', 'code'),

      // Safety Settings
      autoApproveUnsafeOps: config.get<boolean>('autoApproveUnsafeOps', false),
      maxContextFiles: config.get<number>('maxContextFiles', 20),
      contextWindowSize: config.get<number>('contextWindowSize', 128000),

      // Feature Toggles
      streamingEnabled: config.get<boolean>('streamingEnabled', true),
      enableMemorySystem: config.get<boolean>('enableMemorySystem', true),
      memoryMaxItems: config.get<number>('memoryMaxItems', 1000),
      enableTaskHistory: config.get<boolean>('enableTaskHistory', true),
      taskHistoryMaxItems: config.get<number>('taskHistoryMaxItems', 50),
      enableDiffPreview: config.get<boolean>('enableDiffPreview', true),
      diffPreviewTimeout: config.get<number>('diffPreviewTimeout', 30000),
      enableToolExecutionFeedback: config.get<boolean>('enableToolExecutionFeedback', true),
      toolExecutionTimeout: config.get<number>('toolExecutionTimeout', 60000),

      // Advanced Features
      enableBatchOperations: config.get<boolean>('enableBatchOperations', true),
      batchOperationMaxFiles: config.get<number>('batchOperationMaxFiles', 10),
      enableDependencyTracking: config.get<boolean>('enableDependencyTracking', true),
      enableProviderFallback: config.get<boolean>('enableProviderFallback', true),
      providerRetryAttempts: config.get<number>('providerRetryAttempts', 3),
      providerTimeout: config.get<number>('providerTimeout', 30000),
      enableRateLimiting: config.get<boolean>('enableRateLimiting', true),
      rateLimitRequestsPerMinute: config.get<number>('rateLimitRequestsPerMinute', 60),

      // Logging & Monitoring
      enableStructuredLogging: config.get<boolean>('enableStructuredLogging', true),
      logLevel: config.get<'error' | 'warn' | 'info' | 'debug'>('logLevel', 'info'),
      enablePerformanceMonitoring: config.get<boolean>('enablePerformanceMonitoring', true),
      performanceLogThreshold: config.get<number>('performanceLogThreshold', 5000),

      // Git Integration
      enableGitIntegration: config.get<boolean>('enableGitIntegration', true),
      gitAutoCommit: config.get<boolean>('gitAutoCommit', false),

      // Sandbox Settings
      enableSandbox: config.get<boolean>('enableSandbox', true),
      sandboxTimeout: config.get<number>('sandboxTimeout', 30000),
      allowNetworkInSandbox: config.get<boolean>('allowNetworkInSandbox', false),

      // Project Generation
      enableProjectGeneration: config.get<boolean>('enableProjectGeneration', true),
      projectTemplatesPath: config.get<string>('projectTemplatesPath', ''),

      // Agent Mode
      enableAgentMode: config.get<boolean>('enableAgentMode', true),
      agentMaxSteps: config.get<number>('agentMaxSteps', 20),
      agentDecisionTimeout: config.get<number>('agentDecisionTimeout', 10000),

      // Security & Quality
      enableSecurityScanning: config.get<boolean>('enableSecurityScanning', true),
      securityScanLevel: config.get<'basic' | 'standard' | 'comprehensive'>('securityScanLevel', 'standard'),
      enableCodeQualityAnalysis: config.get<boolean>('enableCodeQualityAnalysis', true),
      codeQualityThreshold: config.get<number>('codeQualityThreshold', 70),

      // File Management
      enableAutoSave: config.get<boolean>('enableAutoSave', true),
      autoSaveDelay: config.get<number>('autoSaveDelay', 1000),
      enableBackupOnEdit: config.get<boolean>('enableBackupOnEdit', true),
      backupRetentionDays: config.get<number>('backupRetentionDays', 7),

      // Telemetry
      enableTelemetry: config.get<boolean>('enableTelemetry', false),
      telemetryLevel: config.get<'minimal' | 'standard' | 'detailed'>('telemetryLevel', 'minimal')
    };
  }

  /**
   * Setup configuration change watcher
   */
  private setupConfigurationWatcher(): void {
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('vibe')) {
        this.config = this.loadConfiguration();
        this.configChangeEmitter.fire();
      }
    });
  }

  /**
   * Reset configuration to defaults
   */
  public async resetToDefaults(): Promise<void> {
    const defaultConfig: Partial<VibeConfiguration> = {
      provider: 'megallm',
      defaultModel: 'qwen/qwen3-next-80b-a3b-instruct',
      executionMode: 'code',
      autoApproveUnsafeOps: false,
      maxContextFiles: 20,
      contextWindowSize: 128000,
      streamingEnabled: true,
      enableMemorySystem: true,
      memoryMaxItems: 1000,
      enableTaskHistory: true,
      taskHistoryMaxItems: 50,
      enableDiffPreview: true,
      diffPreviewTimeout: 30000,
      enableToolExecutionFeedback: true,
      toolExecutionTimeout: 60000,
      enableBatchOperations: true,
      batchOperationMaxFiles: 10,
      enableDependencyTracking: true,
      enableProviderFallback: true,
      providerRetryAttempts: 3,
      providerTimeout: 30000,
      enableRateLimiting: true,
      rateLimitRequestsPerMinute: 60,
      enableStructuredLogging: true,
      logLevel: 'info',
      enablePerformanceMonitoring: true,
      performanceLogThreshold: 5000,
      enableGitIntegration: true,
      gitAutoCommit: false,
      enableSandbox: true,
      sandboxTimeout: 30000,
      allowNetworkInSandbox: false,
      enableProjectGeneration: true,
      projectTemplatesPath: '',
      enableAgentMode: true,
      agentMaxSteps: 20,
      agentDecisionTimeout: 10000,
      enableSecurityScanning: true,
      securityScanLevel: 'standard',
      enableCodeQualityAnalysis: true,
      codeQualityThreshold: 70,
      enableAutoSave: true,
      autoSaveDelay: 1000,
      enableBackupOnEdit: true,
      backupRetentionDays: 7,
      enableTelemetry: false,
      telemetryLevel: 'minimal'
    };

    const config = vscode.workspace.getConfiguration('vibe');
    for (const [key, value] of Object.entries(defaultConfig)) {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    this.config = this.loadConfiguration();
    this.configChangeEmitter.fire();
  }

  /**
   * Export configuration (without API keys)
   */
  public exportConfiguration(): Record<string, any> {
    const exportable = { ...this.config };
    // Remove sensitive information
    const configToExport = { ...exportable };
    delete (configToExport as any).openrouterApiKey;
    delete (configToExport as any).megallmApiKey;
    delete (configToExport as any).agentrouterApiKey;
    delete (configToExport as any).routewayApiKey;
    return configToExport;
  }

  /**
   * Import configuration
   */
  public async importConfiguration(configData: Record<string, any>): Promise<void> {
    const config = vscode.workspace.getConfiguration('vibe');

    for (const [key, value] of Object.entries(configData)) {
      if (key in this.config && !key.includes('ApiKey')) { // Don't import API keys
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }
    }

    this.config = this.loadConfiguration();
    this.configChangeEmitter.fire();
  }

  /**
   * Get configuration summary for display
   */
  public getConfigurationSummary(): string {
    return `Provider: ${this.config.provider}, Model: ${this.config.defaultModel}`;
  }
}
