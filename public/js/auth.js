/**
 * Sistema de autenticación
 */

const AUTH_SESSION_KEY = 'notionSessionId';

/**
 * Obtener ID de sesión actual
 */
function getSessionId() {
  return sessionStorage.getItem(AUTH_SESSION_KEY);
}

/**
 * Verificar si hay sesión activa
 */
async function isAuthenticated() {
  const sessionId = getSessionId();
  if (!sessionId) return false;

  try {
    const res = await fetch('/api/verify-session', {
      headers: { 'X-Session-Id': sessionId }
    });
    const data = await res.json();
    return data.valid === true;
  } catch (e) {
    return false;
  }
}

/**
 * Redirigir a login si no hay sesión
 */
async function requireAuth() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    // Limpiar sesión inválida
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    // Redirigir a login
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

/**
 * Cerrar sesión
 */
async function logout() {
  const sessionId = getSessionId();
  
  if (sessionId) {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'X-Session-Id': sessionId }
      });
    } catch (e) {
      // Ignorar errores de logout
    }
  }
  
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  window.location.href = '/login.html';
}

/**
 * Hacer fetch autenticado
 */
async function authFetch(url, options = {}) {
  const sessionId = getSessionId();
  
  if (!sessionId) {
    window.location.href = '/login.html';
    throw new Error('No hay sesión activa');
  }

  const headers = {
    ...options.headers,
    'X-Session-Id': sessionId
  };

  const response = await fetch(url, { ...options, headers });

  // Si la sesión expiró, redirigir a login
  if (response.status === 401) {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    window.location.href = '/login.html';
    throw new Error('Sesión expirada');
  }

  return response;
}