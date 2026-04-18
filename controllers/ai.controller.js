const Groq = require('groq-sdk');
const Tarea = require('../models/Task.model');

// ─── Cliente Groq (compatible con API de OpenAI) ──────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Modelo a usar — opciones gratuitas disponibles en Groq:
//   'llama-3.1-8b-instant'   → más rápido, ideal para subtareas
//   'llama-3.3-70b-versatile' → más potente, mejor razonamiento
//   'mixtral-8x7b-32768'      → contexto largo
const MODELO = 'llama-3.3-70b-versatile';

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

    const completion = await groq.chat.completions.create({
      model: MODELO,
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente de gestión de tareas. Responde siempre con JSON válido y nada más. Sin markdown, sin bloques de código, sin texto adicional antes o después del JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    // Limpiar posibles bloques de código markdown que algunos modelos añaden
    let contenido = completion.choices[0].message.content.trim();
    contenido = contenido.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    const respuesta = JSON.parse(contenido);

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
      modelo: MODELO,
      tokensUsados: completion.usage?.total_tokens || 0
    });
  } catch (error) {
    console.error('Error generando subtareas con Groq:', error?.message || error);
    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: 'Error procesando la respuesta de la IA. Inténtalo de nuevo.' });
    }
    if (error?.status === 401) {
      return res.status(500).json({ error: 'API key de Groq inválida. Verifica la variable GROQ_API_KEY.' });
    }
    if (error?.status === 429) {
      return res.status(429).json({ error: 'Límite de la API de Groq alcanzado. Espera un momento.' });
    }
    res.status(500).json({ error: 'Error al generar subtareas con IA.' });
  }
};

// ─── GET /api/ai/analizar-carga ──────────────────────────
const analizarCargaTrabajo = async (req, res) => {
  try {
    const tareas = await Tarea.find({
      usuario: req.usuario._id,
      estado: { $in: ['pendiente', 'en_progreso'] }
    }).select('titulo prioridad fechaVencimiento estado progreso');

    if (tareas.length === 0) {
      return res.json({
        analisis: '¡No tienes tareas pendientes! Disfruta de tu tiempo libre. 🎉'
      });
    }

    const resumenTareas = tareas.map(t => ({
      titulo: t.titulo,
      prioridad: t.prioridad,
      diasRestantes: Math.ceil((t.fechaVencimiento - new Date()) / (1000 * 60 * 60 * 24)),
      progreso: t.progreso + '%'
    }));

    const prompt = `Eres un coach de productividad. Analiza esta carga de trabajo y da recomendaciones en español:

Tareas pendientes del usuario:
${JSON.stringify(resumenTareas, null, 2)}

Proporciona:
1. Una evaluación breve del nivel de carga (1-2 frases)
2. Las 3 tareas más urgentes en las que enfocarse primero
3. Un consejo de productividad personalizado

Sé directo, práctico y motivador. Responde en español. Máximo 200 palabras.`;

    const completion = await groq.chat.completions.create({
      model: MODELO,
      messages: [
        {
          role: 'system',
          content: 'Eres un coach de productividad experto. Respondes siempre en español de forma clara, práctica y motivadora.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 512,
    });

    res.json({
      analisis: completion.choices[0].message.content,
      totalTareasPendientes: tareas.length,
      modelo: MODELO
    });
  } catch (error) {
    console.error('Error analizando carga con Groq:', error?.message || error);
    if (error?.status === 401) {
      return res.status(500).json({ error: 'API key de Groq inválida. Verifica la variable GROQ_API_KEY.' });
    }
    if (error?.status === 429) {
      return res.status(429).json({ error: 'Límite de la API de Groq alcanzado. Espera un momento.' });
    }
    res.status(500).json({ error: 'Error al analizar la carga de trabajo.' });
  }
};

// ─── POST /api/ai/sugerir-descripcion ───────────────────
const sugerirDescripcion = async (req, res) => {
  try {
    const { titulo, categoria, prioridad } = req.body;

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

    const completion = await groq.chat.completions.create({
      model: MODELO,
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente de gestión de proyectos. Generas descripciones profesionales y concisas en español. Respondes únicamente con la descripción solicitada, sin texto adicional.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    res.json({
      descripcion: completion.choices[0].message.content.trim(),
      modelo: MODELO
    });
  } catch (error) {
    console.error('Error sugiriendo descripción con Groq:', error?.message || error);
    if (error?.status === 401) {
      return res.status(500).json({ error: 'API key de Groq inválida. Verifica la variable GROQ_API_KEY.' });
    }
    res.status(500).json({ error: 'Error al generar la descripción.' });
  }
};

module.exports = { generarSubtareas, analizarCargaTrabajo, sugerirDescripcion };