import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-chili text-cream shadow-[var(--shadow-chili)] hover:bg-chili-hot",
        secondary:
          "bg-surface text-fg shadow-card hover:bg-elevated",
        ghost: "text-muted hover:text-fg hover:bg-elevated",
        cream: "bg-ink text-cream hover:bg-fg",
        outline:
          "bg-transparent text-fg shadow-[0_0_0_1px_var(--color-border-strong)] hover:bg-elevated",
      },
      size: {
        default: "min-h-11 px-5 py-2.5 rounded-full text-sm",
        lg: "min-h-12 px-6 py-3.5 rounded-full text-base",
        sm: "min-h-9 px-3.5 py-2 rounded-full text-sm",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
