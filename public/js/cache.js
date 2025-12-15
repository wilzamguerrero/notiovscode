/**
 * Sistema de caché para la aplicación
 */

const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hora en milisegundos
const apiCache = {};

/**
 * Obtener datos del caché de localStorage
 */
function getCachedData(key) {
  try {
    const cachedItem = localStorage.getItem(`notion_cache_${key}`);
    if (cachedItem) {
      const { data, timestamp } = JSON.parse(cachedItem);
      if (Date.now() - timestamp < CACHE_EXPIRATION) {
        return data;
      }
    }
    return null;
  } catch (e) {
    console.warn('Cache retrieval error:', e);
    return null;
  }
}

/**
 * Guardar datos en caché de localStorage
 */
function setCachedData(key, data) {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(`notion_cache_${key}`, JSON.stringify(cacheItem));
  } catch (e) {
    console.warn('Cache storage error:', e);
  }
}

/**
 * Cargar datos de toggle desde API o caché
 */
async function loadToggleData(itemId) {
  const cachedData = getCachedData(itemId);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // CAMBIO: usar authFetch en lugar de fetch
    const res = await authFetch(`/notion/toggle/${itemId}`);
    if (!res.ok) throw new Error(`Error loading toggle: ${res.statusText}`);
    const data = await res.json();
    
    setCachedData(itemId, data);
    return data;
  } catch (error) {
    console.error("Error loading toggle data:", error);
    throw error;
  }
}

/**
 * Cargar datos con sistema de caché mejorado (memoria + localStorage)
 */
async function loadToggleDataWithCache(itemId) {
  // 1. Verificar en memoria
  if (apiCache[itemId]) {
    console.log(`Cargando desde caché en memoria: ${itemId}`);
    return apiCache[itemId];
  }
  
  // 2. Verificar en localStorage
  const cachedData = getCachedData(itemId);
  if (cachedData) {
    console.log(`Cargando desde localStorage: ${itemId}`);
    apiCache[itemId] = cachedData;
    return cachedData;
  }
  
  // 3. Hacer petición a la API
  console.log(`Haciendo petición a API: ${itemId}`);
  try {
    // CAMBIO: usar authFetch en lugar de fetch
    const res = await authFetch(`/notion/toggle/${itemId}`);
    if (!res.ok) throw new Error(`Error loading toggle: ${res.statusText}`);
    const data = await res.json();
    
    apiCache[itemId] = data;
    setCachedData(itemId, data);
    return data;
  } catch (error) {
    console.error("Error loading toggle data:", error);
    throw error;
  }
}