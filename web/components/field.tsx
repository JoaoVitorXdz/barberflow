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
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        defaultValue={defaultValue}
        inputMode={inputMode}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-900"
      />
    </label>
  );
}