import {cn} from '@/lib/utils'

function Label({className, ...props}: React.ComponentPropsWithoutRef<'label'>) {
    return (
        <label
            className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                className
            )}
            {...props}
        />
    )
}

export {Label}
