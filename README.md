# proyectoSubBase

## Frontend + backend en produccion

Este frontend usa `environment.apiUrl`:

- Desarrollo: `src/environments/environment.ts` -> `http://localhost:3000`
- Produccion: `src/environments/environment.prod.ts` -> URL publica del backend

### 1) Backend (Render)

Proyecto backend: `C:\Users\Equipo1\Desktop\backend`

Variables minimas en Render:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `PORT` (Render la suele inyectar automaticamente)
- `CORS_ORIGIN` con el dominio del frontend en Vercel, por ejemplo:
  `https://tu-frontend.vercel.app`

Si tienes varios dominios, separalos por coma:
`https://tu-frontend.vercel.app,https://www.tudominio.com`

### 2) Frontend (Vercel)

`src/environments/environment.prod.ts` ya apunta a:
`https://https-github-com-manuelarcos5885.onrender.com`

Luego despliega en Vercel normalmente.
