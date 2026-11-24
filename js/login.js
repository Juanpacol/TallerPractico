const API_AUTH = 'api/auth.php';

const formLogin = document.getElementById('form-login');
const errorLogin = document.getElementById('error-login');

function mostrarError(mensaje) {
    errorLogin.textContent = mensaje;
    errorLogin.hidden = false;
}

async function iniciarSesion(evento) {
    evento.preventDefault();
    errorLogin.hidden = true;

    try {
        const respuesta = await fetch(`${API_AUTH}?accion=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario: document.getElementById('usuario').value,
                password: document.getElementById('password').value,
            }),
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            mostrarError(datos.error || 'No se pudo iniciar sesión');
            return;
        }
        window.location.href = 'admin.html';
    } catch (error) {
        mostrarError('No se pudo conectar con el servidor');
    }
}

fetch(API_AUTH)
    .then((respuesta) => respuesta.json())
    .then((datos) => { if (datos.autenticado) window.location.href = 'admin.html'; })
    .catch(() => {});

formLogin.addEventListener('submit', iniciarSesion);
