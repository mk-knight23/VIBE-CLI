"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Download, Code } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface EnhancedCodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
  copyable?: boolean;
  downloadable?: boolean;
  theme?: "light" | "dark";
}

export default function EnhancedCodeBlock({
  code,
  language = "bash",
  filename,
  showLineNumbers = true,
  className = "",
  copyable = true,
  downloadable = false,
  theme
}: EnhancedCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const currentTheme = theme || resolvedTheme || "dark";
  
  const syntaxTheme = currentTheme === "dark" ? oneDark : oneLight;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `code.${language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative group ${className}`}
    >
      {/* Header with filename and actions */}
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-card border border-border rounded-t-lg">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{filename}</span>
          </div>
          <div className="flex items-center gap-2">
            {copyable && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      className="h-7 px-2"
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Copy className="h-4 w-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copied ? "Copied!" : "Copy code"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {downloadable && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadCode}
                      className="h-7 px-2"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download code</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}

      {/* Code block with syntax highlighting */}
      <div className="relative overflow-hidden rounded-b-lg border border-border border-t-0">
        <SyntaxHighlighter
          language={language}
          style={syntaxTheme}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: "1.5rem",
            background: "transparent",
            fontSize: "0.875rem",
            lineHeight: "1.5",
          }}
          lineNumberStyle={{
            minWidth: "3em",
            paddingRight: "1em",
            color: currentTheme === "dark" ? "#6B7280" : "#9CA3AF",
          }}
        >
          {code}
        </SyntaxHighlighter>

        {/* Copy overlay for better UX */}
        {copyable && !filename && (
          <motion.div
            className="absolute top-2 right-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-7 px-2 bg-background/80 backdrop-blur-sm"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Check className="h-4 w-4 text-green-500" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Copy className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? "Copied!" : "Copy code"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </div>

      {/* Language indicator */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase">{language}</span>
        {copyable && (
          <span className="text-xs text-muted-foreground">
            {copied ? "Copied to clipboard!" : "Click to copy"}
          </span>
        )}
      </div>
    </motion.div>
  );
}