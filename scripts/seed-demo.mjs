// Popula a API com uma barbearia de demonstração.
// Uso (com a API rodando em localhost): node scripts/seed-demo.mjs

const API = process.env.API_URL ?? 'http://localhost:3000';
const SLUG = 'barbearia-demo';
const PASSWORD = 'demo12345';

const host = new URL(API).hostname;
if (!['localhost', '127.0.0.1'].includes(host)) {
  console.error(`Recusado: este script só roda contra uma API local (API_URL=${API}).`);
  process.exit(1);
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function call(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? response.statusText);
    throw new ApiError(response.status, `${method} ${path}: ${detail}`);
  }
  return data;
}

const SERVICES = [
  { key: 'corte', name: 'Corte masculino', durationMinutes: 30, priceCents: 4500 },
  { key: 'barba', name: 'Barba', durationMinutes: 20, priceCents: 3000 },
  { key: 'combo', name: 'Corte e barba', durationMinutes: 50, priceCents: 6500 },
];

// weekday: 0 = domingo ... 6 = sábado
const BARBERS = [
  {
    name: 'Carlos Lima',
    email: 'carlos@demo.com',
    services: ['corte', 'barba', 'combo'],
    days: [1, 2, 3, 4, 5, 6],
  },
  {
    name: 'Diego Souza',
    email: 'diego@demo.com',
    services: ['corte', 'combo'],
    days: [2, 3, 4, 5, 6],
  },
];

async function ownerToken() {
  try {
    const registered = await call('/auth/register-tenant', {
      method: 'POST',
      body: {
        barbershopName: 'Barbearia Demo',
        slug: SLUG,
        ownerName: 'Dono da Barbearia Demo',
        email: 'dono@demo.com',
        password: PASSWORD,
      },
    });
    console.log('Barbearia criada.');
    return registered.accessToken;
  } catch (error) {
    if (error.status !== 409) throw error;
    console.log('A barbearia já existe; entrando como dono.');
    const login = await call('/auth/login', {
      method: 'POST',
      body: { tenantSlug: SLUG, email: 'dono@demo.com', password: PASSWORD },
    });
    return login.accessToken;
  }
}

function printSummary() {
  console.log('\nPronto. Para experimentar:');
  console.log('  Front-end: http://localhost:3001  (código da barbearia: barbearia-demo)');
  console.log(`  Cliente:   cliente@demo.com / ${PASSWORD}`);
  console.log(`  Dono:      dono@demo.com / ${PASSWORD}`);
  console.log(`  Barbeiro:  carlos@demo.com / ${PASSWORD}`);
}

async function main() {
  const token = await ownerToken();

  const existing = await call('/services', { token });
  if (existing.length > 0) {
    console.log('A barbearia de demonstração já tem dados; nada a fazer.');
    printSummary();
    return;
  }

  const serviceIds = {};
  for (const { key, name, durationMinutes, priceCents } of SERVICES) {
    const created = await call('/services', {
      method: 'POST',
      token,
      body: { name, durationMinutes, priceCents },
    });
    serviceIds[key] = created.id;
    console.log(`Serviço criado: ${name}`);
  }

  for (const barber of BARBERS) {
    const created = await call('/barbers', {
      method: 'POST',
      token,
      body: {
        name: barber.name,
        email: barber.email,
        password: PASSWORD,
        serviceIds: barber.services.map((key) => serviceIds[key]),
      },
    });

    const entries = barber.days.flatMap((weekday) => [
      { weekday, startTime: '09:00', endTime: '12:00' },
      { weekday, startTime: '14:00', endTime: '19:00' },
    ]);
    await call(`/barbers/${created.id}/working-hours`, {
      method: 'PUT',
      token,
      body: { entries },
    });
    console.log(`Barbeiro criado: ${barber.name}`);
  }

  try {
    await call('/auth/register-customer', {
      method: 'POST',
      body: {
        tenantSlug: SLUG,
        name: 'Cliente Demo',
        email: 'cliente@demo.com',
        password: PASSWORD,
      },
    });
    console.log('Cliente criado: Cliente Demo');
  } catch (error) {
    if (error.status !== 409) throw error;
  }

  printSummary();
}

main().catch((error) => {
  const refused = error?.cause?.code === 'ECONNREFUSED';
  console.error(
    refused
      ? `Não consegui falar com a API em ${API}. Ela está rodando?`
      : `Falhou: ${error.message}`,
  );
  process.exit(1);
});