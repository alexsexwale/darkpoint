"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = "text", ...props }, ref) => {
    return (
      <div className="nk-form-group">
        <input
          ref={ref}
          type={type}
          className={cn(
            "nk-form-control",
            error && "nk-form-control-error",
            className
          )}
          {...props}
        />
        {error && <span className="nk-form-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";


