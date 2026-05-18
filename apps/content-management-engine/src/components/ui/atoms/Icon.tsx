import React from 'react'

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string
  filled?: boolean
  size?: number
  weight?: number
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  filled = false, 
  size = 24, 
  weight = 400, 
  className = '', 
  ...props 
}) => {
  return (
    <span 
      className={`material-symbols-outlined notranslate ${className}`} 
      style={{ 
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        fontSize: `${size}px`,
        fontFamily: "'Material Symbols Outlined'",
        lineHeight: 1
      }} 
      {...props}
    >
      {name}
    </span>
  )
}
