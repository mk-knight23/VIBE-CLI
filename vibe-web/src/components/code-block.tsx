"use client";

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { cn } from '../lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"

interface CodeBlockProps {
  code: string;
  className?: string;
}

/* Dark redesign: ambient glow + gradient focus state. */
const CodeBlock = ({ code, className }: CodeBlockProps) => {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setHasCopied(true);
    toast({ description: 'Copied to clipboard!' });
    setTimeout(() => setHasCopied(false), 1800);
  };

  return (
    <div
      className={cn(
        "relative group font-code rounded-xl border border-border/50 bg-card/60 p-4 text-sm backdrop-blur-sm glow-border ambient ease-smooth",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
          Terminal
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-md border border-transparent hover:border-accent/40 hover:bg-accent/10 ease-smooth"
          onClick={copyToClipboard}
          aria-label="Copy code"
        >
          {hasCopied ? (
            <Check className="h-4 w-4 text-accent animate-pulse" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground ease-smooth" />
          )}
        </Button>
      </div>
      <pre className="relative overflow-x-auto rounded-lg border border-border/40 bg-black/40 p-3 font-code">
        <code className="text-[13px] leading-relaxed text-foreground">{code}</code>
      </pre>
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-0 transition-all group-hover:ring-1 group-hover:ring-accent/40" />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute top-3 right-3 h-6 w-6" />
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Copy to clipboard</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default CodeBlock;
