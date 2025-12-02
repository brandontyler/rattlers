import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'forest' | 'gold' | 'burgundy';
  className?: string;
}

export default function Badge({
  children,
  variant = 'forest',
  className = '',
}: BadgeProps) {
  const variantClasses = {
    forest: 'badge-forest',
    gold: 'badge-gold',
    burgundy: 'badge-burgundy',
  };

  return (
    <span className={`badge ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
