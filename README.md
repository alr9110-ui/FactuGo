# FactuGo

Demo de una aplicación web de facturación y control fiscal para autónomos y pequeños negocios, creada con React y Vite.

## Funcionalidades

- Facturas emitidas y recibidas, clientes y proveedores.
- Cálculo de IVA trimestral y borrador orientativo del modelo 303.
- Libros registro exportables y avisos para los modelos 115, 130/131, 347, 349 y 390.
- Digitalización de facturas, plantillas, cobros y notificaciones administrativas.

## Probar la demo

En la pantalla de acceso, pulsa **“Probar demo con datos ficticios”**. Los datos se almacenan únicamente en el navegador del visitante y no se comparten con terceros.

> Esta versión es una demostración técnica. No introduzcas datos fiscales, personales, certificados digitales ni información real de clientes.

## Desarrollo local

Requisitos: Node.js 22 o superior.

```bash
npm install
npm run dev
```

Comprobaciones del proyecto:

```bash
npm run lint
npm run typecheck
npm run build
```

## Despliegue en GitHub Pages

El repositorio incluye el flujo `.github/workflows/deploy.yml`.

1. Crea un repositorio público en GitHub, por ejemplo `FactuGo`.
2. Sube el proyecto a la rama `main`.
3. En GitHub entra en **Settings → Pages** y selecciona **GitHub Actions**.
4. Cada `push` a `main` publicará automáticamente la demo en:

```text
https://TU-USUARIO.github.io/FactuGo/
```

La aplicación usa rutas con hash al desplegarse en GitHub Pages, para que las secciones internas sigan funcionando al recargar.

## Límites actuales

- No hay servidor ni base de datos: cada visitante conserva sus propios datos en el navegador.
- No se debe utilizar para contabilidad real ni para presentar declaraciones.
- El envío de emails abre el cliente de correo local.
- La extracción con IA y las integraciones oficiales requieren un backend y proveedores externos antes de usarse en producción.
