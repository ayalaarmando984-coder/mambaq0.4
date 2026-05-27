# MAMBAQ – Prototipo Funcional

**Museo de Arte Moderno de Barranquilla**  
App interactiva para niños de 3 a 6 años que convierte dibujos en obras de arte al estilo de grandes maestros.

---

## 🗂️ Estructura del proyecto

```
mambaq/
├── index.html          ← Punto de entrada (abre esto en el navegador)
├── README.md
├── css/
│   └── styles.css      ← Todos los estilos y paleta de colores
└── js/
    ├── app.js          ← Navegación, estado global y formulario
    ├── camera.js       ← Captura de imagen y pantalla de procesamiento
    └── museo.js        ← Galería interactiva y detalle de obras
```

---

## 🚀 Cómo ejecutar

Solo abre `index.html` en el navegador. No requiere instalar nada.

Para probar en móvil, puedes subir el proyecto a **GitHub Pages**:
1. Sube los archivos a un repositorio de GitHub
2. Ve a Settings → Pages → Branch: main → Save
3. Accede desde tu celular con la URL generada

---

## 📱 Pantallas del prototipo

| Pantalla | Descripción |
|---|---|
| Home | Bienvenida y acceso a las secciones |
| Cámara | Tomar foto o elegir de galería |
| Formulario | Nombre, autor y estilo artístico |
| Vista previa | Confirmar antes de procesar |
| Procesando IA | Barra de progreso y transformación |
| Resultado | Imagen con filtro del estilo aplicado |
| Registro exitoso | Confirmación y acceso al museo |
| Museo Interactivo | Galería con tabs Todas / Recientes / Populares |
| Detalle de obra | Vista completa de una obra |
| Conócenos | Información del MAMBAQ |

---

## 🎨 Estilos artísticos disponibles.

- Van Gogh
- Pablo Picasso
- Claude Monet
- Frida Kahlo
- Leonardo da Vinci

Los filtros se aplican con CSS (`filter`) sobre la imagen capturada.

---

## 👥 Equipo

Proyecto académico — Universidad Simón Bolívar, Barranquilla  
Ingeniería de Sistemas
