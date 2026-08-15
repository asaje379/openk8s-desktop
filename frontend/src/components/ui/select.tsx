import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import {Check, ChevronDown, ChevronUp} from 'lucide-react'
import {cn} from '@/lib/utils'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

function SelectTrigger({
    className,
    children,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
    return (
        <SelectPrimitive.Trigger
            className={cn(
                'flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
                className
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50"/>
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    )
}

function SelectScrollUpButton({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>) {
    return (
        <SelectPrimitive.ScrollUpButton
            className={cn('flex cursor-default items-center justify-center py-1', className)}
            {...props}
        >
            <ChevronUp className="h-4 w-4"/>
        </SelectPrimitive.ScrollUpButton>
    )
}

function SelectScrollDownButton({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>) {
    return (
        <SelectPrimitive.ScrollDownButton
            className={cn('flex cursor-default items-center justify-center py-1', className)}
            {...props}
        >
            <ChevronDown className="h-4 w-4"/>
        </SelectPrimitive.ScrollDownButton>
    )
}

function SelectContent({
    className,
    children,
    position = 'popper',
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                className={cn(
                    'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
                    position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
                    className
                )}
                position={position}
                {...props}
            >
                <SelectScrollUpButton/>
                <SelectPrimitive.Viewport
                    className={cn(
                        'p-1',
                        position === 'popper' &&
                            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
                    )}
                >
                    {children}
                </SelectPrimitive.Viewport>
                <SelectScrollDownButton/>
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    )
}

function SelectLabel({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
    return (
        <SelectPrimitive.Label
            className={cn('px-2 py-1.5 text-sm font-semibold', className)}
            {...props}
        />
    )
}

function SelectItem({
    className,
    children,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            className={cn(
                'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                className
            )}
            {...props}
        >
            <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4"/>
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    )
}

function SelectSeparator({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
    return (
        <SelectPrimitive.Separator
            className={cn('-mx-1 my-1 h-px bg-muted', className)}
            {...props}
        />
    )
}

export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectLabel,
    SelectItem,
    SelectSeparator,
    SelectScrollUpButton,
    SelectScrollDownButton,
}
