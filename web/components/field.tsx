import { inputClass } from './ui';

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
  defaultValue?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
}

export function Field({
  label,
  name,
  type = 'text',
  required = true,
  autoComplete,
  minLength,
  placeholder,
  defaultValue,
  inputMode,
}: FieldProps) {
  return (
    <label className="group block space-y-1.5">
      <span className="flex items-center justify-between text-sm font-bold tracking-wide text-zinc-900 transition-colors group-focus-within:text-pole-blue">
        <span>{label}</span>
        {!required && (
          <span className="text-[11px] font-medium tracking-normal text-zinc-400">
            opcional
          </span>
        )}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        defaultValue={defaultValue}
        inputMode={inputMode}
        className={`${inputClass} transition-colors duration-150 hover:border-zinc-600`}
      />
    </label>
  );
}