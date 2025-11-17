"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface DropdownItem {
  href: string;
  label: string;
  description?: string;
}

interface NavigationDropdownProps {
  title: string;
  items: DropdownItem[];
}

export function NavigationDropdown({ title, items }: NavigationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {title}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg backdrop-blur-sm"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <div className="p-2">
              {items.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    <div className="font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}