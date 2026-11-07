// Vista del cliente: consume los productos vigentes desde la API de PHP.
let productos = [];

const contenedorCatalogo = document.getElementById('catalogo-cliente');
const inputBuscador = document.getElementById('buscador');
const selectCategoria = document.getElementById('filtro-categoria');

const formatoMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

// Escapa texto de la base de datos antes de insertarlo como HTML (evita XSS).
const esc = (texto) =>
    String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function mostrarMensaje(titulo, detalle) {
    contenedorCatalogo.innerHTML = `
        <div class="estado-vacio">
            <h2>${esc(titulo)}</h2>
            <p>${esc(detalle)}</p>
        </div>`;
}

function renderizarProductos(lista) {
    contenedorCatalogo.innerHTML = '';

    if (lista.length === 0) {
        mostrarMensaje('😕 No encontramos productos', 'Intenta con otros términos de búsqueda o selecciona otra categoría.');
        return;
    }

    lista.forEach((p) => {
        const dias = Number(p.dias_para_vencer);
        const urgente = dias <= 3;
        const badgeClase = urgente ? 'badge-alerta' : 'badge-fresco';
        const textoEstado = urgente ? `¡Consumo rápido! (${dias} días)` : `Fresco (${dias} días)`;

        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-producto';
        tarjeta.innerHTML = `
            <div class="badge-contenedor">
                <span class="badge ${badgeClase}">${esc(textoEstado)}</span>
            </div>
            <div class="tarjeta-img-contenedor">
                <img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy">
            </div>
            <div class="tarjeta-cuerpo">
                <div>
                    <span class="categoria-label">${esc(p.categoria)}</span>
                    <h3 class="tarjeta-titulo">${esc(p.nombre)}</h3>
                    <div class="tarjeta-detalles">
                        Lote: <strong>${esc(p.lote)}</strong><br>
                        Vence: ${esc(p.fecha_vencimiento)}
                    </div>
                </div>
                <div class="precio-contenedor">
                    <span class="precio">${formatoMoneda(p.precio)}</span>
                    <span class="stock">${esc(p.stock)} und.</span>
                </div>
            </div>`;
        contenedorCatalogo.appendChild(tarjeta);
    });
}

function filtrarCatalogo() {
    const texto = inputBuscador.value.toLowerCase().trim();
    const categoria = selectCategoria.value;

    renderizarProductos(
        productos.filter(
            (p) =>
                p.nombre.toLowerCase().includes(texto) &&
                (categoria === 'Todas' || p.categoria === categoria)
        )
    );
}

async function cargarProductos() {
    try {
        const respuesta = await fetch('api/productos.php');
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        productos = await respuesta.json();
        filtrarCatalogo();
    } catch (error) {
        mostrarMensaje('⚠️ No se pudo cargar el catálogo', 'Intenta de nuevo en unos minutos.');
    }
}

inputBuscador.addEventListener('input', filtrarCatalogo);
selectCategoria.addEventListener('change', filtrarCatalogo);
document.addEventListener('DOMContentLoaded', cargarProductos);
