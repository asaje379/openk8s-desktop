import {useTheme} from '@/components/providers/theme-provider'
import {cn} from '@/lib/utils'
import iconOnlyDark from '@/assets/logos/icon_only_dark.png'
import iconOnlyLight from '@/assets/logos/icon_only_light.png'
import iconWithTextDark from '@/assets/logos/icon_with_text_dark.png'
import iconWithTextLight from '@/assets/logos/icon_with_text_light.png'

const iconSrc = {light: iconOnlyLight, dark: iconOnlyDark}
const wordmarkSrc = {light: iconWithTextLight, dark: iconWithTextDark}

const sizeClasses = {
    icon: {
        sm: 'size-8',
        md: 'size-10',
        lg: 'size-16',
    },
    wordmark: {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-16',
    },
}

export interface BrandLogoProps {
    variant?: 'icon' | 'wordmark'
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function BrandLogo({variant = 'icon', size = 'md', className}: BrandLogoProps) {
    const {resolvedTheme} = useTheme()
    const src = variant === 'icon' ? iconSrc[resolvedTheme] : wordmarkSrc[resolvedTheme]
    const alt = variant === 'icon' ? 'OpenK8s' : 'OpenK8s Desktop'
    return (
        <img
            src={src}
            alt={alt}
            className={cn('shrink-0 select-none object-contain', sizeClasses[variant][size], className)}
        />
    )
}