#!/bin/sh
# -----------------------------------------------------------------------------
# Entrypoint de produccion: aplica migraciones y arranca la app.
# -----------------------------------------------------------------------------
set -e

echo "→ Aplicando migraciones de base de datos..."
npx prisma migrate deploy

echo "→ Arrancando Vigia Web Audit..."
exec node dist/index.js
