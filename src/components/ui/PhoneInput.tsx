"use client";

import { useState, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (rawValue: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
  id?: string;
}

/**
 * Formats digits to display format with brackets
 * Input: "0721231234" -> Output: "(072) 123 1234"
 */
function formatWithBrackets(digits: string): string {
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

/**
 * Formats a raw phone number (digits only) to display format
 * Input: "27721231234" -> Output: "+27 (072) 123 1234"
 */
export function formatPhoneForDisplay(rawPhone: string): string {
  if (!rawPhone) return "";
  
  // Remove any non-digit characters
  let digits = rawPhone.replace(/\D/g, "");
  
  if (digits.length === 0) return "";
  
  // Handle South African numbers (starting with 27)
  if (digits.startsWith("27")) {
    const rest = digits.slice(2);
    if (rest.length === 0) return "+27";
    // Add leading 0 for display
    return `+27 ${formatWithBrackets("0" + rest)}`;
  }
  
  // Handle numbers starting with 0 (local format)
  if (digits.startsWith("0")) {
    return `+27 ${formatWithBrackets(digits)}`;
  }
  
  // For other formats, assume SA number - add 0 prefix
  return `+27 ${formatWithBrackets("0" + digits)}`;
}

/**
 * Converts display format to raw digits for database storage
 * Input: "(072) 123 1234" -> Output: "27721231234"
 */
export function parsePhoneToRaw(displayPhone: string): string {
  if (!displayPhone) return "";
  
  // Remove all non-digit characters
  let digits = displayPhone.replace(/\D/g, "");
  
  // If starts with 0, convert to 27
  if (digits.startsWith("0")) {
    digits = "27" + digits.slice(1);
  }
  
  // If doesn't start with country code, assume SA
  if (!digits.startsWith("27") && digits.length > 0) {
    digits = "27" + digits;
  }
  
  return digits;
}

/**
 * Validates if a phone number is a valid SA mobile number
 */
export function isValidSAPhone(rawPhone: string): boolean {
  if (!rawPhone) return false;
  const digits = rawPhone.replace(/\D/g, "");
  // Should be 27 + 9 digits = 11 digits total
  return digits.length === 11 && digits.startsWith("27");
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, placeholder = "072 123 1234", required, disabled, className, name, id }, ref) => {
    const [displayDigits, setDisplayDigits] = useState("");
    
    // Initialize from raw value (e.g., "27721231234" -> "0721231234")
    useEffect(() => {
      if (value) {
        const digits = value.replace(/\D/g, "");
        if (digits.startsWith("27") && digits.length > 2) {
          // Convert 27XXXXXXXXX to 0XXXXXXXXX for display
          setDisplayDigits("0" + digits.slice(2));
        } else if (digits.startsWith("0")) {
          setDisplayDigits(digits);
        } else if (digits.length > 0) {
          setDisplayDigits(digits);
        } else {
          setDisplayDigits("");
        }
      } else {
        setDisplayDigits("");
      }
    }, [value]);
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        if (displayDigits.length > 0) {
          const newDigits = displayDigits.slice(0, -1);
          setDisplayDigits(newDigits);
          // Store as 27XXXXXXXXX (remove leading 0 if present)
          if (newDigits.length > 0) {
            if (newDigits.startsWith("0") && newDigits.length > 1) {
              onChange("27" + newDigits.slice(1));
            } else if (newDigits.startsWith("0")) {
              onChange("");
            } else {
              onChange("27" + newDigits);
            }
          } else {
            onChange("");
          }
        }
        return;
      }
      
      // Handle delete
      if (e.key === "Delete") {
        e.preventDefault();
        setDisplayDigits("");
        onChange("");
        return;
      }
      
      // Allow: tab, escape, enter, arrows
      if (
        e.key === "Tab" ||
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "Home" ||
        e.key === "End" ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.ctrlKey && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) ||
        (e.metaKey && ["a", "c", "v", "x"].includes(e.key.toLowerCase()))
      ) {
        return;
      }
      
      // Only allow digits and limit to 10 digits
      if (/^\d$/.test(e.key) && displayDigits.length < 10) {
        e.preventDefault();
        const newDigits = displayDigits + e.key;
        setDisplayDigits(newDigits);
        // Store as 27XXXXXXXXX (remove leading 0 if present)
        if (newDigits.startsWith("0") && newDigits.length > 1) {
          onChange("27" + newDigits.slice(1));
        } else if (!newDigits.startsWith("0")) {
          onChange("27" + newDigits);
        }
        return;
      }
      
      // Block everything else
      e.preventDefault();
    };
    
    // Handle paste
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      let digits = pastedText.replace(/\D/g, "");
      
      // Convert from storage format (27XXXXXXXXX) to display format (0XXXXXXXXX)
      if (digits.startsWith("27") && digits.length > 2) {
        digits = "0" + digits.slice(2);
      }
      
      // Limit to 10 digits
      digits = digits.slice(0, 10);
      
      setDisplayDigits(digits);
      // Store as 27XXXXXXXXX
      if (digits.startsWith("0") && digits.length > 1) {
        onChange("27" + digits.slice(1));
      } else if (digits.length > 0 && !digits.startsWith("0")) {
        onChange("27" + digits);
      } else {
        onChange("");
      }
    };
    
    return (
      <div className={cn(
        "flex items-center w-full bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] focus-within:border-[var(--color-main-1)] transition-colors",
        disabled && "bg-[var(--color-dark-4)] cursor-not-allowed",
        className
      )}>
        {/* Fixed +27 prefix */}
        <span className="pl-4 pr-1 text-white/60 select-none">+27</span>
        
        {/* Input for the rest of the number */}
        <input
          ref={ref}
          type="tel"
          name={name}
          id={id}
          value={formatWithBrackets(displayDigits)}
          onChange={() => {}} // Handled by keydown
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="flex-1 py-3 pr-4 bg-transparent text-white placeholder-[var(--muted-foreground)] focus:outline-none"
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
