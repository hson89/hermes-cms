import React from 'react'
import { Label } from '../atoms/Label'
import { Input } from '../atoms/Input'
import { Text } from '../atoms/Text'

interface FormFieldProps {
  label: string
  id: string
  error?: string
  placeholder?: string
  type?: string
  required?: boolean
  name?: string
  className?: string
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

export const FormField: React.FC<FormFieldProps> = ({ 
  label, 
  id, 
  error, 
  placeholder, 
  type = 'text', 
  required, 
  name,
  className = '',
  inputProps
}) => {
  return (
    <div className={`space-y-2 w-full ${className}`}>
      <div className="flex justify-between items-center">
        <Label htmlFor={id}>{label}</Label>
      </div>
      <Input 
        id={id} 
        name={name || id}
        type={type} 
        placeholder={placeholder} 
        required={required} 
        error={!!error}
        {...inputProps}
      />
      {error && (
        <Text variant="small" className="text-error font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </Text>
      )}
    </div>
  )
}
