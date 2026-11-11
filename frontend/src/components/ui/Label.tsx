import React from 'react';

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  requiredIndicator?: boolean;
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  children,
  requiredIndicator = false,
  required = false,
  className = '',
  ...props
}) => {
  const showRequired = requiredIndicator || required;

  return (
    <label
      className={`block text-sm font-medium text-slate-700 mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {showRequired && (
        <span className="text-red-600 ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
};
