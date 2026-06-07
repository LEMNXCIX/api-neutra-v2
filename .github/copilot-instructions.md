# Instrucciones para agentes de IA en este repositorio

## Fuente única de verdad
- La referencia principal para comportamiento de agentes está en [AGENTS.md](../AGENTS.md).
- Esta guía sirve como resumen operativo para Copilot; si necesitas ajustar reglas de agentes, edita primero [AGENTS.md](../AGENTS.md).

## Stack y arquitectura
- Proyecto Node.js + TypeScript + Express 5 + Prisma 7 + Jest.
- La base de arquitectura está orientada a capas: `core/`, `infrastructure/`, `interface-adapters/`, `middleware/`, `types/`.
- Mantén la separación entre dominio, aplicación, infraestructura y adaptadores. No mezcles responsabilidades en una sola capa.

## Convenciones del repositorio
- Usa los alias de TypeScript definidos en `tsconfig.json` (`@/`, `@/core/*`, `@/infrastructure/*`, etc.).
- Prefiere reutilizar servicios, repositorios y helpers existentes antes de crear nuevas utilidades.
- Si agregas una funcionalidad nueva, busca primero el módulo equivalente en `core/application/` o `core/services/`.
- Mantén nombres y patrones consistentes con el resto del proyecto.

## Cambios de código
- Al tocar lógica de negocio, prioriza `core/application/` y `core/domain/`.
- Al tocar HTTP, rutas o controladores, trabaja en `interface-adapters/` y `infrastructure/routes/`.
- Si cambias el esquema de Prisma, crea o actualiza una migración (`prisma/migrations/`) en lugar de editar solo el schema sin seguimiento.
- Si el cambio afecta permisos o acceso, respeta la lógica RBAC/tenant ya existente.

## Calidad y validación
- Ejecuta pruebas relevantes (`npm test`) y verificación de tipos (`npx tsc --noEmit`) cuando ajustes comportamiento o refactorices.
- Si agregas o cambias endpoints, actualiza la documentación correspondiente cuando aplique.
- Evita cambios excesivos de estilo; prioriza claridad y consistencia con el código ya existente.

## Reglas de seguridad y negocio
- No expongas secretos ni credenciales en el código ni en ejemplos.
- Mantén la validación de entrada, permisos y scope de tenant en los puntos correctos.
- No cambies el comportamiento de autenticación, autorización o pagos sin revisar el impacto en los flujos actuales.
