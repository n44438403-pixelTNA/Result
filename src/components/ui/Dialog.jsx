import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {children}
    </div>
  );
}

export function DialogContent({ children, className }) {
  const contentRef = useRef(null);

  return (
    <div
      ref={contentRef}
      className={cn("bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative flex flex-col gap-4", className)}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, children }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children }) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({ className, children }) {
  return (
    <p className={cn("text-sm text-gray-500", className)}>
      {children}
    </p>
  );
}
