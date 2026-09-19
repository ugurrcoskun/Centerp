import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';
const buttonVariants = cva('button', {variants: {variant: {default: 'button-primary', secondary: 'button-secondary', ghost: 'button-ghost', destructive: 'button-danger'}, size: {default: '', sm: 'button-small', icon: 'button-icon'}}, defaultVariants: {variant: 'default', size: 'default'}});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {asChild?: boolean}
export function Button({className, variant, size, asChild = false, ...props}: ButtonProps) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({variant, size, className}))} {...props}/>;
}
