import React from 'react';

export const Button: React.FC<any> = ({ children, ...props }) => {
  return <button {...props}>{children}</button>;
};