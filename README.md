# MAMBAQ — Museo de Arte Moderno de Barranquilla

App web para niños de 3 a 12 años. Toman una foto de su dibujo, eligen el estilo de un maestro del arte, y la IA transforma su obra al estilo elegido. Las obras quedan guardadas en una galería pública compartida.

Proyecto académico — Universidad Simón Bolívar, Barranquilla (Ingeniería de Sistemas).

---

## Qué hace

1. El niño entra con su nombre y un avatar.
2. Toma una foto de su dibujo (cámara en vivo) o la sube desde la galería.
3. Un clasificador IA (Teachable Machine) valida que sea un dibujo, no una foto.
4. Elige el estilo de un maestro: Van Gogh, Picasso, Monet, Frida Kahlo o Da Vinci.
5. Un filtro artístico real (manipulación de píxeles con canvas) transforma la imagen.
6. La obra queda registrada en Supabase y visible en el Museo Interactivo.
7. El artista puede ver sus obras desde el Home y eliminar las propias cuando quiera.

---

## Funcionalidades destacadas

### Mis obras
Cada niño ve un carrusel con sus obras registradas directamente en el Home, con acceso rápido al detalle completo de cada una (imagen, estilo, autor, likes).

### Museo Interactivo
Galería pública con todas las obras. Filtros por **Todas**, **Recientes** y **Populares**. Cualquier visitante puede dar o quitar like a las obras.

### Borrar obra propia
El autor de una obra ve un botón 🗑️ en el detalle. Al borrar, se elimina tanto el registro en la base de datos como el archivo de imagen en Supabase Storage.

### Clasificador IA
Modelo Teachable Machine entrenado para distinguir dibujos de fotografías. Solo los dibujos verificados pueden registrarse en el museo.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript vanilla (sin build step) |
| IA clasificación | TensorFlow.js + Teachable Machine (modelo local) |
| Filtros artísticos | Canvas API (manipulación de píxeles) |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Storage imágenes | Supabase Storage (bucket público `artworks`) |
| Hosting | Netlify — https://cerulean-concha-cef704.netlify.app |

---

## Estilos artísticos disponibles

Cada estilo aplica algoritmos específicos sobre los píxeles de la imagen:

| Estilo | Algoritmo aplicado |
|---|---|
| 🌟 Van Gogh | Saturación extrema + blur direccional + bordes coloreados |
| 🔷 Picasso | Posterización + Sobel edges gruesos + rotación de tono |
| 🌸 Monet | Múltiples capas de blur suave + paleta pastel + luz difusa |
| 🌺 Frida Kahlo | Saturación 3.8× + shift a rojos + viñeta dramática |
| 🏺 Da Vinci | Escala de grises + sepia + sfumato + líneas de boceto |

---

## Estructura del proyecto

```
mambaq0.4/
├── index.html              Punto de entrada (11 pantallas en un solo HTML)
├── css/
│   └── styles.css          Sistema visual, mobile-first, safe-area notch
├── js/
│   ├── config.js           Credenciales de Supabase
│   ├── db.js               Capa de datos (Supabase + rate limiting)
│   ├── filters.js          Filtros artísticos con canvas (manipulación píxeles)
│   ├── app.js              Navegación, estado global, login, formulario
│   ├── camera.js           Cámara en vivo (getUserMedia) + clasificador IA
│   └── museo.js            Galería pública del museo
├── model/                  Modelo Teachable Machine (Foto vs Dibujo, ~2 MB)
├── assets/                 Imágenes de muestra para la galería
└── supabase/
    └── schema.sql          Tablas, vista, RLS y políticas de Storage
```

---

## Base de datos (Supabase)

### Tablas

```sql
children   — niños registrados (id uuid, name, avatar, created_at, last_seen_at)
artworks   — obras registradas (id, child_id, name, author, age, style_key,
             style_label, color, filter, emoji, image_url, image_path, created_at)
likes      — relación niño ↔ obra, unique por par
```

### Vista

```sql
artworks_with_likes — artworks + conteo de likes derivado
```

### RLS

Lectura e inserción abiertas (museo público). Delete permitido en las tres tablas.
Update en `children` (last_seen_at) y `artworks` (image_url post-upload).

---

## Configurar y correr

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com) (plan Free).
2. SQL Editor → New query → pegar `supabase/schema.sql` → Run.
3. Storage → New bucket → nombre: **`artworks`** → marcar como Public.
4. Project Settings → API → copiar **Project URL** y **anon public key**.
5. Pegar en `js/config.js`:

```js
window.MAMBAQ_CONFIG = {
  supabaseUrl:     "https://xxxx.supabase.co",
  supabaseAnonKey: "sb_publishable_...",
};
```

> El anon key es seguro en código público — las políticas RLS protegen los datos.

### 2. Correr en local

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

Requiere HTTP (no `file://`) para que funcionen Supabase SDK y TensorFlow.js.

### 3. Deploy a Netlify

```bash
npm install -g netlify-cli
netlify login
netlify deploy --dir . --prod
```

---

## Seguridad implementada

| Medida | Dónde |
|---|---|
| Rate limiting por dispositivo (3 usuarios / 15 obras por hora) | `db.js` |
| Verificación obligatoria de IA antes de registrar obra | `camera.js` + `app.js` |
| Auto-redimensionado de imágenes a máx 1200px (evita abuso de Storage) | `camera.js` |
| Filtro de palabras inapropiadas en nombres | `app.js` |
| Escape de HTML en galería (previene XSS) | `museo.js` |
| Usuarios del dispositivo en localStorage (privacidad multi-dispositivo) | `db.js` |
| Borrado de obra restringido al autor (validación en cliente + RLS) | `app.js` + Supabase |
| RLS en todas las tablas y bucket de Storage | Supabase |
| safe-area-inset para notch/barra home | `styles.css` |

---

## Flujo de pantallas

```
Login → Home → Cámara → (IA clasifica) → Formulario → Preview → Processing → Resultado → Éxito → Museo
                ↑                                                                                      |
                └──────────────────────── Mis obras (acceso directo desde Home) ──────────────────────┘
```

---

## Equipo

Universidad Simón Bolívar — Barranquilla  
Ingeniería de Sistemas

---

## Demo en vivo

🌐 **https://cerulean-concha-cef704.netlify.app**
