import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
};

export function Button({ variant = 'primary', icon, children, className = '', ...rest }: ButtonProps) {
  const variantClass = variant === 'primary' ? 'button-primary' : 'button-secondary';

  return (
    <button className={`${variantClass} ${className}`.trim()} {...rest}>
      {icon ? <span className="button-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
