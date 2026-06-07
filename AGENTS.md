# AGENTS.md

## Fuente única de verdad
Este archivo es la referencia principal para agentes de IA que trabajen en este repositorio. Sirve como base compartida para Copilot, OpenCode y otras herramientas que lean contexto del proyecto.

## Stack principal
- Node.js 20
- TypeScript
- Express 5
- Prisma 7
- Jest
- Docker / Docker Compose

## Estructura esperada
- `core/application/`: casos de uso y lógica de aplicación
- `core/domain/`: entidades y reglas del dominio
- `core/services/`: servicios reutilizables
- `infrastructure/`: integraciones externas, DB, email, workers, rutas
- `interface-adapters/`: controladores y adaptadores HTTP
- `middleware/`: autenticación, autorización, validación, contexto
- `types/`: definiciones compartidas
- `test/`: pruebas de integración y API

## Reglas generales para cambios
1. Mantén la arquitectura en capas; no agregues lógica de negocio directamente a rutas o controladores.
2. Usa los aliases de TypeScript y evita rutas relativas largas.
3. Reutiliza utilidades y helpers existentes antes de crear nuevos.
4. Si modificas Prisma, actualiza migraciones y verifica el impacto del schema.
5. Si cambias permisos, roles o tenant scoping, revisa la lógica RBAC y el middleware relacionado.
6. Prioriza pruebas sobre cambios no verificados.

## Agentes definidos para este repositorio

Este archivo es el índice. La definición detallada de cada agente vive en su propio archivo dentro de `.agents/`.

- [Architect Guard](.agents/architect-guard.md)
- [RBAC & Tenant Auditor](.agents/rbac-tenant-auditor.md)
- [Prisma Migration Guard](.agents/prisma-migration-guard.md)
- [Test & Regression Agent](.agents/test-regression-agent.md)
- [Security & Secrets Agent](.agents/security-secrets-agent.md)
- [Docs & API Sync Agent](.agents/docs-api-sync-agent.md)

## Comandos de validación recomendados
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

## Estilo esperado
- Código claro, tipado y consistente.
- Evita cambios innecesarios.
- Documenta decisiones no obvias en comentarios o docs cuando sean importantes.
