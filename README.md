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
    npx prisma db push
    ```
    *O si prefieres ejecutarlo desde dentro del contenedor:*
    ```bash
    docker-compose exec app npx prisma db push
    ```
