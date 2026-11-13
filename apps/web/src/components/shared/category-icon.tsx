import {
  Wrench, Zap, Droplets, Armchair, Wifi, Monitor, Building2, HardHat, SprayCan,
  DoorOpen, Paintbrush, Settings,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ComponentType } from "react";

type Icon = ComponentType<{ className?: string }>;

const CATEGORY_ICONS: Record<string, Icon> = {
  Wrench, Zap, Droplets, Armchair, Wifi, Monitor, Building2, HardHat, SprayCan, DoorOpen, Paintbrush, Settings,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] || Wrench;
  return <Icon className={cn("h-4 w-4", className)} />;
}
