import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

// HIGH CONTRAST - semua tombol harus jelas di putih & gelap
const variantClasses: Record<string, string> = {
  // Primary: navy solid di light, gold solid di dark -> kontras 12:1+
  default:
    "bg-[#1a365d] text-white hover:bg-[#0f2540] dark:bg-[#CBA12C] dark:text-[#1a365d] dark:hover:bg-[#d4b44a] border border-transparent shadow-md hover:shadow-lg font-semibold",
  destructive:
    "bg-[#dc2626] text-white hover:bg-[#b91c1c] border border-[#991b1b] shadow-md font-semibold",
  // Outline: putih solid + border navy tebal 2px -> kontras tinggi di putih
  outline:
    "bg-white text-[#1a365d] hover:bg-[#f8fafc] dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 border-2 border-[#1a365d] dark:border-slate-600 shadow-sm font-semibold",
  // Secondary: gold solid -> kontras di putih & gelap
  secondary:
    "bg-[#CBA12C] text-[#1a365d] hover:bg-[#b8941f] dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 border border-[#CBA12C] dark:border-slate-600 shadow font-semibold",
  ghost:
    "text-[#1a365d] dark:text-slate-200 hover:bg-[#1a365d]/10 dark:hover:bg-white/10 border border-transparent",
  link: "text-[#1a365d] dark:text-[#CBA12C] underline-offset-4 hover:underline font-medium",
};

const sizeClasses: Record<string, string> = {
  default: "h-11 px-6 py-2",
  sm: "h-9 px-4 text-sm",
  lg: "h-12 px-8",
  icon: "h-11 w-11",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CBA12C] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-target active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
