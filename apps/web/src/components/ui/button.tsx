import * as React from "react"
import { Button as BaseButton } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--cta)] text-[#fdfaf6] hover:bg-[var(--cta-hover)]",
        night:
          "bg-night text-night-foreground hover:bg-[color-mix(in_srgb,var(--night)_82%,var(--accent))]",
        destructive:
          "bg-[var(--red-soft)] text-red hover:bg-[color-mix(in_srgb,var(--red-soft)_75%,var(--red)_25%)]",
        outline:
          "border border-foreground/40 bg-transparent text-foreground hover:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-sand-deep",
        ghost:
          "hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 px-4 text-[13px] has-[>svg]:px-3",
        lg: "h-14 px-8 text-base has-[>svg]:px-6",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  })

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  return (
    <BaseButton
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={asChild ? children as React.ReactElement : undefined}
      {...(asChild ? { children: undefined } : { children })}
      {...props}
    />)
}

export { Button }
