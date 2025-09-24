import type { HTMLAttributes, ReactNode } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  actions?: ReactNode;
};

export function Card({ title, description, actions, className = '', children, ...rest }: CardProps) {
  return (
    <section className={`card ${className}`.trim()} {...rest}>
      {(title || description || actions) && (
        <header className="card-header">
          <div>
            {title ? <h3 className="heading">{title}</h3> : null}
            {description ? <p className="subheading">{description}</p> : null}
          </div>
          {actions ? <div className="card-actions">{actions}</div> : null}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}
