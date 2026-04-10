const Tarea = require('../models/Task.model');

// ─── Duck.ai client ──────────────────────────────────────
// Modelos disponibles: gpt-4o-mini | claude-3-haiku-20240307 | meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo | mistralai/Mixtral-8x7B-Instruct-v0.1
const DUCK_MODEL = 'gpt-4o-mini';
const DUCK_STATUS_URL = 'https://duckduckgo.com/duckchat/v1/status';
const DUCK_CHAT_URL   = 'https://duckduckgo.com/duckchat/v1/chat';

async function getVqdToken() {
  const res = await fetch(DUCK_STATUS_URL, {
    headers: {
      'x-vqd-accept': '1',
      'User-Agent': 'Mozilla/5.0',
    },
  });
  const token = res.headers.get('x-vqd-4');
  if (!token) throw new Error('No se pudo obtener el token VQD de duck.ai');
  return token;
}

/**
 * Llama a duck.ai con un prompt de usuario y devuelve el texto completo.
 * @param {string} userPrompt
 * @returns {Promise<string>}
 */
async function duckChat(userPrompt) {
  const vqd = await getVqdToken();

  const res = await fetch(DUCK_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vqd-4': vqd,
      'User-Agent': 'Mozilla/5.0',
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

  // La respuesta es un stream SSE — leemos y concatenamos los chunks
  const raw = await res.text();
  let fullText = '';

  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') break;
    try {
      const json = JSON.parse(payload);
      fullText += json?.message ?? '';
    } catch {
      // chunk no parseable, ignorar
    }
  }

  return fullText;
}

// ─── POST /api/ai/generar-subtareas ──────────────────────
const generarSubtareas = async (req, res) => {
  try {
    const { tareaId } = req.body;

    const tarea = await Tarea.findOne({ _id: tareaId, usuario: req.usuario._id });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const hoy = new Date();
    const diasRestantes = Math.ceil((tarea.fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

    const prompt = `Eres un asistente experto en gestión de proyectos y productividad.

Analiza la siguiente tarea y genera subtareas específicas y accionables:

**Tarea:** "${tarea.titulo}"
**Descripción:** ${tarea.descripcion || 'Sin descripción adicional'}
**Prioridad:** ${tarea.prioridad}
**Categoría:** ${tarea.categoria}
**Días hasta vencimiento:** ${diasRestantes} días

Teniendo en cuenta la prioridad "${tarea.prioridad}" y que quedan ${diasRestantes} días:
- Si la prioridad es "urgente" o quedan pocos días: genera 5-7 subtareas muy concretas y rápidas
- Si la prioridad es "alta": genera 4-6 subtareas bien definidas
- Si la prioridad es "media": genera 3-5 subtareas equilibradas
- Si la prioridad es "baja": genera 2-4 subtareas generales

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "subtareas": [
    {
      "titulo": "Nombre corto de la subtarea",
      "descripcion": "Descripción clara y accionable de qué hacer exactamente",
      "orden": 1
    }
  ],
  "consejo": "Un consejo breve y práctico para completar la tarea a tiempo"
}`;

    const rawText = await duckChat(prompt);

    // Extraer JSON aunque venga envuelto en bloques markdown
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new SyntaxError('Respuesta sin JSON válido');
    const respuesta = JSON.parse(jsonMatch[0]);

    tarea.subtareas = respuesta.subtareas.map((s, i) => ({
      titulo: s.titulo,
      descripcion: s.descripcion,
      completada: false,
      orden: s.orden || i + 1,
    }));
    tarea.subtareasGeneradasPorIA = true;
    await tarea.save();

    res.json({
      mensaje: 'Subtareas generadas por IA correctamente.',
      subtareas: tarea.subtareas,
      consejo: respuesta.consejo,
    });
  } catch (error) {
    console.error('Error generando subtareas:', error);
    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: 'Error procesando la respuesta de la IA.' });
    }
    res.status(500).json({ error: 'Error al generar subtareas con IA.' });
  }
};

// ─── POST /api/ai/analizar-carga ────────────────────────
const analizarCargaTrabajo = async (req, res) => {
  try {
    const tareas = await Tarea.find({
      usuario: req.usuario._id,
      estado: { $in: ['pendiente', 'en_progreso'] },
    }).select('titulo prioridad fechaVencimiento estado progreso');

    if (tareas.length === 0) {
      return res.json({ analisis: '¡No tienes tareas pendientes! Disfruta de tu tiempo libre. 🎉' });
    }

    const resumenTareas = tareas.map(t => ({
      titulo: t.titulo,
      prioridad: t.prioridad,
      diasRestantes: Math.ceil((t.fechaVencimiento - new Date()) / (1000 * 60 * 60 * 24)),
      progreso: t.progreso + '%',
    }));

    const prompt = `Eres un coach de productividad. Analiza esta carga de trabajo y da recomendaciones:

Tareas pendientes:
${JSON.stringify(resumenTareas, null, 2)}

Proporciona:
1. Una evaluación breve del nivel de carga (1-2 frases)
2. Las 3 tareas más urgentes en las que enfocarse primero
3. Un consejo de productividad personalizado

Sé directo, práctico y motivador. Responde en español, máximo 200 palabras.`;

    const analisis = await duckChat(prompt);

    res.json({
      analisis,
      totalTareasPendientes: tareas.length,
    });
  } catch (error) {
    console.error('Error analizando carga:', error);
    res.status(500).json({ error: 'Error al analizar la carga de trabajo.' });
  }
};

// ─── POST /api/ai/sugerir-descripcion ───────────────────
const sugerirDescripcion = async (req, res) => {
  try {
    const { titulo, categoria, prioridad } = req.body;

    const prompt = `Genera una descripción concisa y profesional para esta tarea de gestión:

Título: "${titulo}"
Categoría: ${categoria || 'General'}
Prioridad: ${prioridad || 'media'}

La descripción debe:
- Ser clara y accionable (2-3 oraciones)
- Indicar el objetivo principal
- Mencionar el resultado esperado
- Estar en español

Responde solo con la descripción, sin introducciones ni explicaciones.`;

    const descripcion = await duckChat(prompt);

    res.json({ descripcion: descripcion.trim() });
  } catch (error) {
    console.error('Error sugerirDescripcion:', error.message);
    res.status(500).json({ error: 'Error al generar la descripción.' });
  }
};

module.exports = { generarSubtareas, analizarCargaTrabajo, sugerirDescripcion };