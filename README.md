# MAMBAQ

Prototipo web del Museo de Arte Moderno de Barranquilla. Pensado para que niños
entre 3 y 12 años transformen sus dibujos en obras al estilo de Van Gogh,
Picasso, Monet, Frida Kahlo o Da Vinci.

Es un proyecto académico de la Universidad Simón Bolívar (Ingeniería de
Sistemas) en colaboración con el MAMBAQ.

---

## Qué hace

Un niño abre la app, se identifica con su nombre y un avatar, y entra a una
pantalla tipo museo. Toma una foto de su dibujo (o la sube desde la galería),
elige el estilo de un maestro, y la app le devuelve una versión "transformada"
de la obra. Si quiere, la registra en la galería pública del museo, donde
también puede ver lo que han hecho los demás y darles me gusta.

Internamente hay un detalle que importa: antes de procesar la imagen, un
clasificador entrenado en Teachable Machine valida que efectivamente sea un
dibujo y no una foto cualquiera. Si la imagen es una foto, la app la rechaza
amablemente. Es una protección sencilla pensando en el contexto de niños.

La "transformación" no es una IA generativa pesada — son filtros CSS calibrados
para cada estilo. Se ejecuta todo en el navegador, sin servidor de inferencia.
Para el alcance del prototipo es suficiente y mantiene la latencia en cero.

## Cómo está hecho

HTML, CSS y JavaScript vanilla, sin build step. Las únicas dependencias se
cargan desde CDN:

- `@tensorflow/tfjs` y `@teachablemachine/image` — para correr el clasificador
  Foto/Dibujo en el navegador.
- `@supabase/supabase-js` — base de datos (Postgres) y Storage para guardar las
  obras.

El modelo del clasificador vive en `model/` (model.json + weights.bin de ~2 MB),
exportado desde Teachable Machine.

## Estructura

```
mambaq0.4/
├── index.html              Punto de entrada con las 11 pantallas
├── README.md
├── css/
│   └── styles.css          Sistema visual y responsive
├── js/
│   ├── config.js           Credenciales de Supabase (editar antes de correr)
│   ├── db.js               Capa de persistencia (Supabase)
│   ├── app.js              Navegación, estado, login, formulario
│   ├── camera.js           Captura de imagen y clasificador IA
│   └── museo.js            Galería del museo
├── model/                  Modelo Teachable Machine (Foto vs Dibujo)
├── assets/                 Imágenes de muestra para la galería
└── supabase/
    └── schema.sql          SQL para crear tablas, vista y políticas
```

## Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com). Plan Free es
   suficiente. Región recomendada: São Paulo.
2. Ir a `SQL Editor → New query`, pegar el contenido de
   `supabase/schema.sql` y correrlo. Crea las tablas `children`, `artworks`,
   `likes`, la vista `artworks_with_likes` y las políticas RLS.
3. Ir a `Storage → New bucket`, crear uno llamado **`artworks`** y marcarlo
   como `Public`.
4. En `Project Settings → API` copiar el `Project URL` y el `anon public` key.
5. Pegarlos en `js/config.js`:

   ```js
   window.MAMBAQ_CONFIG = {
     supabaseUrl:     "https://xxxxx.supabase.co",
     supabaseAnonKey: "eyJ...",
   };
   ```

El anon key es público por diseño en Supabase — no es un secreto, RLS protege
los datos. Aún así, no commitees credenciales reales si el repo va a ser
público sin revisar las políticas.

## Correr en local

La app es estática. Lo más simple:

```bash
python -m http.server 8000
```

Y abrir `http://localhost:8000`. Servir por HTTP (no `file://`) evita problemas
con la SDK de Supabase y con el cargado del modelo TensorFlow.

También funciona con cualquier servidor estático: `npx serve`, Live Server de
VS Code, etc.

## Probar el flujo

1. Primera carga: pantalla de login. Escribir un nombre, elegir un avatar,
   tocar `¡Soy yo!`.
2. Home con saludo personalizado. Tocar `¡Comenzar!`.
3. Tomar o subir una imagen. La IA dice si es dibujo o foto.
4. Llenar el formulario, escoger estilo, continuar.
5. La obra queda guardada en Supabase. En el Museo aparece junto a las seis
   obras de muestra.
6. Recargar la página: la sesión persiste, las obras también.

## Estado del proyecto

Prototipo en desarrollo activo. No usar con datos reales de menores fuera de
un entorno controlado de pruebas — la autenticación es deliberadamente simple
(solo nombre + avatar) porque el objetivo es la facilidad de uso para niños,
no la protección de identidad.

## Equipo

Universidad Simón Bolívar — Barranquilla
Ingeniería de Sistemas
