import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "purple";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-zinc-800 text-zinc-200 border-zinc-700",
    secondary: "bg-zinc-900 text-zinc-400 border-zinc-800",
    destructive: "bg-red-950/80 text-red-300 border-red-800/60",
    outline: "text-zinc-300 border-zinc-700 bg-transparent",
    success: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
    purple: "bg-violet-950/80 text-violet-300 border-violet-800/60",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
