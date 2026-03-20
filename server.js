const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CHATWOOT_URL = process.env.CHATWOOT_URL;
const ACCOUNT_ID = process.env.ACCOUNT_ID;
const API_TOKEN = process.env.CHATWOOT_API_TOKEN;

// ═══════════════════════════════════════════════════════════
// CORS + JSON HELPERS (Seu Padrão)
// ═══════════════════════════════════════════════════════════
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function json(res, data, status = 200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ═══════════════════════════════════════════════════════════
// STATIC FILES (Seu Padrão)
// ═══════════════════════════════════════════════════════════
const MIME = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml' };

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const full = path.join(__dirname, 'public', filePath);
  if (!fs.existsSync(full)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
  fs.createReadStream(full).pipe(res);
}

// ═══════════════════════════════════════════════════════════
// API ROUTES (Lógica de Interação com o Chatwoot)
// ═══════════════════════════════════════════════════════════
async function handleAPI(req, res, url, method) {
  cors(res);
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // GET /api/conversations/participating/:userId
  const match = url.match(/^\/api\/conversations\/participating\/(.+)$/);
  
  if (match && method === 'GET') {
    const userId = match[1];

    if (!CHATWOOT_URL || !API_TOKEN || !ACCOUNT_ID) {
      return json(res, { error: 'Variáveis de ambiente do Chatwoot não configuradas no servidor.' }, 500);
    }

    try {
      // 1. Busca todas as conversas abertas usando o fetch nativo do Node 20
      const convRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations?status=open`, {
        headers: { 'api_access_token': API_TOKEN }
      });
      
      if (!convRes.ok) throw new Error('Falha ao comunicar com a API do Chatwoot');
      const convData = await convRes.json();
      const allConversations = convData.data?.payload || [];

      const participatingConversations = [];

      // 2. Verifica os participantes em paralelo
      await Promise.all(allConversations.map(async (conv) => {
        const partRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conv.id}/participants`, {
          headers: { 'api_access_token': API_TOKEN }
        });
        
        const participants = await partRes.json();
        const isParticipant = participants.some(p => String(p.id) === String(userId));
        
        if (isParticipant) {
          participatingConversations.push({
            id: conv.id,
            contact: conv.meta.sender.name,
            lastMessage: conv.messages[0]?.content || 'Mídia / Anexo',
            url: `/app/accounts/${ACCOUNT_ID}/conversations/${conv.id}`
          });
        }
      }));

      return json(res, participatingConversations);
      
    } catch (err) {
      console.error('[CHATWOOT API ERROR]', err);
      return json(res, { error: 'Failed to fetch conversations' }, 500);
    }
  }

  json(res, { error: 'Not found' }, 404);
}

// ═══════════════════════════════════════════════════════════
// HTTP SERVER (Seu Padrão)
// ═══════════════════════════════════════════════════════════
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const method = req.method;

  try {
    if (url.startsWith('/api/')) {
      await handleAPI(req, res, url, method);
    } else if (url === '/' || url === '/index.html') {
      serveStatic(res, 'index.html');
    } else {
      serveStatic(res, url); // Serve widget.js, style.css, etc.
    }
  } catch (err) {
    console.error('[SERVER ERROR]', err);
    json(res, { error: err.message }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`[BRK Participating Inbox] Running on port ${PORT}`);
});
