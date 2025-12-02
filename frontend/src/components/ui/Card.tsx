import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  className = '',
  glow = false,
  padding = 'md',
}: CardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const cardClass = glow ? 'card-glow' : 'card';

  return (
    <div className={`${cardClass} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}
