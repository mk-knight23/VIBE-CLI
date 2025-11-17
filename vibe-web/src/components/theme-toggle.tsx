"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === "dark" ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <motion.div
          initial={false}
          animate={{ opacity: theme === "dark" ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <Sun className="h-5 w-5" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{ opacity: theme === "dark" ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
        >
          <Moon className="h-5 w-5" />
        </motion.div>
      </motion.div>
    </Button>
  );
}