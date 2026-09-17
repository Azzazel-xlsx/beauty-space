# Plan de Migración de Autenticación — Beauty Space (Fase 4)

Este documento detalla la estrategia para migrar el sistema de autenticación de la aplicación desde el esquema actual de almacenamiento local hacia **Supabase Auth**, sin alterar el código de login de manera prematura.

---

## 1. Contexto Actual

Actualmente, la aplicación utiliza un esquema local en el navegador:
- Validación mediante PIN de 4 dígitos.
- Encriptación/hashing mediante Web Crypto API (`SHA-256` con `salt` aleatorio) almacenado en `localStorage` (`bs_auth_salt`, `bs_auth_hash`).
- Manejo de sesión manual en memoria/localStorage vía la interfaz `AuthSession`:
  - `isAuthenticated: boolean`
  - `authenticatedAt: number`
  - `lastActiveAt: number`
  - Timeout por inactividad de 30 minutos (`INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000`).

---

## 2. Reemplazo por Supabase Auth

### 2.1 Credenciales y `signInWithPassword()`
- Se reemplazará la validación local de `hashPin` por autenticación de primer nivel:
  ```ts
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  ```
- Al autenticarse, Supabase gestiona automáticamente los tokens JWT (`access_token`, `refresh_token`), los cuales viajan en los headers de cada petición hacia PostgreSQL y habilitan las políticas de Row Level Security (`auth.role() = 'authenticated'`).

### 2.2 Reemplazo de `AuthSession`
- El estado manual `AuthSession` en `src/types.ts` y en el hook/estado de `App.tsx` será reemplazado por la sesión administrada de Supabase:
  - `supabase.auth.getSession()` para verificar sesión persistida al arrancar.
  - `supabase.auth.onAuthStateChange((event, session) => ...)` para escuchar inicios de sesión, cierres de sesión (`SIGNED_OUT`) o expiración de tokens (`TOKEN_REFRESHED`).
- La persistencia de tokens, renovación silenciosa y expiración pasan a ser responsabilidad de Supabase client, eliminando flags ad-hoc en `localStorage`.

---

## 3. Opción a Evaluar: PIN como "Bloqueo de Pantalla" (Screen Lock)

En salones de belleza y spas de alta rotación, es muy frecuente que la estilista/administradora deje la tablet o computadora en el mostrador mientras atiende en cabina. 

Para conservar la rapidez operativa del PIN sin degradar la seguridad:
- **Autenticación Real (Infraestructura):** Se realiza con Supabase Auth (email/contraseña). Una vez iniciada la sesión, las llamadas a la base de datos están autorizadas.
- **Bloqueo Rápido Local (PIN):** La pantalla de PIN se puede conservar **exclusivamente como un protector de pantalla / bloqueo de sesión local**, respaldado por una sesión de Supabase ya iniciada.
  - Tras `N` minutos de inactividad, se oculta la UI y se pide el PIN para desbloquear la vista.
  - El PIN no reemplaza el token de autenticación ni es responsable de autorizar llamadas a PostgreSQL.
  - Si se cierra la sesión en Supabase (`signOut()`), se solicita nuevamente email y contraseña maestro.

---

## 4. Checklist para la Implementación en Fase 4

1. [ ] Crear formulario de login maestro (email/contraseña) conectado a `supabase.auth.signInWithPassword()`.
2. [ ] Suscribir `App.tsx` a `supabase.auth.onAuthStateChange`.
3. [ ] Deprecar `AuthSession` en `src/types.ts` o adaptarlo a `Session | null`.
4. [ ] Si se aprueba el PIN como screen lock:
   - Configurar PIN maestro asociado a la cuenta.
   - Guardar el estado de bloqueo (`isScreenLocked: boolean`) en memoria.
5. [ ] Configurar botón de "Cerrar sesión" en la interfaz (`supabase.auth.signOut()`).
