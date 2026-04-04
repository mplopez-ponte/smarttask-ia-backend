const OpenAI = require('openai');
const Tarea = require('../models/Task.model');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── POST /api/ai/generar-subtareas ──────────────────────
const generarSubtareas = async (req, res) => {
  try {
    const { tareaId } = req.body;

    const tarea = await Tarea.findOne({ _id: tareaId, usuario: req.usuario._id });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

    // Calcular días restantes
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const respuesta = JSON.parse(completion.choices[0].message.content);

    // Guardar subtareas en la tarea
    tarea.subtareas = respuesta.subtareas.map((s, i) => ({
      titulo: s.titulo,
      descripcion: s.descripcion,
      completada: false,
      orden: s.orden || i + 1
    }));
    tarea.subtareasGeneradasPorIA = true;
    await tarea.save();

    res.json({
      mensaje: 'Subtareas generadas por IA correctamente.',
      subtareas: tarea.subtareas,
      consejo: respuesta.consejo,
      tokensUsados: completion.usage.total_tokens
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
      estado: { $in: ['pendiente', 'en_progreso'] }
    }).select('titulo prioridad fechaVencimiento estado progreso');

    if (tareas.length === 0) {
      return res.json({ analisis: '¡No tienes tareas pendientes! Disfruta de tu tiempo libre. 🎉' });
    }

    const resumenTareas = tareas.map(t => ({
      titulo: t.titulo,
      prioridad: t.prioridad,
      diasRestantes: Math.ceil((t.fechaVencimiento - new Date()) / (1000 * 60 * 60 * 24)),
      progreso: t.progreso + '%'
    }));

    const prompt = `Eres un coach de productividad. Analiza esta carga de trabajo y da recomendaciones:

Tareas pendientes:
${JSON.stringify(resumenTareas, null, 2)}

Proporciona:
1. Una evaluación breve del nivel de carga (1-2 frases)
2. Las 3 tareas más urgentes en las que enfocarse primero
3. Un consejo de productividad personalizado

Sé directo, práctico y motivador. Responde en español, máximo 200 palabras.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 400
    });

    res.json({
      analisis: completion.choices[0].message.content,
      totalTareasPendientes: tareas.length
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    });

    res.json({ descripcion: completion.choices[0].message.content.trim() });
  } catch (error) {
      console.error('Error sugerirDescripcion:', error.message); // ← añade esto
    res.status(500).json({ error: 'Error al generar la descripción.' });
  }
};

module.exports = { generarSubtareas, analizarCargaTrabajo, sugerirDescripcion };
