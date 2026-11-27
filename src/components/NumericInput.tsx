import React, { useRef } from 'react';

export function parseLocaleNumber(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized || normalized === '.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeNumericInput(raw: string, allowDecimal: boolean): string {
  if (!allowDecimal) {
    return raw.replace(/[^0-9]/g, '');
  }
  const stripped = raw.replace(/[^0-9.,]/g, '');
  let hasSeparator = false;
  let result = '';
  for (const ch of stripped) {
    if (ch === '.' || ch === ',') {
      if (!hasSeparator) {
        hasSeparator = true;
        result += ch;
      }
    } else {
      result += ch;
    }
  }
  return result;
}

interface NumericInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'inputMode'
  > {
  value: string;
  onChange: (value: string) => void;
  allowDecimal?: boolean;
  selectOnFocus?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  allowDecimal = false,
  selectOnFocus = true,
  onFocus,
  onMouseUp,
  onBlur,
  ...rest
}) => {
  const suppressNextMouseUpRef = useRef(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (selectOnFocus && e.currentTarget.value.length > 0) {
      const target = e.currentTarget;
      suppressNextMouseUpRef.current = true;
      try {
        target.select();
      } catch {
        // Ignore on unsupported input states
      }
      requestAnimationFrame(() => {
        if (document.activeElement === target) {
          try {
            target.select();
          } catch {
            // Ignore
          }
        }
      });
    }
    onFocus?.(e);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (suppressNextMouseUpRef.current) {
      e.preventDefault();
      suppressNextMouseUpRef.current = false;
    }
    onMouseUp?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    suppressNextMouseUpRef.current = false;
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeNumericInput(e.target.value, allowDecimal);
    onChange(cleaned);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onBlur={handleBlur}
    />
  );
};
