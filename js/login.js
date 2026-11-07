// Autenticación hacia el servidor (api/auth.php).
const formLogin = document.getElementById('form-login');
const errorLogin = document.getElementById('error-login');

// Si ya hay sesión activa, ir directo al panel.
fetch('api/auth.php')
    .then((r) => r.json())
    .then((d) => { if (d.autenticado) window.location.href = 'admin.html'; })
    .catch(() => {});

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorLogin.hidden = true;

    try {
        const respuesta = await fetch('api/auth.php?accion=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario: document.getElementById('usuario').value,
                password: document.getElementById('password').value,
            }),
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            errorLogin.textContent = datos.error || 'No se pudo iniciar sesión';
            errorLogin.hidden = false;
            return;
        }
        window.location.href = 'admin.html';
    } catch (error) {
        errorLogin.textContent = 'No se pudo conectar con el servidor';
        errorLogin.hidden = false;
    }
});
