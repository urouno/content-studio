# Subir a GitHub y publicar en GitHub Pages

## 1. Crear el repositorio

Desde la terminal, en la carpeta del proyecto:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Content Studio: versión inicial"
```

Crea un repositorio vacío en <https://github.com/new> (puede ser privado) y conéctalo, cambiando `TU-USUARIO`:

```bash
git remote add origin https://github.com/TU-USUARIO/content-studio.git
```

```bash
git branch -M main
```

```bash
git push -u origin main
```

Si usas la CLI de GitHub (`gh`), puedes hacerlo en un solo paso:

```bash
gh repo create content-studio --private --source=. --push
```

> El `.gitignore` excluye copias de seguridad (`*-backup-*.json`), archivos `.env` y la carpeta `.clasp`. **Revisa antes de cada commit** que no subes tokens ni claves.

## 2. Publicar en GitHub Pages

Es compatible porque la app es estática (HTML, CSS y JS), y Pages sirve con HTTPS, que es lo que necesita el Service Worker.

1. En GitHub abre **Settings → Pages**.
2. En **Source** elige *Deploy from a branch*, rama `main`, carpeta `/ (root)`, y guarda.
3. En 1–2 minutos estará disponible en `https://TU-USUARIO.github.io/content-studio/`.
4. Abre la app, configura **Ajustes → Conexión** con la URL de Apps Script y tu token, y usa la IA en **modo seguro**.

Notas:
- Todas las rutas son relativas (`./`), así que funciona dentro de la subcarpeta `/content-studio/`.
- Un repositorio **privado** con Pages requiere un plan de GitHub que lo permita; si no, el sitio será público. El sitio solo contiene código: los datos viven en tu navegador y en tu hoja, protegidos por token.
- **Nunca uses el modo IA "directo" en Pages.**

## 3. Publicar versiones nuevas

```bash
npm run sw
```

Este comando actualiza la versión de la caché offline. Después:

```bash
npm test
```

```bash
git add -A
```

```bash
git commit -m "Describe el cambio"
```

```bash
git push
```

Los usuarios verán "Hay una nueva versión de la app → Actualizar".

## 4. (Opcional) Subir Apps Script desde la terminal con clasp

```bash
npm install -g @google/clasp
```

```bash
clasp login
```

```bash
cd apps-script && clasp clone <ID_DEL_SCRIPT>
```

Edita `Code.gs` en local y súbelo:

```bash
clasp push
```

Después crea una versión nueva de la implementación (ver CONFIGURACION_API.md §1.3).
