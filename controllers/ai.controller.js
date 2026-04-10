const Tarea = require('../models/Task.model');

// Configuración de Duck.ai
const DUCK_MODEL = 'gpt-4o-mini';
const DUCK_STATUS_URL = 'https://duckduckgo.com/duckchat/v1/status';
const DUCK_CHAT_URL   = 'https://duckduckgo.com/duckchat/v1/chat';

// User-Agent de alta fidelidad para evitar bloqueos en Railway
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

/**
 * Obtiene el token VQD (Obligatorio para Duck.ai)
 */
async function getVqdToken() {
  try {
    const res = await fetch(DUCK_STATUS_URL, {
      headers: {
        'User-Agent': UA,
        'Accept': '*/*',
        'x-vqd-accept': '1',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);
    
    const token = res.headers.get('x-vqd-4');
    if (!token) throw new Error('Cabecera x-vqd-4 ausente');
    
    return token;
  } catch (err) {
    console.error(' [IA Error] Fallo al obtener VQD:', err.message);
    throw err;
  }
}

/**
 * Función central de comunicación con Duck.ai
 */
async function duckChat(userPrompt) {
  const vqd = await getVqdToken();

  const res = await fetch(DUCK_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vqd-4': vqd,
      'User-Agent': UA,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model: DUCK_MODEL,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Chat error ${res.status}`);

  const raw = await res.text();
  let fullText = '';

  // Procesar respuesta stream
  const lines = raw.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        fullText += parsed.message || '';
      } catch (e) { /* chunk parcial */ }
    }
  }

  return fullText.trim();
}

// ─── CONTROLADORES EXPORTADOS ────────────────────────────────

/**
 * Genera subtareas para una tarea específica
 */
const generarSubtareas = async (req, res) => {
  try {
    const { tareaId } = req.body;
    const tarea = await Tarea.findOne({ _id: tareaId, usuario: req.usuario._id });

    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const hoy = new Date();
    const dias = Math.ceil((tarea.fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

    const prompt = `Eres un experto en productividad. Genera subtareas para: "${tarea.titulo}". 
    Prioridad: ${tarea.prioridad}. Días restantes: ${dias}.
    Responde ÚNICAMENTE un JSON válido con esta estructura:
    {
      "subtareas": [{"titulo": "...", "descripcion": "...", "orden": 1}],
      "consejo": "..."
    }`;

    const rawResponse = await duckChat(prompt);
    
    // Limpiar posibles bloques de código Markdown (```json ... ```)
    const jsonString = rawResponse.replace(/```json|```/gi, '').trim();
    const data = JSON.parse(jsonString);

    tarea.subtareas = data.subtareas.map((s, i) => ({
      ...s,
      completada: false,
      orden: s.orden || i + 1
    }));
    tarea.subtareasGeneradasPorIA = true;
    await tarea.save();

    res.json({ mensaje: 'Subtareas creadas', subtareas: tarea.subtareas, consejo: data.consejo });
  } catch (error) {
    console.error('Error generarSubtareas:', error.message);
    res.status(500).json({ error: 'No se pudo generar el análisis. Inténtalo de nuevo.' });
  }
};

/**
 * Analiza el dashboard completo del usuario
 */
const analizarCargaTrabajo = async (req, res) => {
  try {
    const tareas = await Tarea.find({
      usuario: req.usuario._id,
      estado: { $in: ['pendiente', 'en_progreso'] },
    }).select('titulo prioridad fechaVencimiento progreso');

    if (!tareas.length) {
      return res.json({ analisis: 'No tienes tareas pendientes actualmente. ¡Buen trabajo!' });
    }

    const prompt = `Analiza esta carga de trabajo y da consejos breves en español (máximo 150 palabras):
    ${JSON.stringify(tareas)}
    Indica qué es lo más urgente y cómo organizarse mejor hoy.`;

    const analisis = await duckChat(prompt);
    res.json({ analisis, totalTareasPendientes: tareas.length });
  } catch (error) {
    console.error('Error analizarCargaTrabajo:', error.message);
    res.status(500).json({ error: 'Error al conectar con la IA.' });
  }
};

/**
 * Sugiere una descripción basada en el título
 */
const sugerirDescripcion = async (req, res) => {
  try {
    const { titulo, categoria } = req.body;
    const prompt = `Escribe una descripción profesional y corta (2 frases) para la tarea: "${titulo}" de la categoría "${categoria}". Responde solo la descripción.`;

    const descripcion = await duckChat(prompt);
    res.json({ descripcion });
  } catch (error) {
    console.error('Error sugerirDescripcion:', error.message);
    res.status(500).json({ error: 'Error al obtener sugerencia.' });
  }
};

module.exports = { generarSubtareas, analizarCargaTrabajo, sugerirDescripcion };