# api-neutra-v2
API V2 para una página web basada en e commerce

## 🚀 Getting Started con Docker

Este proyecto está configurado para ejecutarse fácilmente utilizando Docker y Docker Compose.

### Prerrequisitos

- [Docker](https://www.docker.com/get-started) instalado y corriendo.
- [Git](https://git-scm.com/) para clonar el repositorio.

### Configuración de Entorno

1.  Crea un archivo `.env` en la raíz del proyecto (puedes basarte en un ejemplo si existe, o usar las siguientes variables requeridas):

    ```env
    NODE_ENV=development
    PORT=3000
    
    # Configuración de Base de Datos (PostgreSQL)
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=postgres
    POSTGRES_DB=ecommerce
    # Nota: 'db' es el nombre del servicio en docker-compose
    DATABASE_URL="postgresql://postgres:postgres@db:5432/ecommerce?schema=public"

    # Secretos de la App
    JWT_SECRET=tu_secreto_jwt
    SESSION_SECRET=tu_secreto_session

    # Logging Configuration
    LOG_LEVEL=info
    LOG_PAYLOADS=false
    LOG_RESPONSES=false
    LOG_HEADERS=false
    ```

### 🛠️ Entorno de Desarrollo

El entorno de desarrollo habilita el "hot-reloading", por lo que cualquier cambio en el código se reflejará inmediatamente.

1.  **Iniciar servicios**:
    ```bash
    docker-compose up -d --build
    ```
    Esto levantará la API en `http://localhost:3000` y la base de datos PostgreSQL.

2.  **Ver logs**:
    ```bash
    docker-compose logs -f app
    ```

3.  **Detener servicios**:
    ```bash
    docker-compose down
    ```

### 📦 Entorno de Producción

El entorno de producción utiliza una imagen optimizada (multi-stage build) y solo instala dependencias necesarias.

1.  **Iniciar servicios (Producción)**:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d --build
    ```

2.  **Ver logs**:
    ```bash
    docker-compose -f docker-compose.prod.yml logs -f app
    ```

3.  **Detener servicios**:
    ```bash
    docker-compose -f docker-compose.prod.yml down
    ```

### 🗄️ Migraciones de Base de Datos (Prisma)

Una vez que el contenedor de la base de datos esté corriendo, necesitas sincronizar el esquema:

1.  **Ejecutar migración (desde tu máquina host si tienes Node/Prisma instalado)**:
    ```bash
    npx prisma migrate dev
    ```
    *O si prefieres ejecutarlo desde dentro del contenedor:*
    ```bash
    docker-compose exec app npx prisma migrate dev
    ```

2.  **Ver el esquema de la base de datos**:
    ```bash
    npx prisma studio
    ```

---

## 🔐 Sistema RBAC (Role-Based Access Control)

Este proyecto implementa un sistema de control de acceso granular basado en roles y permisos.

### Migración RBAC (20251122150656_add_rbac_system)

**Fecha**: 22 de noviembre de 2024

#### ¿Qué cambió?

El sistema de roles se migró de un simple `enum` a un sistema completo de roles y permisos:

**Antes:**
- Tabla `users` con columna `role` (enum: USER, ADMIN)
- Sistema jerárquico simple basado en números

**Después:**
- Tabla `roles`: Define roles del sistema (USER, MANAGER, ADMIN)
- Tabla `permissions`: Define permisos granulares (`users:read`, `products:write`, etc.)
- Tabla `role_permissions`: Relación muchos-a-muchos entre roles y permisos
- Tabla `users` ahora tiene `roleId` (foreign key a `roles`)

#### Comandos ejecutados

```bash
# 1. Remover archivo de configuración conflictivo
Remove-Item -Path "prisma.config.ts" -Force

# 2. Reset de la base de datos (elimina datos existentes)
npx prisma migrate reset --skip-seed

# 3. Crear y aplicar la migración RBAC
npx prisma migrate dev --name add-rbac-system --skip-seed
```

#### Estructura de Permisos

Los permisos siguen el formato `resource:action`:

- **Resources**: `users`, `products`, `orders`, `cart`, `slides`, `stats`
- **Actions**: `read`, `write`, `delete`, `manage`

**Ejemplos**:
- `users:read` - Ver lista de usuarios
- `products:write` - Crear/editar productos
- `orders:manage` - Gestión completa de órdenes

#### Próximos Pasos

1. **Fase 2**: Crear seed data con roles y permisos predefinidos
2. **Fase 3**: Actualizar middleware de autenticación para usar permisos
3. **Fase 4**: Migrar rutas para usar el nuevo sistema
4. **Fase 5**: Actualizar frontend para soporte RBAC

Para más detalles, consulta la documentación en `types/rbac.ts`.
