"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "oklch(0.9266 0.064 146.41",
          "--success-text": "oklch(0.5951 0.1865 143.84)",
          "--success-border": "oklch(0.5951 0.1865 143.84)",
          "--error-bg": "oklch(0.9517 0.024052 17.5826)",
          "--error-text": "oklch(0.5205 0.2115 29.02)",
          "--error-border": "oklch(0.5205 0.2115 29.02)",
          "--warning-bg": "oklch(0.97 0.02 85)",
          "--warning-text": "oklch(0.4 0.1 85)",
          "--warning-border": "oklch(0.85 0.03 85)",
          "--info-bg": "oklch(0.97 0.01 240)",
          "--info-text": "oklch(0.3 0.05 240)",
          "--info-border": "oklch(0.85 0.02 240)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
