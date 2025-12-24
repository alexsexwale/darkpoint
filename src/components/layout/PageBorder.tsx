"use client";

export function PageBorder() {
  // Page borders removed due to visual artifacts (horizontal lines)
  // Only keeping the top border for the header area
  return (
    <div className="nk-page-border pointer-events-none">
      <div className="nk-page-border-t" />
    </div>
  );
}
