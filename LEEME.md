# Comercial Artigas — Catálogo web con consulta por WhatsApp

Sitio simple, sin costo de hosting, pensado para celular. El cliente busca el
producto, ve el precio de referencia y toca "Consultar": se abre WhatsApp con
un mensaje ya escrito con el nombre del producto.

## Archivos

```
index.html      → estructura de la página (normalmente no se toca)
styles.css      → colores y diseño (normalmente no se toca)
app.js          → lógica del sitio (normalmente no se toca)
productos.csv   → EDITAR CADA SEMANA: acá van los productos y precios
config.csv      → EDITAR UNA VEZ: WhatsApp, dirección, horario
assets/         → logo
```

## 1) Cómo actualizar productos (semanal)

Abrí `productos.csv` con Excel o Google Sheets. Columnas:

| columna      | qué va                                             |
|--------------|-----------------------------------------------------|
| categoria    | Herramientas, Materiales, Electricidad, etc.        |
| nombre       | nombre del producto                                  |
| descripcion  | detalle corto (opcional)                             |
| precio       | solo números, sin el símbolo $ (ej: 3200)            |
| unidad       | unidad, bolsa, metro, kg, etc.                       |
| destacado    | SI o NO — los "SI" aparecen primero y con el tag "Oferta" |
| imagen       | opcional — nombre del archivo de foto (ver abajo)    |

**Para agregar/sacar muchos productos a la vez:** editá el CSV entero en Excel
y volvé a subir el archivo reemplazando el que está en la web.

**Para cambiar uno o dos precios rápido:** abrís el mismo archivo, cambiás el
número de esa fila, guardás y subís.

⚠️ Importante: si un nombre de producto tiene comillas (ej: `1/2"`), en Excel
andá tranquilo — Excel las guarda bien automáticamente al exportar CSV. Solo
prestá atención si editás el archivo a mano fuera de Excel.

### Formato del precio

- Solo números: `3200`, `1500.50` o `1.500` (con punto de miles) — todos andan bien.
- Si no tenés el precio definido, dejá la celda vacía: el sitio muestra "Consultar" automáticamente.
- Si el precio depende del caso (ej: cortes especiales), podés escribir texto como `A convenir` en vez de un número — se muestra tal cual, sin el signo $.
- No dejes filas con categoría cargada pero el resto vacío (fila "fantasma" de Excel) — el sitio las ignora igual, pero mejor borrarlas del archivo para mantenerlo prolijo.
- Las categorías no distinguen mayúsculas/minúsculas (`Herramientas` y `herramientas` cuentan como la misma), pero por prolijidad visual conviene escribirlas siempre igual.

### Fotos de productos (opcional, solo en algunos)

La mayoría de los productos no necesita foto — la idea es usarlas solo donde
el diseño le importa al cliente (cerámicas, porcelanatos, grifería, etc.).

**Cómo agregar una foto a un producto:**

1. Guardá la foto dentro de la carpeta `assets/productos/`.
2. En la columna `imagen` de ese producto en el CSV, escribí el nombre exacto
   del archivo (ej: `porcelanato-gris.jpg`).
3. Dejá la columna `imagen` **vacía** en los productos que no necesitan foto
   — el sitio los muestra igual que siempre, sin espacio en blanco raro.

**Recomendaciones para las fotos:**

- Formato cuadrado (1:1) — el sitio recorta automáticamente para que se vea
  parejo, pero si la foto ya es cuadrada se ve mejor.
- Tamaño ideal: entre 600x600 y 1000x1000 píxeles. No hace falta más — fotos
  gigantes solo hacen que la web cargue más lento en el celular del cliente.
- Formato JPG o PNG, peso idealmente bajo 300KB por foto (cualquier editor o
  el mismo WhatsApp al reenviarla suele comprimir lo suficiente).
- Nombre de archivo sin espacios ni acentos (ej: `ceramica-blanca.jpg`, no
  `cerámica blanca.jpg`) — evita problemas al subir a GitHub.

Si escribís mal el nombre del archivo en el CSV, o te olvidás de subir la
foto, el sitio no se rompe: el producto simplemente se muestra sin foto,
como el resto.

**Nota:** dejé 2 productos de ejemplo con foto en `productos.csv`
("Porcelanato gris 60x60" y "Cerámica blanca 30x30", categoría "Cerámicas")
para que veas el resultado real. Son de muestra — borralos o reemplazalos
por tus productos reales cuando cargues el catálogo definitivo.

## 2) Cómo cambiar WhatsApp / dirección / horario

Editá `config.csv`:

- `whatsapp_numero`: código de país + número, sin espacios ni `+`. Uruguay:
  `598` + número sin el 0 inicial. Ejemplo: si tu WhatsApp Business es
  `099 123 456`, el valor es `59899123456`.
- `direccion`, `horario_l_v`, `horario_sab`: texto libre.
- `mapa_url`: el link que te da Google Maps al compartir la ubicación del
  negocio.

⚠️ Si dejás `whatsapp_numero` vacío por error, el sitio te avisa con un
cartel naranja arriba del catálogo — así te das cuenta antes de publicarlo,
en vez de que un cliente real toque un botón que no funciona.

## 3) Publicar gratis (GitHub Pages — recomendado)

1. Creá una cuenta gratis en [github.com](https://github.com) si no tenés.
2. Creá un repositorio nuevo, público, nombre por ejemplo `comercial-artigas`.
3. Subí estos archivos y carpetas tal cual están (arrastrar y soltar desde la
   web de GitHub funciona).
4. Andá a **Settings → Pages**, en "Source" elegí la rama `main` y carpeta
   `/ (root)`. Guardá.
5. En 1-2 minutos tu web queda publicada en:
   `https://tu-usuario.github.io/comercial-artigas/`
6. Cada vez que quieras actualizar precios: subís el `productos.csv` nuevo al
   mismo repositorio (botón "Add file → Upload files", reemplazando el
   anterior) y en un minuto se actualiza solo.

Cuando compres el dominio propio, en el mismo panel de GitHub Pages hay una
opción "Custom domain" para conectarlo sin rehacer nada.

## 4) Probarlo en tu computadora antes de publicar (opcional)

Los navegadores bloquean la carga de archivos CSV si abrís el `index.html`
directamente con doble clic. Para probarlo local, necesitás un servidor
simple. Si tenés Python instalado, desde la carpeta del proyecto:

```
python3 -m http.server 8000
```

Y abrís `http://localhost:8000` en el navegador.

## Qué hace cada botón "Consultar"

Arma automáticamente un link tipo:

```
https://wa.me/59899123456?text=Hola!%20Quería%20consultar%20precio%20y%20disponibilidad%20de:%20Taladro%20percutor%201/2"
```

El cliente toca el botón, se abre WhatsApp (app o web) con ese mensaje ya
escrito, listo para enviar. Vos contestás con el precio actualizado y
disponibilidad real desde tu WhatsApp Business, como ya hacés hoy — la web
solo evita que tengan que escribir el nombre del producto a mano.
