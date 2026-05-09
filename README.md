# TFG - Gestión de trabajos de pintura

Aplicación web responsive para la gestión de clientes, presupuestos, trabajos, materiales, planificación y alertas para profesionales del sector de la pintura.

## Estructura del proyecto

- `backend/`: API desarrollada con Django y Django REST Framework.
- `frontend/`: aplicación web desarrollada con React, TypeScript y Vite.
- `docs/`: documentación técnica, diagramas y apoyo al desarrollo.
- `.github/workflows/`: configuración de CI/CD.

# Guía para arrancar el proyecto en local

Esta guía explica cómo arrancar en local el proyecto **TFG Pintura**, compuesto por un backend desarrollado con **Django + Django REST Framework** y un frontend desarrollado con **React + TypeScript + Vite**.

---

## 1. Requisitos previos

Antes de arrancar el proyecto, asegúrate de tener instalado:

- Python 3
- Node.js y npm
- Git
- Visual Studio Code
- Git Bash recomendado en Windows

---

## 2. Clonar el repositorio

```bash
git clone https://github.com/Josemita23/tfg-pintura.git
cd tfg-pintura
```

---

# Backend

El backend está desarrollado con **Python, Django y Django REST Framework**.

---

## 3. Entrar en la carpeta del backend

```bash
cd backend
```

---

## 4. Crear el entorno virtual

```bash
python -m venv .venv
```

Si en Windows no funciona el comando anterior, probar con:

```bash
py -m venv .venv
```

---

## 5. Activar el entorno virtual

En Git Bash:

```bash
source .venv/Scripts/activate
```

Si se ha activado correctamente, debe aparecer algo parecido a esto al inicio de la terminal:

```bash
(.venv)
```

---

## 6. Instalar dependencias del backend

```bash
pip install -r requirements.txt
```

---

## 7. Crear el archivo `.env`

Dentro de la carpeta `backend`, crear un archivo llamado `.env`.

El contenido recomendado para desarrollo local es:

```env
SECRET_KEY=django-insecure-tfg-pintura-local-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=sqlite:///db.sqlite3
```

---

## 8. Aplicar migraciones

```bash
python manage.py migrate
```

---

## 9. Comprobar que Django está correctamente configurado

```bash
python manage.py check
```

Si todo está correcto, debería aparecer un mensaje similar a:

```bash
System check identified no issues
```

---

## 10. Arrancar el backend

```bash
python manage.py runserver
```

El backend quedará disponible en:

```txt
http://127.0.0.1:8000/
```

Para comprobar que funciona correctamente, abrir en el navegador:

```txt
http://127.0.0.1:8000/api/health/
```

Debe devolver:

```json
{
  "status": "ok"
}
```

---

# Frontend

El frontend está desarrollado con **React, TypeScript y Vite**.

Para arrancar el frontend, se recomienda abrir una segunda terminal y dejar el backend ejecutándose en la primera.

---

## 11. Entrar en la carpeta del frontend

Desde la raíz del proyecto:

```bash
cd frontend
```

---

## 12. Instalar dependencias del frontend

```bash
npm install
```

---

## 13. Arrancar el frontend

```bash
npm run dev
```

El frontend quedará disponible en:

```txt
http://localhost:5173/
```

---

# Arranque rápido del proyecto

Para trabajar normalmente con el proyecto, se necesitan **dos terminales**.

---

## Terminal 1: backend

```bash
cd backend
source .venv/Scripts/activate
python manage.py runserver
```

---

## Terminal 2: frontend

```bash
cd frontend
npm run dev
```

---

# URLs principales

## Backend

```txt
http://127.0.0.1:8000/
```

## API de prueba

```txt
http://127.0.0.1:8000/api/health/
```

## API de clientes

```txt
http://127.0.0.1:8000/api/clients/
```

## API de presupuestos

```txt
http://127.0.0.1:8000/api/budgets/
```

## API de trabajos

```txt
http://127.0.0.1:8000/api/jobs/
```

## API de materiales

```txt
http://127.0.0.1:8000/api/materials/
```

## API de planificación

```txt
http://127.0.0.1:8000/api/planning/
```

## API de alertas

```txt
http://127.0.0.1:8000/api/alerts/
```

## Frontend

```txt
http://localhost:5173/
```

## Pantalla de clientes

```txt
http://localhost:5173/clientes
```

---

# Comandos útiles del backend

## Activar entorno virtual

```bash
cd backend
source .venv/Scripts/activate
```

## Crear migraciones

```bash
python manage.py makemigrations
```

## Aplicar migraciones

```bash
python manage.py migrate
```

## Comprobar errores de Django

```bash
python manage.py check
```

## Arrancar servidor Django

```bash
python manage.py runserver
```

## Parar servidor Django

```bash
CTRL + C
```

## Desactivar entorno virtual

```bash
deactivate
```

Si `deactivate` no funciona, se puede cerrar la terminal y abrir una nueva.

---

# Comandos útiles del frontend

## Instalar dependencias

```bash
cd frontend
npm install
```

## Arrancar servidor de desarrollo

```bash
npm run dev
```

## Parar servidor de desarrollo

```bash
CTRL + C
```

Si pregunta:

```txt
Terminate batch job (Y/N)?
```

Responder:

```txt
Y
```

---

# Notas importantes

- No subir el archivo `.env` a GitHub.
- No subir la carpeta `.venv`.
- No subir la base de datos local `db.sqlite3`.
- Para trabajar con el backend hay que activar el entorno virtual.
- Para trabajar con el frontend no hace falta entorno virtual.
- El backend debe estar arrancado para que el frontend pueda cargar datos reales desde la API.
- El frontend se comunica con el backend mediante la URL configurada en `src/services/api.ts`.
- En local, la API se usa desde `http://127.0.0.1:8000/api`.

---

# Estructura general del proyecto

```txt
tfg-pintura/
  backend/
    config/
    clients/
    budgets/
    jobs/
    materials/
    planning/
    alerts/
    manage.py
    requirements.txt
    .env.example

  frontend/
    src/
      app/
      components/
      features/
      services/
      styles/
      types/
    package.json
    vite.config.ts

  docs/
  .github/
  README.md
```

---

## 2. Clonar el repositorio

```bash
git clone https://github.com/Josemita23/tfg-pintura.git
cd tfg-pintura
