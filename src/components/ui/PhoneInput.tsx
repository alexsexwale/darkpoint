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
 * Formats local digits (without country code) to display format
 * Input: "721231234" -> Output: "72 123 1234"
 */
function formatLocalNumber(digits: string): string {
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}

/**
 * Formats a raw phone number (digits only) to display format
 * Input: "27721231234" -> Output: "+27 72 123 1234"
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
    return `+27 ${formatLocalNumber(rest)}`;
  }
  
  // Handle numbers starting with 0 (local format)
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    return `+27 ${formatLocalNumber(rest)}`;
  }
  
  // For other formats, assume SA number
  return `+27 ${formatLocalNumber(digits)}`;
}

/**
 * Converts display format to raw digits for database storage
 * Input: "+27 (072) 123 1234" -> Output: "27721231234"
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

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, placeholder = "72 123 4567", required, disabled, className, name, id }, ref) => {
    const [localDigits, setLocalDigits] = useState("");
    
    // Initialize from raw value (e.g., "27721231234" -> "721231234")
    useEffect(() => {
      if (value) {
        const digits = value.replace(/\D/g, "");
        if (digits.startsWith("27")) {
          setLocalDigits(digits.slice(2));
        } else if (digits.startsWith("0")) {
          setLocalDigits(digits.slice(1));
        } else {
          setLocalDigits(digits);
        }
      } else {
        setLocalDigits("");
      }
    }, [value]);
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = e.target as HTMLInputElement;
      
      // Handle backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        if (localDigits.length > 0) {
          const newDigits = localDigits.slice(0, -1);
          setLocalDigits(newDigits);
          onChange(newDigits.length > 0 ? "27" + newDigits : "");
        }
        return;
      }
      
      // Handle delete
      if (e.key === "Delete") {
        e.preventDefault();
        setLocalDigits("");
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
      
      // Only allow digits and limit to 9 digits
      if (/^\d$/.test(e.key) && localDigits.length < 9) {
        e.preventDefault();
        const newDigits = localDigits + e.key;
        setLocalDigits(newDigits);
        onChange("27" + newDigits);
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
      
      // Remove leading 27 or 0 if present
      if (digits.startsWith("27")) {
        digits = digits.slice(2);
      } else if (digits.startsWith("0")) {
        digits = digits.slice(1);
      }
      
      // Limit to 9 digits
      digits = digits.slice(0, 9);
      
      setLocalDigits(digits);
      onChange(digits.length > 0 ? "27" + digits : "");
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
          value={formatLocalNumber(localDigits)}
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
