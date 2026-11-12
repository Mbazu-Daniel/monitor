import * as React from "react";

export function Slot({
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  if (!React.isValidElement(children)) return null;
  return React.cloneElement(children, {
    ...(props as Record<string, unknown>),
    className: [props.className, (children.props as { className?: string }).className]
      .filter(Boolean)
      .join(" ") || undefined,
  } as Partial<typeof children.props>);
}
