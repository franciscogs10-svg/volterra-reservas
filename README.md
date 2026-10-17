# volterra-reservas

Reservas de mesas y control de acceso para VOLTERRA. Un solo usuario, desde el celular o el computador.

- Mapa con los croquis reales de planta baja (15 mesas) y planta alta VIP (7 mesas).
- Cada mesa se vende entera o por puestos. Una mesa puede tener varias reservas hasta llenar su capacidad.
- Precio por mesa, y precio por puesto opcional (si no se fija, es el de la mesa dividido entre sus puestos). Los precios y la fecha del evento se cargan desde la app.
- Abonos como movimientos que no se editan. Una corrección es un reverso.
- Llegada confirmada por reserva. La mesa pasa a Ocupada cuando todas sus reservas entraron.
- Resumen de ventas, cobros y saldos, buscador y descarga en CSV.
- Estado en vivo: lo que cambia en un celular aparece en los demás.

Next.js + Supabase (Postgres, Auth, Realtime) + Vercel.

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com).
2. En **SQL Editor** ejecuta, en orden, `supabase/migrations/0001_init.sql` y `supabase/migrations/0002_seed.sql`.
3. En **Authentication > Providers > Email** desactiva el registro público (*Allow new users to sign up*).
4. En **Authentication > Users** crea el usuario con correo y contraseña (*Add user*, con *Auto Confirm*). El primer usuario queda como `admin`.
5. Copia `.env.example` a `.env.local` y pega la URL del proyecto y la clave `anon` (**Project Settings > API**). Nunca uses la `service_role` en la app.
6. `npm install` y `npm run dev`.

## Despliegue en Vercel

Importa el repo en Vercel, agrega las dos variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, y despliega. En Supabase, en **Authentication > URL Configuration**, agrega la URL de Vercel como *Site URL*.

## Reglas que garantiza la base de datos

- La suma de puestos de las reservas activas de una mesa no puede superar su capacidad (trigger con bloqueo de la fila de la mesa, para que dos reservas a la vez no se pasen).
- Los pagos no se editan ni se borran. `reverse_payment` agrega un movimiento negativo con motivo.
- Todas las acciones pasan por funciones que exigen sesión y rol (`require_role`). Sin sesión, `forbidden`.
- Cada cambio en reservas, pagos, mesas e ingresos queda en `audit_logs`.

## Pruebas

```
npm test          # reglas de la base (Postgres en memoria) y lógica de la interfaz
npm run typecheck
```

Las pruebas de la base ejecutan las migraciones reales en PGlite. No cubren el bloqueo con dos conexiones simultáneas ni los permisos de los roles `anon` y `authenticated` de Supabase: se verifican en el proyecto real.

## Coordenadas del mapa

Las mesas se dibujan sobre `public/plano-pb.jpg` y `public/plano-vip.jpg` (lienzo de 792x966). Sus posiciones están en `scripts/gen-seed.mjs`; para moverlas, edita el script, corre `npm run seed:gen` y actualiza `tables` con las nuevas coordenadas.
