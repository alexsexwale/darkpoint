"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, stripHtml } from "@/lib/utils";

interface ProductDescriptionProps {
  description: string;
  maxLength?: number;
  className?: string;
}

export function ProductDescription({ 
  description, 
  maxLength = 300,
  className 
}: ProductDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Clean and process the description
  const cleanDescription = useMemo(() => stripHtml(description), [description]);
  
  // Check if we need the read more button
  const needsTruncation = cleanDescription.length > maxLength;
  
  // Get truncated text
  const truncatedText = useMemo(() => {
    if (!needsTruncation || isExpanded) return cleanDescription;
    
    // Find a good break point (end of sentence or word)
    let truncateAt = maxLength;
    const lastPeriod = cleanDescription.lastIndexOf('.', maxLength);
    const lastSpace = cleanDescription.lastIndexOf(' ', maxLength);
    
    if (lastPeriod > maxLength * 0.7) {
      truncateAt = lastPeriod + 1;
    } else if (lastSpace > maxLength * 0.7) {
      truncateAt = lastSpace;
    }
    
    return cleanDescription.slice(0, truncateAt).trim();
  }, [cleanDescription, maxLength, needsTruncation, isExpanded]);

  // Split text into paragraphs for better rendering
  const paragraphs = useMemo(() => {
    const text = isExpanded ? cleanDescription : truncatedText;
    return text.split('\n').filter(p => p.trim());
  }, [cleanDescription, truncatedText, isExpanded]);

  return (
    <div className={cn("nk-product-description", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? "expanded" : "collapsed"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="prose prose-invert max-w-none"
        >
          {paragraphs.map((paragraph, index) => (
            <p 
              key={index} 
              className="text-[var(--muted-foreground)] leading-relaxed mb-3 last:mb-0"
            >
              {paragraph}
              {/* Add ellipsis to the last paragraph if truncated */}
              {!isExpanded && needsTruncation && index === paragraphs.length - 1 && (
                <span className="text-white/40">...</span>
              )}
            </p>
          ))}
        </motion.div>
      </AnimatePresence>
      
      {/* Read More / Read Less Button */}
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 flex items-center gap-2 text-[var(--color-main-1)] hover:text-[var(--color-main-1)]/80 transition-colors cursor-pointer group"
        >
          <span className="text-sm font-medium">
            {isExpanded ? "Read Less" : "Read More"}
          </span>
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7" 
            />
          </motion.svg>
        </button>
      )}
    </div>
  );
}

