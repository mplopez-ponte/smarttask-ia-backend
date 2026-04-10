const Tarea = require('../models/Task.model');

/**
 * Función central para conectar con Groq Cloud.
 * Usamos Llama 3.3 70B por su excelente equilibrio entre razonamiento y velocidad.
 */
async function groqChat(userPrompt, isJson = false) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('La variable GROQ_API_KEY no está configurada en Railway.');
    }

    const payload = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Eres un asistente experto en productividad para la aplicación SmartTask IA. " +
                   (isJson ? "Responde exclusivamente en formato JSON válido." : "Responde de forma concisa y motivadora en español.")
        },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    };

    // Si esperamos un JSON, forzamos el modo respuesta de Groq
    if (isJson) {
      payload.response_format = { type: "json_object" };
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Groq API Error: ${errorData.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(' [!] Error en comunicación con Groq:', error.message);
    throw error;
  }
}

// ─── CONTROLADORES ──────────────────────────────────────────

/**
 * POST /api/ai/generar-subtareas
 */
const generarSubtareas = async (req, res) => {
  try {
    const { tareaId } = req.body;
    const tarea = await Tarea.findOne({ _id: tareaId, usuario: req.usuario._id });

    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const prompt = `Analiza la tarea: "${tarea.titulo}". Descripción: ${tarea.descripcion || 'N/A'}. 
    Prioridad: ${tarea.prioridad}. 
    Genera un JSON con este formato exacto: 
    {
      "subtareas": [{"titulo": "nombre", "descripcion": "acción", "orden": 1}],
      "consejo": "frase corta motivadora"
    }`;

    const rawResponse = await groqChat(prompt, true);
    const data = JSON.parse(rawResponse);

    tarea.subtareas = data.subtareas.map((s, i) => ({
      titulo: s.titulo,
      descripcion: s.descripcion,
      completada: false,
      orden: s.orden || i + 1
    }));
    tarea.subtareasGeneradasPorIA = true;
    
    await tarea.save();

    res.json({
      mensaje: 'Subtareas generadas con éxito',
      subtareas: tarea.subtareas,
      consejo: data.consejo
    });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron generar subtareas. Revisa la API Key.' });
  }
};

/**
 * POST /api/ai/analizar-carga
 */
const analizarCargaTrabajo = async (req, res) => {
  try {
    const tareas = await Tarea.find({
      usuario: req.usuario._id,
      estado: { $in: ['pendiente', 'en_progreso'] }
    }).select('titulo prioridad');

    if (tareas.length === 0) {
      return res.json({ analisis: '¡Bandeja de entrada vacía! Es un buen momento para planificar.' });
    }

    const prompt = `Analiza mi carga de trabajo actual: ${JSON.stringify(tareas)}. 
    Dime brevemente (máximo 100 palabras) qué debería priorizar hoy y dame un consejo de coach de productividad.`;

    const analisis = await groqChat(prompt);

    res.json({
      analisis,
      totalTareasPendientes: tareas.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al analizar la carga de trabajo.' });
  }
};

/**
 * POST /api/ai/sugerir-descripcion
 */
const sugerirDescripcion = async (req, res) => {
  try {
    const { titulo, categoria } = req.body;
    const prompt = `Escribe una descripción profesional de máximo 2 oraciones para la tarea: "${titulo}" en la categoría "${categoria}".`;

    const descripcion = await groqChat(prompt);

    res.json({ descripcion: descripcion.trim() });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar la descripción sugerida.' });
  }
};

module.exports = { generarSubtareas, analizarCargaTrabajo, sugerirDescripcion };