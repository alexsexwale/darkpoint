"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, rows = 4, ...props }, ref) => {
    return (
      <div className="nk-form-group">
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            "nk-form-control nk-form-control-textarea",
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

TextArea.displayName = "TextArea";


