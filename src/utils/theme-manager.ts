/**
 * VIBE CLI Theme System
 * Customizable colors and dark/light mode support
 */

import chalk from 'chalk';

export type ThemeName = 'dark' | 'light' | 'dracula' | 'nord' | 'github' | 'custom';
export type ColorRole = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'accent';

export interface Theme {
    name: ThemeName;
    colors: Record<ColorRole, string>;
    background: string;
    foreground: string;
    emoji: boolean;
}

export interface ThemePreset {
    dark: Theme;
    light: Theme;
    dracula: Theme;
    nord: Theme;
    github: Theme;
}

const presets: ThemePreset = {
    dark: {
        name: 'dark',
        colors: {
            primary: '#61dafb',
            secondary: '#a29bfe',
            success: '#00b894',
            warning: '#fdcb6e',
            error: '#ff7675',
            info: '#74b9ff',
            muted: '#636e72',
            accent: '#fd79a8',
        },
        background: '#1a1a2e',
        foreground: '#e8e8e8',
        emoji: true,
    },
    light: {
        name: 'light',
        colors: {
            primary: '#0984e3',
            secondary: '#6c5ce7',
            success: '#00b894',
            warning: '#fdcb6e',
            error: '#d63031',
            info: '#0984e3',
            muted: '#b2bec3',
            accent: '#e84393',
        },
        background: '#ffffff',
        foreground: '#2d3436',
        emoji: true,
    },
    dracula: {
        name: 'dracula',
        colors: {
            primary: '#bd93f9',
            secondary: '#6272a4',
            success: '#50fa7b',
            warning: '#f1fa8c',
            error: '#ff5555',
            info: '#8be9fd',
            muted: '#6272a4',
            accent: '#ff79c6',
        },
        background: '#282a36',
        foreground: '#f8f8f2',
        emoji: true,
    },
    nord: {
        name: 'nord',
        colors: {
            primary: '#88c0d0',
            secondary: '#81a1c1',
            success: '#a3be8c',
            warning: '#ebcb8b',
            error: '#bf616a',
            info: '#5e81ac',
            muted: '#4c566a',
            accent: '#b48ead',
        },
        background: '#2e3440',
        foreground: '#eceff4',
        emoji: true,
    },
    github: {
        name: 'github',
        colors: {
            primary: '#0969da',
            secondary: '#8250df',
            success: '#1a7f37',
            warning: '#9a6700',
            error: '#cf222e',
            info: '#0550ae',
            muted: '#656d76',
            accent: '#bf3989',
        },
        background: '#ffffff',
        foreground: '#24292f',
        emoji: true,
    },
};

export class ThemeManager {
    private currentTheme: Theme;
    private customColors: Map<ColorRole, string> = new Map();
    private emojiEnabled: boolean = true;

    constructor(themeName: ThemeName = 'dark') {
        this.currentTheme = this.getTheme(themeName);
    }

    getTheme(name: ThemeName): Theme {
        if (name === 'custom') {
            return {
                name: 'custom',
                colors: this.getAllColors(),
                background: '#1a1a2e',
                foreground: '#e8e8e8',
                emoji: this.emojiEnabled,
            };
        }
        return { ...presets[name] };
    }

    setTheme(name: ThemeName): void {
        this.currentTheme = this.getTheme(name);
    }

    getAllColors(): Record<ColorRole, string> {
        const colors: Record<ColorRole, string> = {} as Record<ColorRole, string>;
        const roles: ColorRole[] = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'muted', 'accent'];
        
        for (const role of roles) {
            colors[role] = this.customColors.get(role) || this.currentTheme.colors[role];
        }
        
        return colors;
    }

    setColor(role: ColorRole, hexColor: string): void {
        this.customColors.set(role, hexColor);
        if (this.currentTheme.name === 'custom') {
            this.currentTheme.colors[role] = hexColor;
        }
    }

    getColor(role: ColorRole): string {
        return this.customColors.get(role) || this.currentTheme.colors[role];
    }

    setEmoji(enabled: boolean): void {
        this.emojiEnabled = enabled;
        this.currentTheme.emoji = enabled;
    }

    isEmojiEnabled(): boolean {
        return this.emojiEnabled;
    }

    getCurrentTheme(): Theme {
        return { ...this.currentTheme };
    }

    getThemeNames(): string[] {
        return Object.keys(presets) as ThemeName[];
    }

    getThemeInfo(name: ThemeName): string {
        const theme = this.getTheme(name);
        const colors = Object.entries(theme.colors)
            .map(([role, color]) => `  ${role}: ${color}`)
            .join('\n');
        return `Theme: ${theme.name}\nBackground: ${theme.background}\nForeground: ${theme.foreground}\nColors:\n${colors}`;
    }
}

export const themeManager = new ThemeManager();

export function applyTheme(name: ThemeName = 'dark'): void {
    themeManager.setTheme(name);
}

export function getThemedChalk() {
    const colors = themeManager.getAllColors();
    return {
        primary: chalk.hex(colors.primary),
        secondary: chalk.hex(colors.secondary),
        success: chalk.hex(colors.success),
        warning: chalk.hex(colors.warning),
        error: chalk.hex(colors.error),
        info: chalk.hex(colors.info),
        muted: chalk.hex(colors.muted),
        accent: chalk.hex(colors.accent),
    };
}

export function getEmoji(emoji: string): string {
    return themeManager.isEmojiEnabled() ? emoji : '';
}
