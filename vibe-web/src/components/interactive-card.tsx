"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface InteractiveCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverRotate?: number;
  glowColor?: string;
}

export function InteractiveCard({ 
  children, 
  className = "", 
  hoverScale = 1.02,
  hoverRotate = 0,
  glowColor = "rgba(34,211,238,0.3)"
}: InteractiveCardProps) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      whileHover={{ 
        scale: hoverScale,
        rotate: hoverRotate,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20 
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          zIndex: -1
        }}
      />
      {children}
    </motion.div>
  );
}

export function AnimatedIcon({ 
  children, 
  className = "",
  hoverScale = 1.2,
  hoverRotate = 0
}: { 
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverRotate?: number;
}) {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover={{ 
        scale: hoverScale,
        rotate: hoverRotate
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 10 
      }}
    >
      {children}
    </motion.div>
  );
}