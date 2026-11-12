import { buttonPrimary } from '@/components/ui';
import { goToShopAction } from './actions';

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Agende seu horário, sem ligar nem mandar mensagem
      </h1>
      <p className="text-zinc-600">
        Informe o código da sua barbearia para ver os horários livres.
      </p>
      <form action={goToShopAction} className="flex gap-2">
        <input
          name="slug"
          required
          placeholder="ex.: barbearia-do-ze"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-900"
        />
        <button type="submit" className={buttonPrimary}>
          Continuar
        </button>
      </form>
    </section>
  );
}