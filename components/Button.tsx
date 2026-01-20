import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isEmergency?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  isEmergency = false,
  ...props 
}) => {
  
  const baseStyle = "rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2";
  
  const variants = {
    primary: isEmergency 
      ? "bg-emergency-600 text-white hover:bg-emergency-500 focus:ring-emergency-500" 
      : "bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500",
    secondary: isEmergency
      ? "bg-emergency-100 text-emergency-900 hover:bg-emergency-200"
      : "bg-brand-100 text-brand-900 hover:bg-brand-200",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "bg-transparent hover:bg-black/5 text-current",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};