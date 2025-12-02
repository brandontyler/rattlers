import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  children: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, className = '', id, children, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-forest-700 mb-2"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`input-field ${error ? 'border-burgundy-500 focus:ring-burgundy-500' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-2 text-sm text-burgundy-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-sm text-forest-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
