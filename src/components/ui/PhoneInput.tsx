"use client";

import { useState, useEffect } from "react";

interface PhoneInputProps {
  value: string; // Stored as: 27XXXXXXXXX (no + or spaces)
  onChange: (value: string) => void; // Returns storage format
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  name?: string;
}

/**
 * South African Phone Input with mask
 * Display format: +27 XX XXX XXXX
 * Storage format: 27XXXXXXXXX (digits only)
 * 
 * User enters the 9-digit local number (e.g., 72 123 4567)
 * The +27 prefix is always shown and auto-prepended
 */
export function PhoneInput({
  value,
  onChange,
  placeholder = "+27 XX XXX XXXX",
  disabled = false,
  required = false,
  className = "",
  name,
}: PhoneInputProps) {
  const [localNumber, setLocalNumber] = useState("");

  // Extract local number (9 digits after 27) from storage value
  const extractLocalNumber = (storage: string): string => {
    if (!storage) return "";
    const digits = storage.replace(/\D/g, "");
    
    // If it starts with 27, extract the rest
    if (digits.startsWith("27")) {
      return digits.slice(2);
    }
    // If it starts with 0, remove it
    if (digits.startsWith("0")) {
      return digits.slice(1);
    }
    return digits;
  };

  // Format local number for display: XX XXX XXXX
  const formatLocalNumber = (local: string): string => {
    if (!local) return "";
    
    if (local.length <= 2) {
      return local;
    } else if (local.length <= 5) {
      return `${local.slice(0, 2)} ${local.slice(2)}`;
    } else {
      return `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 9)}`;
    }
  };

  // Build display value with +27 prefix
  const buildDisplayValue = (local: string): string => {
    if (!local) return "";
    return `+27 ${formatLocalNumber(local)}`;
  };

  // Initialize from stored value
  useEffect(() => {
    setLocalNumber(extractLocalNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Remove the "+27 " prefix if present, then get only digits
    let cleaned = input;
    if (cleaned.startsWith("+27")) {
      cleaned = cleaned.slice(3);
    }
    let digits = cleaned.replace(/\D/g, "");
    
    // If they typed with leading 0, remove it
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    
    // Limit to 9 digits (local number)
    if (digits.length > 9) {
      digits = digits.slice(0, 9);
    }
    
    setLocalNumber(digits);
    
    // Store with 27 prefix if we have digits
    if (digits) {
      onChange("27" + digits);
    } else {
      onChange("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      
      if (localNumber.length > 0) {
        const newLocal = localNumber.slice(0, -1);
        setLocalNumber(newLocal);
        onChange(newLocal ? "27" + newLocal : "");
      }
      return;
    }

    // Allow: delete, tab, escape, enter, and navigation
    if (
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Home" ||
      e.key === "End" ||
      (e.key === "a" && (e.ctrlKey || e.metaKey)) ||
      (e.key === "c" && (e.ctrlKey || e.metaKey)) ||
      (e.key === "v" && (e.ctrlKey || e.metaKey)) ||
      (e.key === "x" && (e.ctrlKey || e.metaKey))
    ) {
      return;
    }

    // Only allow digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // Prevent if already at max length
    if (localNumber.length >= 9) {
      e.preventDefault();
      return;
    }

    // Handle digit input manually for better control
    e.preventDefault();
    let digit = e.key;
    
    // If first digit is 0, skip it (convert local to international)
    if (localNumber.length === 0 && digit === "0") {
      return;
    }
    
    const newLocal = localNumber + digit;
    setLocalNumber(newLocal);
    onChange("27" + newLocal);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    
    // Extract only digits
    let digits = pastedText.replace(/\D/g, "");
    
    // Handle various formats
    if (digits.startsWith("27")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    
    // Limit to 9 digits
    if (digits.length > 9) {
      digits = digits.slice(0, 9);
    }
    
    if (digits) {
      setLocalNumber(digits);
      onChange("27" + digits);
    }
  };

  // Display value
  const displayValue = localNumber ? buildDisplayValue(localNumber) : "";

  return (
    <input
      type="tel"
      name={name}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      autoComplete="tel"
      className={className}
    />
  );
}

// Utility functions for use elsewhere
export const formatPhoneForDisplay = (storage: string): string => {
  if (!storage) return "";
  
  const digits = storage.replace(/\D/g, "");
  
  if (digits.length < 3) return "";
  
  // Extract local number
  let local = digits;
  if (digits.startsWith("27")) {
    local = digits.slice(2);
  } else if (digits.startsWith("0")) {
    local = digits.slice(1);
  }
  
  if (!local) return "";
  
  // Format: +27 XX XXX XXXX
  if (local.length <= 2) {
    return `+27 ${local}`;
  } else if (local.length <= 5) {
    return `+27 ${local.slice(0, 2)} ${local.slice(2)}`;
  } else {
    return `+27 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 9)}`;
  }
};

export const formatPhoneForStorage = (display: string): string => {
  const digits = display.replace(/\D/g, "");
  
  if (digits.startsWith("0")) {
    return "27" + digits.slice(1);
  }
  if (!digits.startsWith("27") && digits.length > 0) {
    return "27" + digits;
  }
  
  return digits;
};

export const isValidSAPhone = (storage: string): boolean => {
  const digits = storage.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("27");
};
