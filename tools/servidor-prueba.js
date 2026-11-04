// Servidor de prueba local: ejecuta apps-script/Code.gs con una hoja simulada en memoria.
// Sirve para probar la sincronización y la IA de principio a fin sin tocar tu Google Sheets.
// Uso: node tools/servidor-prueba.js  → URL http://127.0.0.1:8790/exec  (el token se muestra al arrancar)
import http from 'node:http';
import { makeEnv } from '../tests/gas-mock.js';

const PORT = Number(process.env.PORT || 8790);
// Gemini simulado: el primer modelo está "saturado" y el de reserva responde.
const env = makeEnv({
  geminiResponder: (url) => {
    if (url.includes('/models?')) return { code: 200, body: { models: [{ name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] }] } };
    if (url.includes('gemini-flash-latest:')) return { code: 503, body: { error: { message: 'The model is overloaded. Please try again later.' } } };
    return { code: 200, body: { candidates: [{ content: { parts: [{ text: JSON.stringify({ ok: true, saludo: 'Hola desde el modelo de reserva', ideas: [{ title: 'Idea de prueba generada', problem: 'Problema de ejemplo', objective: 'confianza', contentType: 'familiaridad', format: 'lista' }] }) }] }, finishReason: 'STOP' }], usageMetadata: { totalTokenCount: 50 } } };
  },
});
env.props.set('GEMINI_API_KEY', 'clave-simulada');
const token = env.ctx.instalar();

http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  if (req.method === 'GET') { res.writeHead(200, cors); res.end(env.ctx.doGet().text); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const out = env.ctx.doPost({ postData: { contents: body } }).text;
    res.writeHead(200, cors); res.end(out);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`SERVIDOR_LISTO http://127.0.0.1:${PORT}/exec`);
  console.log(`TOKEN ${token}`);
});
