import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm hover:shadow-md hover:shadow-primary/20 dark:hover:shadow-[0_0_15px_rgba(172,66,60,0.35)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/95 shadow-sm focus-visible:ring-2 focus-visible:ring-destructive",
        outline: "border border-input bg-background hover:bg-accent/10 hover:text-accent hover:border-accent/40 hover:shadow-[0_0_12px_rgba(172,66,60,0.15)] focus-visible:ring-2 focus-visible:ring-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-secondary",
        ghost: "hover:bg-accent/10 hover:text-accent hover:shadow-[0_0_12px_rgba(172,66,60,0.1)] focus-visible:bg-accent/15 focus-visible:text-accent focus-visible:ring-2 focus-visible:ring-accent",
        link: "text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary",
        accent: "bg-accent text-accent-foreground hover:bg-accent/95 shadow-sm hover:shadow-md hover:shadow-accent/20 dark:hover:shadow-[0_0_15px_rgba(172,66,60,0.35)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        hero: "gradient-accent text-accent-foreground shadow-lg hover:shadow-xl hover:shadow-accent/30 dark:hover:shadow-[0_0_20px_rgba(172,66,60,0.45)] hover:scale-[1.02] active:scale-[0.98]",
        "hero-outline": "border-2 border-accent-foreground/20 bg-transparent text-accent-foreground hover:bg-accent-foreground/10 hover:border-accent-foreground/45 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-accent",
        success: "bg-success text-success-foreground hover:bg-success/95 shadow-sm dark:hover:shadow-[0_0_15px_rgba(142,71,60,0.35)] focus-visible:ring-2 focus-visible:ring-success",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
