"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, checked, ...props }, ref) => {
    return (
      <label className="flex cursor-pointer items-start gap-3 select-none">
        <span className="relative inline-flex">
          <input
            ref={ref}
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            {...props}
          />
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md border border-input bg-background transition peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
              className
            )}
          >
            <Check
              className={cn(
                "h-3.5 w-3.5 text-primary-foreground transition-opacity",
                checked ? "opacity-100" : "opacity-0"
              )}
            />
          </span>
        </span>
        {label && (
          <span className="text-sm leading-snug text-muted-foreground">
            {label}
          </span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
