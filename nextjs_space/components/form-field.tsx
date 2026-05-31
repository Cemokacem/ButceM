'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  children?: ReactNode;
  // input shorthand
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export function FormField({ label, required, children, type, value, onChange, placeholder }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children ?? (
        <Input
          type={type ?? 'text'}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
