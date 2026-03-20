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

  // GET /api/conversations/participating
  const match = url.match(/^\/api\/conversations\/participating\/?(.*)$/);
  
  if (match && method === 'GET') {
    const uToken = req.headers['x-user-token'];
    const uClient = req.headers['x-user-client'];
    const uUid = req.headers['x-user-uid'];

    if (!CHATWOOT_URL || !ACCOUNT_ID || !uToken) {
      return json(res, { error: 'Autenticação de usuário ou CHATWOOT_URL pendente.' }, 401);
    }

    try {
      let page = 1;
      let hasMore = true;
      let allConversations = [];

      // 1. Loop infinito seguro para varrer todas as páginas de participação do usuário
      while (hasMore) {
        const convRes = await fetch(`${CHATWOOT_URL.replace(/\/$/, "")}/api/v1/accounts/${ACCOUNT_ID}/conversations?status=open&conversation_type=participating&page=${page}`, {
          headers: { 'access-token': uToken, 'client': uClient, 'uid': uUid }
        });
        
        if (!convRes.ok) throw new Error(`Falha ao comunicar com a API na página ${page}`);
        const convData = await convRes.json();
        const payload = convData.data?.payload || [];
        
        allConversations = allConversations.concat(payload);
        
        // Se a página retornou menos de 25 itens (que é o limite padrão do Chatwoot), significa que chegamos na última página!
        if (payload.length < 25) {
          hasMore = false;
        } else {
          page++;
          // Proteção contra chamadas infinitas caso o usuário tenha mais de 100 páginas (2500 tickets de participação)
          if (page > 100) hasMore = false; 
        }
      }

      // Mapeia e sanitiza as conversas para o Widget
      const participatingConversations = allConversations.map(conv => ({
          id: conv.id,
          contact: conv.meta.sender.name,
          lastMessage: conv.messages[0]?.content || 'Mídia / Anexo',
          url: `/app/accounts/${ACCOUNT_ID}/conversations/${conv.id}`
      }));

      return json(res, participatingConversations);
      
    } catch (err) {
      console.error('[CHATWOOT PASS-THROUGH ERROR]', err);
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
