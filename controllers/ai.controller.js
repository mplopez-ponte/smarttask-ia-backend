const { GoogleGenerativeAI } = require('@google/generative-ai');

const sugerirDescripcion = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Validar que exista la API Key en Railway
    if (!apiKey) {
      console.error('❌ ERROR BACKEND: La variable GEMINI_API_KEY no está definida en el entorno.');
      return res.status(500).json({ 
        error: 'API Key de Gemini no configurada en las variables de entorno de Railway.' 
      });
    }

    const { titulo, categoria, prioridad } = req.body;

    // 2. Validar que llegue el título desde el Frontend
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'El campo "titulo" es obligatorio.' });
    }

    // 3. Inicializar SDK de Google Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Genera una descripción concisa, útil y profesional para esta tarea:
Título: "${titulo}"
Categoría: ${categoria || 'General'}
Prioridad: ${prioridad || 'media'}

Mantenla en 2 o 3 oraciones cortas en español. Responde ÚNICAMENTE con el texto de la descripción.`;

    const result = await model.generateContent(prompt);
    const descripcionText = result.response.text().trim();

    return res.json({
      descripcion: descripcionText,
      modelo: 'gemini-1.5-flash'
    });

  } catch (error) {
    // Imprime la traza completa en los Logs de Railway para depuración
    console.error('❌ ERROR EN DETALLE DE GEMINI:', error);

    return res.status(500).json({ 
      error: 'Error al comunicarse con la IA de Gemini', 
      detalle: error.message 
    });
  }
};

module.exports = { sugerirDescripcion };