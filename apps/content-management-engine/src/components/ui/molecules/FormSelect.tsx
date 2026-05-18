import React from 'react'
import { Label } from '../atoms/Label'
import { Select } from '../atoms/Select'
import { Text } from '../atoms/Text'

interface FormSelectProps {
  label: string
  id: string
  error?: string
  required?: boolean
  name?: string
  className?: string
  selectProps?: React.SelectHTMLAttributes<HTMLSelectElement>
  children: React.ReactNode
}

export const FormSelect: React.FC<FormSelectProps> = ({ 
  label, 
  id, 
  error, 
  required, 
  name,
  className = '',
  selectProps,
  children
}) => {
  return (
    <div className={`space-y-2 w-full ${className}`}>
      <div className="flex justify-between items-center">
        <Label htmlFor={id}>{label}</Label>
      </div>
      <Select 
        id={id} 
        name={name || id}
        required={required} 
        error={!!error}
        {...selectProps}
      >
        {children}
      </Select>
      {error && (
        <Text variant="small" className="text-error font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </Text>
      )}
    </div>
  )
}
