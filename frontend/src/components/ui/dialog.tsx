import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {X} from 'lucide-react'
import {cn} from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

function DialogOverlay({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            className={cn('fixed inset-0 z-50 bg-black/80', className)}
            {...props}
        />
    )
}

function DialogContent({
    className,
    children,
    ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
    return (
        <DialogPortal>
            <DialogOverlay/>
            <DialogPrimitive.Content
                className={cn(
                    'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg sm:rounded-lg',
                    className
                )}
                {...props}
            >
                {children}
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring">
                    <X className="h-4 w-4"/>
                    <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPortal>
    )
}

function DialogHeader({className, ...props}: React.ComponentPropsWithoutRef<'div'>) {
    return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
}

function DialogTitle({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            className={cn('text-lg font-semibold leading-none tracking-tight', className)}
            {...props}
        />
    )
}

function DialogDescription({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    )
}

export {
    Dialog,
    DialogTrigger,
    DialogPortal,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
}
