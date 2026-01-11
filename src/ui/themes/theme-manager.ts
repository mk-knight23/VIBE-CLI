/**
 * VIBE-CLI v12 - Theme Manager
 * Customizable CLI interface with themes and verbosity levels
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Available themes
 */
export type ThemeName = 'dark' | 'light' | 'solarized' | 'high-contrast' | 'nord';

/**
 * Verbosity levels
 */
export type VerbosityLevel = 'silent' | 'normal' | 'verbose' | 'debug';

/**
 * Theme colors configuration
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  muted: string;
  highlight: string;
  background: string;
  text: string;
}

/**
 * UI configuration
 */
export interface UIConfig {
  theme: ThemeName;
  verbosity: VerbosityLevel;
  showTimestamps: boolean;
  colorOutput: boolean;
  compactMode: boolean;
  emojiEnabled: boolean;
  animationEnabled: boolean;
}

/**
 * Theme definition
 */
export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  colors: ThemeColors;
  icons: ThemeIcons;
}

/**
 * Theme icons configuration
 */
export interface ThemeIcons {
  success: string;
  error: string;
  warning: string;
  info: string;
  spinner: string[];
  progress: string;
  file: string;
  folder: string;
  branch: string;
  commit: string;
}

/**
 * Theme Manager
 */
export class ThemeManager {
  private readonly configPath: string;
  private currentConfig: UIConfig;
  private currentTheme: Theme;
  private readonly themes: Map<ThemeName, Theme>;

  constructor() {
    this.configPath = path.join(process.cwd(), '.vibe', 'ui-config.json');
    this.currentConfig = this.loadConfig();
    this.themes = this.initializeThemes();
    this.currentTheme = this.themes.get(this.currentConfig.theme) || this.themes.get('dark')!;
  }

  /**
   * Initialize all available themes
   */
  private initializeThemes(): Map<ThemeName, Theme> {
    const themes: Map<ThemeName, Theme> = new Map();

    // Dark theme (default)
    themes.set('dark', {
      name: 'dark',
      displayName: 'Dark',
      description: 'Default dark theme with cyan primary color',
      colors: {
        primary: '#06b6d4', // cyan
        secondary: '#64748b', // slate
        success: '#22c55e', // green
        error: '#ef4444', // red
        warning: '#f59e0b', // amber
        info: '#3b82f6', // blue
        muted: '#64748b', // slate
        highlight: '#f0f9ff', // sky
        background: '#0f172a', // slate 900
        text: '#e2e8f0', // slate 200
      },
      icons: {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
        spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        progress: '█',
        file: '📄',
        folder: '📁',
        branch: '⑂',
        commit: '●',
      },
    });

    // Light theme
    themes.set('light', {
      name: 'light',
      displayName: 'Light',
      description: 'Clean light theme for bright terminals',
      colors: {
        primary: '#0284c7', // sky blue
        secondary: '#64748b', // slate
        success: '#16a34a', // green
        error: '#dc2626', // red
        warning: '#d97706', // amber
        info: '#2563eb', // blue
        muted: '#94a3b8', // slate
        highlight: '#f0f9ff', // sky
        background: '#ffffff',
        text: '#1e293b', // slate 800
      },
      icons: {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
        spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        progress: '█',
        file: '📄',
        folder: '📁',
        branch: '⑂',
        commit: '●',
      },
    });

    // Solarized theme
    themes.set('solarized', {
      name: 'solarized',
      displayName: 'Solarized',
      description: 'Solarized color scheme ( Ethan Schoonover )',
      colors: {
        primary: '#268bd2', // blue
        secondary: '#586e75', // base0
        success: '#859900', // green
        error: '#dc322f', // red
        warning: '#b58900', // yellow
        info: '#2aa198', // cyan
        muted: '#93a1a1', // base1
        highlight: '#eee8d5', // base2
        background: '#002b36', // base03
        text: '#839496', // base0
      },
      icons: {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
        spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        progress: '█',
        file: '📄',
        folder: '📁',
        branch: '⑂',
        commit: '●',
      },
    });

    // High contrast theme
    themes.set('high-contrast', {
      name: 'high-contrast',
      displayName: 'High Contrast',
      description: 'High contrast theme for accessibility',
      colors: {
        primary: '#00ffff', // cyan
        secondary: '#ffffff', // white
        success: '#00ff00', // lime
        error: '#ff0000', // red
        warning: '#ffff00', // yellow
        info: '#00ffff', // cyan
        muted: '#c0c0c0', // silver
        highlight: '#ffffff', // white
        background: '#000000', // black
        text: '#ffffff', // white
      },
      icons: {
        success: '[OK]',
        error: '[ERR]',
        warning: '[WRN]',
        info: '[INF]',
        spinner: ['##', '##', '##', '##'],
        progress: '=',
        file: '[FILE]',
        folder: '[DIR]',
        branch: '[BR]',
        commit: '[CM]',
      },
    });

    // Nord theme
    themes.set('nord', {
      name: 'nord',
      displayName: 'Nord',
      description: 'Arctic, north-bluish color palette',
      colors: {
        primary: '#88c0d0', // nord 7
        secondary: '#81a1c1', // nord 9
        success: '#a3be8c', // nord 14
        error: '#bf616a', // nord 11
        warning: '#ebcb8b', // nord 13
        info: '#5e81ac', // nord 10
        muted: '#4c566a', // nord 3
        highlight: '#eceff4', // nord 6
        background: '#2e3440', // nord 0
        text: '#d8dee9', // nord 4
      },
      icons: {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
        spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        progress: '█',
        file: '📄',
        folder: '📁',
        branch: '⑂',
        commit: '●',
      },
    });

    return themes;
  }

