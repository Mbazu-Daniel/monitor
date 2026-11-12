import * as React from "react";
import { cn } from "@/lib/utils";
type State={open:boolean;setOpen:(open:boolean)=>void};const Context=React.createContext<State|null>(null);
export function AlertDialog({children}:{children:React.ReactNode}){const [open,setOpen]=React.useState(false);return <Context.Provider value={{open,setOpen}}>{children}</Context.Provider>}
export function AlertDialogTrigger({asChild,children,...p}:{asChild?:boolean;children:React.ReactElement}&React.ComponentProps<"button">){const c=React.useContext(Context);const onClick=(e:React.MouseEvent)=>{const childProps=children.props as {onClick?:(e:React.MouseEvent)=>void};childProps.onClick?.(e);c?.setOpen(true)};return asChild?React.cloneElement(children,{onClick} as Partial<typeof children.props>):<button type="button" {...p} onClick={()=>c?.setOpen(true)}>{children}</button>}
export function AlertDialogContent({className,children,...p}:React.HTMLAttributes<HTMLDivElement>){const c=React.useContext(Context);if(!c?.open)return null;return <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" {...p}><div className={cn("w-full max-w-lg rounded-2xl border border-border bg-popover p-6 shadow-[var(--shadow)] ",className)}>{children}</div></div>}
export const AlertDialogHeader=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn("flex flex-col space-y-1.5",className)} {...p}/>;
export const AlertDialogFooter=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",className)} {...p}/>;
export const AlertDialogTitle=({className,...p}:React.HTMLAttributes<HTMLHeadingElement>)=><h2 className={cn("text-lg font-semibold",className)} {...p}/>;
export const AlertDialogDescription=({className,...p}:React.HTMLAttributes<HTMLParagraphElement>)=><p className={cn("text-sm text-muted-foreground",className)} {...p}/>;
export function AlertDialogAction({onClick,children,...p}:React.ComponentProps<"button">){const c=React.useContext(Context);return <button type="button" {...p} onClick={e=>{onClick?.(e);c?.setOpen(false)}}>{children}</button>}
export function AlertDialogCancel({children,...p}:React.ComponentProps<"button">){const c=React.useContext(Context);return <button type="button" {...p} onClick={()=>c?.setOpen(false)}>{children}</button>}
