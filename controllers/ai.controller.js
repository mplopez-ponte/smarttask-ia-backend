const Tarea = require('../models/Task.model');

const DUCK_MODEL = 'gpt-4o-mini';
const DUCK_STATUS_URL = 'https://duckduckgo.com/duckchat/v1/status';
const DUCK_CHAT_URL   = 'https://duckduckgo.com/duckchat/v1/chat';

// Headers que imitan un navegador real de forma precisa
const getHeaders = (vqd = null) => {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/event-stream',
    'Accept-Language': 'es-ES,es;q=0.9',
    'Referer': 'https://duckduckgo.com/',
    'Origin': 'https://duckduckgo.com',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'x-vqd-accept': '1',
  };
  if (vqd) headers['x-vqd-4'] = vqd;
  return headers;
};

/**
 * Obtiene el token VQD con lógica de reintento
 */
async function getVqdToken() {
  try {
    // Pedimos la página principal, que suele estar menos vigilada que el endpoint /status
    const res = await fetch(`https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&nc=${Date.now()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });

    const text = await res.text();
    // Buscamos la variable vqd="TOKEN" dentro del código fuente de la página
    const match = text.match(/vqd=["']([^"']+)["']/);
    
    if (!match || !match[1]) {
      throw new Error('Bloqueo total de IP en Railway por parte de DuckDuckGo');
    }

    return match[1];
  } catch (err) {
    console.error(' [!] Error crítico:', err.message);
    throw err;
  }
}

/**
 * Chat con Duck.ai optimizado para Railway
 */
async function duckChat(userPrompt) {
  try {
    const vqd = await getVqdToken();
    const res = await fetch(DUCK_CHAT_URL, {
      method: 'POST',
      headers: getHeaders(vqd),
      body: JSON.stringify({
        model: DUCK_MODEL,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) throw new Error(`Status ${res.status}`);

    const raw = await res.text();
    let fullText = '';

    raw.split('\n').forEach(line => {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          fullText += json.message || '';
        } catch (e) {}
      }
    });

    return fullText.trim();
  } catch (error) {
    console.error(' [!] Error crítico en comunicación con Duck.ai:', error.message);
    throw error;
  }
}

// --- CONTROLADORES ---

const generarSubtareas = async (req, res) => {
  try {
    const { tareaId } = req.body;
    const tarea = await Tarea.findOne({ _id: tareaId, usuario: req.usuario._id });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const prompt = `Actúa como asistente de productividad. Tarea: "${tarea.titulo}". Genera un JSON: {"subtareas": [{"titulo": "...", "descripcion": "...", "orden": 1}], "consejo": "..."}. Responde SOLO el JSON.`;

    const response = await duckChat(prompt);
    // Limpieza de Markdown
    const cleanJson = response.replace(/```json|```/gi, '').trim();
    const data = JSON.parse(cleanJson);

    tarea.subtareas = data.subtareas.map((s, i) => ({ ...s, completada: false, orden: s.orden || i + 1 }));
    tarea.subtareasGeneradasPorIA = true;
    await tarea.save();

    res.json({ mensaje: 'Éxito', subtareas: tarea.subtareas, consejo: data.consejo });
  } catch (error) {
    res.status(500).json({ error: 'La IA está saturada. Inténtalo en un momento.' });
  }
};

const analizarCargaTrabajo = async (req, res) => {
  try {
    const tareas = await Tarea.find({ usuario: req.usuario._id, estado: { $in: ['pendiente', 'en_progreso'] } });
    if (!tareas.length) return res.json({ analisis: 'Sin tareas pendientes.' });

    const prompt = `Analiza estas tareas y da consejos breves en español: ${JSON.stringify(tareas.map(t => t.titulo))}`;
    const analisis = await duckChat(prompt);

    res.json({ analisis, totalTareasPendientes: tareas.length });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo obtener el análisis de IA.' });
  }
};

const sugerirDescripcion = async (req, res) => {
  try {
    const { titulo } = req.body;
    const desc = await duckChat(`Escribe una descripción de 2 líneas para: "${titulo}". Solo el texto.`);
    res.json({ descripcion: desc });
  } catch (error) {
    res.status(500).json({ error: 'Error al sugerir descripción.' });
  }
};

module.exports = { generarSubtareas, analizarCargaTrabajo, sugerirDescripcion };