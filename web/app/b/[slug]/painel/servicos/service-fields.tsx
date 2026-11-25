import { Field } from '@/components/field';

interface ServiceFieldsProps {
  defaults?: { name: string; duration: string; price: string };
}

export function ServiceFields({ defaults }: ServiceFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field
        label="Nome do serviço"
        name="name"
        defaultValue={defaults?.name}
        minLength={2}
        placeholder="ex.: Corte masculino"
      />
      <Field
        label="Duração (minutos)"
        name="durationMinutes"
        inputMode="numeric"
        defaultValue={defaults?.duration}
        placeholder="30"
      />
      <Field
        label="Preço (R$)"
        name="price"
        inputMode="decimal"
        defaultValue={defaults?.price}
        placeholder="45,00"
      />
    </div>
  );
}