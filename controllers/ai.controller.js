const { GoogleGenerativeAI } = require('@google/generative-ai');
const Tarea = require('../models/Task.model');

// ─── Cliente Google Gemini ────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

// Modelo recomendado por Google para velocidad y tareas de texto:
const MODELO = 'gemini-1.5-flash';

// ─── POST /api/ai/generar-subtareas ──────────────────────
const generarSubtareas = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API Key de Gemini no configurada en el servidor.' });
    }

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
- Si la prioridad es "urgente" o quedan pocos días: genera 5-7 subtareas muy concretas y rápidas
- Si la prioridad es "alta": genera 4-6 subtareas bien definidas
- Si la prioridad es "media": genera 3-5 subtareas equilibradas
- Si la prioridad es "baja": genera 2-4 subtareas generales

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin explicaciones, sin bloques de código):
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

    // Configurar modelo de Gemini especificando tipo de respuesta JSON
    const model = genAI.getGenerativeModel({
      model: MODELO,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const result = await model.generateContent(prompt);
    let contenido = result.response.text().trim();

    // Limpiar posibles etiquetas markdown por seguridad
    contenido = contenido.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    const respuesta = JSON.parse(contenido);

    // Guardar subtareas en la tarea
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
      modelo: MODELO,
    });
  } catch (error) {
    console.error('Error generando subtareas con Gemini:', error?.message || error);
    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: 'Error procesando el formato JSON de la IA. Inténtalo de nuevo.' });
    }
    res.status(500).json({ error: 'Error al generar subtareas con IA.' });
  }
};

// ─── GET /api/ai/analizar-carga ──────────────────────────
const analizarCargaTrabajo = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API Key de Gemini no configurada en el servidor.' });
    }

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
      progreso: t.progreso + '%',
    }));

    const prompt = `Eres un coach de productividad. Analiza esta carga de trabajo y da recomendaciones en español:

Tareas pendientes del usuario:
${JSON.stringify(resumenTareas, null, 2)}

Proporciona:
1. Una evaluación breve del nivel de carga (1-2 frases)
2. Las 3 tareas más urgentes en las que enfocarse primero
3. Un consejo de productividad personalizado

Sé directo, práctico y motivador. Responde en español. Máximo 200 palabras.`;

    const model = genAI.getGenerativeModel({
      model: MODELO,
      generationConfig: { temperature: 0.7 },
    });

    const result = await model.generateContent(prompt);

    res.json({
      analisis: result.response.text(),
      totalTareasPendientes: tareas.length,
      modelo: MODELO,
    });
  } catch (error) {
    console.error('Error analizando carga con Gemini:', error?.message || error);
    res.status(500).json({ error: 'Error al analizar la carga de trabajo.' });
  }
};

// ─── POST /api/ai/sugerir-descripcion ───────────────────
const sugerirDescripcion = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API Key de Gemini no configurada en el servidor.' });
    }

    const { titulo, categoria, prioridad } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'El campo "titulo" es obligatorio.' });
    }

    const prompt = `Genera una descripción concisa y profesional para esta tarea:

Título: "${titulo}"
Categoría: ${categoria || 'General'}
Prioridad: ${prioridad || 'media'}

La descripción debe:
- Ser clara y accionable (2-3 oraciones)
- Indicar el objetivo principal
- Mencionar el resultado esperado
- Estar en español

Responde solo con la descripción, sin introducciones, sin comillas, sin texto adicional.`;

    const model = genAI.getGenerativeModel({
      model: MODELO,
      generationConfig: { temperature: 0.6 },
    });

    const result = await model.generateContent(prompt);

    res.json({
      descripcion: result.response.text().trim(),
      modelo: MODELO,
    });
  } catch (error) {
    console.error('Error sugiriendo descripción con Gemini:', error?.message || error);
    res.status(500).json({ error: 'Error al generar la descripción.' });
  }
};

module.exports = { generarSubtareas, analizarCargaTrabajo, sugerirDescripcion };