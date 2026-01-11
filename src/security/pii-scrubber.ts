/**
 * VIBE-CLI v12 - PII Scrubber
 *
 * Pattern-based PII detection and redaction:
 * - Email addresses
 * - Phone numbers
 * - Credit cards
 * - Social security numbers
 * - IP addresses
 * - Custom patterns
 */

export interface ScrubberConfig {
  redactEmails: boolean;
  redactPhoneNumbers: boolean;
  redactCreditCards: boolean;
  redactSSN: boolean;
  redactIPAddresses: boolean;
  customPatterns: RedactionPattern[];
  replacement: string;
  preserveStructure: boolean;
}

export interface RedactionPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export interface ScrubResult {
  original: string;
  scrubbed: string;
  redactions: Redaction[];
  hadRedactions: boolean;
}

export interface Redaction {
  pattern: string;
  original: string;
  position: { start: number; end: number };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SCRUBBER_CONFIG: ScrubberConfig = {
  redactEmails: true,
  redactPhoneNumbers: true,
  redactCreditCards: true,
  redactSSN: true,
  redactIPAddresses: true,
  customPatterns: [],
  replacement: '[REDACTED]',
  preserveStructure: false,
};

// ============================================================================
// Built-in Patterns
// ============================================================================

const BUILTIN_PATTERNS: RedactionPattern[] = [
  {
    name: 'Email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL]',
  },
  {
    name: 'PhoneNumber',
    pattern: /(?:\+?1[-.\s]?)?\(?[2-9][0-9]{2}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    replacement: '[PHONE]',
  },
  {
    name: 'CreditCard',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    replacement: '[CREDIT_CARD]',
  },
  {
    name: 'SSN',
    pattern: /\b[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{4}\b/g,
    replacement: '[SSN]',
  },
  {
    name: 'IPAddress',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: '[IP]',
  },
  {
    name: 'IPv6',
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    replacement: '[IPv6]',
  },
  {
    name: 'HighEntropyString',
    pattern: /\b[A-Za-z0-9-_]{32,}\b/g,
    replacement: '[API_KEY]',
  },
];

// ============================================================================
// PII Scrubber
// ============================================================================

export class PIIScrubber {
  private readonly config: ScrubberConfig;
  private patterns: RedactionPattern[];

  constructor(config?: Partial<ScrubberConfig>) {
    this.config = { ...DEFAULT_SCRUBBER_CONFIG, ...config };
    this.patterns = [...BUILTIN_PATTERNS];

    if (this.config.customPatterns) {
      for (const pattern of this.config.customPatterns) {
        this.patterns.push(pattern);
      }
    }
  }

  /**
   * Scrub PII from text
   */
  scrub(text: string): ScrubResult {
    const redactions: Redaction[] = [];
    let scrubbed = text;
    const offsets: { start: number; end: number; replacement: string }[] = [];

    for (const pattern of this.patterns) {
      let match: RegExpExecArray | null;
      const regex = pattern.pattern;

      while ((match = regex.exec(text)) !== null) {
        const original = match[0];
        if (!original) continue;

        redactions.push({
          pattern: pattern.name,
          original,
          position: { start: match.index, end: match.index + original.length },
        });

        offsets.push({
          start: match.index,
          end: match.index + original.length,
          replacement: pattern.replacement,
        });
      }
    }

    // Sort offsets in reverse order to apply from end to start
    offsets.sort((a, b) => b.start - a.start);

    for (const offset of offsets) {
      scrubbed = scrubbed.substring(0, offset.start) + offset.replacement + scrubbed.substring(offset.end);
    }

    return {
      original: text,
      scrubbed,
      redactions,
      hadRedactions: redactions.length > 0,
    };
  }

  /**
   * Scrub PII from an object (recursive)
   */
  scrubObject<T extends Record<string, unknown>>(obj: T): T {
    const scrub = (value: unknown): unknown => {
      if (typeof value === 'string') {
        return this.scrub(value).scrubbed;
      }
      if (Array.isArray(value)) {
        return value.map(scrub);
      }
      if (typeof value === 'object' && value !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = scrub(val);
        }
        return result;
      }
      return value;
    };

    return scrub(obj) as T;
  }

  /**
   * Check if text contains PII
   */
  containsPII(text: string): { contains: boolean; types: string[] } {
    const types: string[] = [];

    for (const pattern of this.patterns) {
      if (pattern.pattern.test(text)) {
        types.push(pattern.name);
        pattern.pattern.lastIndex = 0;
      }
    }

    return {
      contains: types.length > 0,
      types,
    };
  }

  /**
   * Get statistics about PII in text
   */
  getStatistics(text: string): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const pattern of this.patterns) {
      const regex = pattern.pattern;
      let match: RegExpExecArray | null;
      let count = 0;

      while ((match = regex.exec(text)) !== null) {
        count++;
      }

      if (count > 0) {
        stats[pattern.name] = count;
      }
    }

    return stats;
  }

  /**
   * Add a custom pattern
   */
  addPattern(pattern: RedactionPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Remove a pattern by name
   */
  removePattern(name: string): boolean {
    const index = this.patterns.findIndex((p) => p.name === name);
    if (index === -1) return false;

    this.patterns.splice(index, 1);
    return true;
  }

  /**
   * Get all active patterns
   */
  getPatterns(): RedactionPattern[] {
    return [...this.patterns];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const piiScrubber = new PIIScrubber();