  /**
   * Load configuration
   */
  private loadConfig(): UIConfig {
    const defaultConfig: UIConfig = {
      theme: 'dark',
      verbosity: 'normal',
      showTimestamps: false,
      colorOutput: true,
      compactMode: false,
      emojiEnabled: true,
      animationEnabled: true,
    };

    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const saved = JSON.parse(content);
        return { ...defaultConfig, ...saved };
      } catch {
        // Return defaults
      }
    }

    return defaultConfig;
  }

  /**
   * Save configuration
   */
  private saveConfig(): void {
    let config: any = {};

    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        config = JSON.parse(content);
      } catch {
        config = {};
      }
    }

    config.ui = this.currentConfig;

    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Set theme
   */
  setTheme(themeName: ThemeName): boolean {
    if (!this.themes.has(themeName)) {
      return false;
    }

    this.currentTheme = this.themes.get(themeName)!;
    this.currentConfig.theme = themeName;
    this.saveConfig();
    return true;
  }

  /**
   * Get current theme
   */
  getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Get all available themes
   */
  getThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Set verbosity level
   */
  setVerbosity(level: VerbosityLevel): void {
    this.currentConfig.verbosity = level;
    this.saveConfig();
  }

  /**
   * Get verbosity level
   */
  getVerbosity(): VerbosityLevel {
    return this.currentConfig.verbosity;
  }

  /**
   * Check if verbose output is enabled
   */
  isVerbose(): boolean {
    return this.currentConfig.verbosity === 'verbose' ||
           this.currentConfig.verbosity === 'debug';
  }

  /**
   * Check if debug output is enabled
   */
  isDebug(): boolean {
    return this.currentConfig.verbosity === 'debug';
  }

  /**
   * Set compact mode
   */
  setCompactMode(enabled: boolean): void {
    this.currentConfig.compactMode = enabled;
    this.saveConfig();
  }

  /**
   * Check if compact mode is enabled
   */
  isCompactMode(): boolean {
    return this.currentConfig.compactMode;
  }

  /**
   * Set emoji enabled
   */
  setEmojiEnabled(enabled: boolean): void {
    this.currentConfig.emojiEnabled = enabled;
    this.saveConfig();
  }

  /**
   * Check if emojis are enabled
   */
  isEmojiEnabled(): boolean {
    return this.currentConfig.emojiEnabled;
  }

  /**
   * Set show timestamps
   */
  setShowTimestamps(enabled: boolean): void {
    this.currentConfig.showTimestamps = enabled;
    this.saveConfig();
  }

  /**
   * Check if timestamps should be shown
   */
  shouldShowTimestamps(): boolean {
    return this.currentConfig.showTimestamps;
  }

  /**
   * Check if colors are enabled
   */
  shouldUseColors(): boolean {
    return this.currentConfig.colorOutput && process.stdout.isTTY;
  }

  /**
   * Set color output
   */
  setColorOutput(enabled: boolean): void {
    this.currentConfig.colorOutput = enabled;
    this.saveConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): UIConfig {
    return { ...this.currentConfig };
  }

  /**
   * Apply theme to output
   */
  applyTheme(text: string, style: keyof ThemeColors): string {
    if (!this.shouldUseColors()) {
      return text;
    }

    const color = this.currentTheme.colors[style];
    return chalk.hex(color)(text);
  }

  /**
   * Get icon for a type
   */
  getIcon(iconType: keyof ThemeIcons): string {
    const icon = this.currentTheme.icons[iconType];
    if (!icon) return '';
    if (!this.isEmojiEnabled()) {
      return Array.isArray(icon) ? icon[0] : icon;
    }
    return Array.isArray(icon) ? icon[0] : icon;
  }

  /**
   * Format output with current theme
   */
  format(
    message: string,
    options: {
      prefix?: string;
      style?: keyof ThemeColors;
      timestamp?: boolean;
      icon?: keyof ThemeIcons;
    } = {}
  ): string {
    const { prefix, style, timestamp, icon } = options;
    const parts: string[] = [];

    // Add timestamp
    if (timestamp || this.shouldShowTimestamps()) {
      parts.push(chalk.gray(new Date().toLocaleTimeString()));
    }

    // Add icon
    if (icon) {
      parts.push(this.getIcon(icon));
    }

    // Add prefix
    if (prefix) {
      parts.push(chalk.gray(prefix));
    }

    // Add styled message
    if (style) {
      parts.push(this.applyTheme(message, style));
    } else {
      parts.push(message);
    }

    return parts.join(' ');
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson) as UIConfig;
      this.currentConfig = { ...this.currentConfig, ...imported };

      if (imported.theme && this.themes.has(imported.theme)) {
        this.currentTheme = this.themes.get(imported.theme)!;
      }

      this.saveConfig();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.currentConfig = {
      theme: 'dark',
      verbosity: 'normal',
      showTimestamps: false,
      colorOutput: true,
      compactMode: false,
      emojiEnabled: true,
      animationEnabled: true,
    };
    this.currentTheme = this.themes.get('dark')!;
    this.saveConfig();
  }

  /**
   * Get help text for configuration
   */
  getHelpText(): string {
    const themeList = this.getThemes()
      .map((t) => `  ${t.name.padEnd(15)} - ${t.description}`)
      .join('\n');

    return `
${chalk.bold('UI Configuration')}

${chalk.bold('Themes:')}
${themeList}

${chalk.bold('Verbosity Levels:')}
  silent          - No output except errors
  normal          - Standard output (default)
  verbose         - Detailed output
  debug           - Full debug information

${chalk.bold('Commands:')}
  vibe config set-theme <name>    - Set the UI theme
  vibe config set-verbosity <level> - Set verbosity level
  vibe config set-compact on|off  - Enable/disable compact mode
  vibe config set-emoji on|off    - Enable/disable emoji
  vibe config show               - Show current configuration

${chalk.bold('Examples:')}
  vibe config set-theme dark
  vibe config set-theme solarized
  vibe config set-verbosity verbose
  vibe config set-compact on
`;
  }
}

/**
 * Singleton instance
 */
export const themeManager = new ThemeManager();
