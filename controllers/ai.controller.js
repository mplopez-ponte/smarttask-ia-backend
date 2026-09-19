const { GoogleGenAI } = require('@google/genai');
const Tarea = require('../models/Task.model');

// Modelo rápido ideal para generación de texto corto e instrucciones JSON
const MODELO = 'gemini-2.5-flash';

// Helper para inicializar la IA validando la clave
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('La variable GEMINI_API_KEY no está definida en el entorno.');
  }
  return new GoogleGenAI({ apiKey });
};

// ─── POST /api/ai/sugerir-descripcion ───────────────────
const sugerirDescripcion = async (req, res) => {
  try {
    const { titulo, categoria, prioridad } = req.body;

    // Validar parámetro obligatorio
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'El campo "titulo" es obligatorio.' });
    }

    const ai = getAiClient();

    const prompt = `Genera una descripción concisa, útil y profesional para esta tarea de gestión:
Título: "${titulo}"
Categoría: ${categoria || 'General'}
Prioridad: ${prioridad || 'media'}

La descripción debe:
- Ser breve y accionable (2 o 3 oraciones máximo).
- Indicar el objetivo principal y el resultado esperado.
- Estar escrita en español neutro y profesional.

Responde ÚNICAMENTE con el texto de la descripción. No agregues comillas, introducciones ni bloques de código markdown.`;

    const response = await ai.models.generateContent({
      model: MODELO,
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 200,
      },
    });

    return res.json({
      descripcion: response.text.trim(),
      modelo: MODELO,
    });
  } catch (error) {
    console.error('❌ ERROR DETALLADO EN GEMINI (sugerirDescripcion):', error);

    return res.status(500).json({
      error: 'Error al comunicarse con la IA de Gemini',
      detalle: error.message || 'Error desconocido',
    });
  }
};

// ─── POST /api/ai/generar-subtareas ──────────────────────
const generarSubtareas = async (req, res) => {
  try {
    const { tareaId } = req.body;

    const tarea = await Tarea.findOne({ _id: tareaId, usuario: req.usuario._id });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

    // Calcular días restantes
    const hoy = new Date();
    const diasRestantes = Math.ceil((new Date(tarea.fechaVencimiento) - hoy) / (1000 * 60 * 60 * 24));

    const prompt = `Eres un asistente experto en gestión de proyectos y productividad.

Analiza la siguiente tarea y genera subtareas específicas y accionables:

**Tarea:** "${tarea.titulo}"
**Descripción:** ${tarea.descripcion || 'Sin descripción adicional'}
**Prioridad:** ${tarea.prioridad}
**Categoría:** ${tarea.categoria || 'General'}
**Días hasta vencimiento:** ${diasRestantes} días

Teniendo en cuenta la prioridad "${tarea.prioridad}" y que quedan ${diasRestantes} días:
- Si la prioridad es "urgente" o quedan pocos días: genera 5-7 subtareas muy concretas
- Si la prioridad es "alta": genera 4-6 subtareas bien definidas
- Si la prioridad es "media": genera 3-5 subtareas equilibradas
- Si la prioridad es "baja": genera 2-4 subtareas generales

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "subtareas": [
    {
      "titulo": "Nombre corto de la subtarea",
      "descripcion": "Descripción clara de qué hacer exactamente",
      "orden": 1
    }
  ],
  "consejo": "Un consejo breve y práctico para completar la tarea a tiempo"
}`;

    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model: MODELO,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    let contenido = response.text.trim();

    // Limpieza preventivas de etiquetas markdown
    contenido = contenido.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    const respuesta = JSON.parse(contenido);

    // Guardar subtareas generadas en el documento de MongoDB
    tarea.subtareas = respuesta.subtareas.map((s, i) => ({
      titulo: s.titulo,
      descripcion: s.descripcion,
      completada: false,
      orden: s.orden || i + 1,
    }));
    tarea.subtareasGeneradasPorIA = true;
    await tarea.save();

    return res.json({
      mensaje: 'Subtareas generadas por IA correctamente.',
      subtareas: tarea.subtareas,
      consejo: respuesta.consejo,
      modelo: MODELO,
    });
  } catch (error) {
    console.error('❌ ERROR DETALLADO EN GEMINI (generarSubtareas):', error);
    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: 'Error procesando el formato JSON de la IA.' });
    }
    return res.status(500).json({
      error: 'Error al generar subtareas con Gemini.',
      detalle: error.message || 'Error desconocido',
    });
  }
};

// ─── GET /api/ai/analizar-carga ──────────────────────────
const analizarCargaTrabajo = async (req, res) => {
  try {
    const tareas = await Tarea.find({
      usuario: req.usuario._id,
      estado: { $in: ['pendiente', 'en_progreso'] },
    }).select('titulo prioridad fechaVencimiento estado progreso');

    if (tareas.length === 0) {
      return res.json({
        analisis: '¡No tienes tareas pendientes! Disfruta de tu tiempo libre. 🎉',
      });
    }

    const resumenTareas = tareas.map((t) => ({
      titulo: t.titulo,
      prioridad: t.prioridad,
      diasRestantes: Math.ceil((new Date(t.fechaVencimiento) - new Date()) / (1000 * 60 * 60 * 24)),
      progreso: (t.progreso || 0) + '%',
    }));

    const prompt = `Eres un coach de productividad. Analiza esta carga de trabajo y da recomendaciones en español:

Tareas pendientes del usuario:
${JSON.stringify(resumenTareas, null, 2)}

Proporciona:
1. Una evaluación breve del nivel de carga (1-2 frases).
2. Las 3 tareas más urgentes en las que enfocarse primero.
3. Un consejo de productividad personalizado.

Sé directo, práctico y motivador. Responde en español. Máximo 200 palabras.`;

    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model: MODELO,
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return res.json({
      analisis: response.text,
      totalTareasPendientes: tareas.length,
      modelo: MODELO,
    });
  } catch (error) {
    console.error('❌ ERROR DETALLADO EN GEMINI (analizarCargaTrabajo):', error);
    return res.status(500).json({
      error: 'Error al analizar la carga de trabajo.',
      detalle: error.message || 'Error desconocido',
    });
  }
};

module.exports = {
  sugerirDescripcion,
  generarSubtareas,
  analizarCargaTrabajo,
};