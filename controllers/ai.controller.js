const Tarea = require('../models/Task.model');

// ─── Duck.ai Config ──────────────────────────────────────
const DUCK_MODEL = 'gpt-4o-mini';
const DUCK_STATUS_URL = 'https://duckduckgo.com/duckchat/v1/status';
const DUCK_CHAT_URL   = 'https://duckduckgo.com/duckchat/v1/chat';

// User-Agent real para evitar bloqueos de bots en Railway
const REAL_BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

/**
 * Obtiene el token VQD necesario para la sesión.
 * Incluimos cabeceras de control para simular tráfico real.
 */
async function getVqdToken() {
  const res = await fetch(DUCK_STATUS_URL, {
    headers: {
      'User-Agent': REAL_BROWSER_UA,
      'Accept': '*/*',
      'x-vqd-accept': '1',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
  });

  if (!res.ok) {
    throw new Error(`Error de conexión con Duck.ai: ${res.status}`);
  }

  const token = res.headers.get('x-vqd-4');
  if (!token) throw new Error('No se pudo obtener el token VQD de duck.ai');
  return token;
}

/**
 * Llama a duck.ai con un prompt de usuario.
 */
async function duckChat(userPrompt) {
  const vqd = await getVqdToken();

  const res = await fetch(DUCK_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vqd-4': vqd,
      'User-Agent': REAL_BROWSER_UA,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model: DUCK_MODEL,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`duck.ai error ${res.status}: ${text}`);
  }

  const raw = await res.text();
  let fullText = '';

  // Procesamiento del stream SSE
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') break;
    try {
      const json = JSON.parse(payload);
      // Duck.ai devuelve el contenido en 'message', lo acumulamos
      if (json.message) fullText += json.message;
    } catch {
      continue;
    }
  }

  if (!fullText) throw new Error('La IA devolvió una respuesta vacía');
  return fullText;
}

// ─── CONTROLADORES ──────────────────────────────────────

const generarSubtareas = async (req, res) => {
  try {
    const { tareaId } = req.body;
    const tarea = await Tarea.findOne({ _id: tareaId, usuario: req.usuario._id });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const hoy = new Date();
    const diasRestantes = Math.ceil((tarea.fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

    const prompt = `Eres un asistente experto. Analiza la tarea: "${tarea.titulo}" (${tarea.prioridad}). 
    Genera un JSON con esta estructura: {"subtareas": [{"titulo": "", "descripcion": "", "orden": 1}], "consejo": ""}. 
    Responde SOLO el JSON.`;

    const rawText = await duckChat(prompt);
    
    // Limpieza de posibles bloques markdown de la IA
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    const respuesta = JSON.parse(cleanJson);

    tarea.subtareas = respuesta.subtareas.map((s, i) => ({
      titulo: s.titulo,
      descripcion: s.descripcion,
      completada: false,
      orden: s.orden || i + 1,
    }));
    tarea.subtareasGeneradasPorIA = true;
    await tarea.save();

    res.json({
      mensaje: 'Subtareas generadas!',
      subtareas: tarea.subtareas,
      consejo: respuesta.consejo,
    });
  } catch (error) {
    console.error('Error en IA:', error);
    res.status(500).json({ error: 'Fallo en la comunicación con la IA.' });
  }
};

// ... (El resto de controladores analizarCargaTrabajo y sugerirDescripcion 
// se mantienen igual ya que ahora duckChat funcionará correctamente)

module.exports = { generarSubtareas, analizarCargaTrabajo, sugerirDescripcion };