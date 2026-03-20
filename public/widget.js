document.addEventListener('DOMContentLoaded', async () => {
    // Captura o ID do usuário passado via URL pelo iFrame do Chatwoot (ex: ?userId=15)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    const listEl = document.getElementById('list');
    const badgeEl = document.getElementById('badge-count');

    if (!userId) {
        listEl.innerHTML = `
            <div class="empty">
                <div class="icon">⚠️</div>
                <div class="title">Usuário não identificado</div>
                <div class="sub">Não foi possível carregar as conversas. Atualize o painel do Chatwoot.</div>
            </div>`;
        badgeEl.textContent = 'Erro';
        return;
    }

    try {
        // Faz a chamada para a nossa própria API segura no server.js
        const response = await fetch(`/api/conversations/participating/${userId}`);
        const data = await response.json();
        
        badgeEl.textContent = `${data.length} conversas`;

        if (data.length === 0) {
            listEl.innerHTML = `
                <div class="empty">
                    <div class="icon">📭</div>
                    <div class="title">Caixa limpa!</div>
                    <div class="sub">Você não está participando de nenhuma conversa aberta no momento.</div>
                </div>`;
            return;
        }

        // Cabeçalho da tabela
        let html = '<div class="table-header"><span>TICKET</span><span>CONTATO & MENSAGEM</span><span style="text-align:right">AÇÃO</span></div>';

        // Desenha as linhas da tabela
        data.forEach(conv => {
            html += `
            <div class="table-row">
                <div class="conv-id">#${conv.id}</div>
                <div style="min-width:0">
                    <div class="conv-contact">${conv.contact}</div>
                    <div class="conv-snippet">${conv.lastMessage}</div>
                </div>
                <div style="text-align:right">
                    <a href="${conv.url}" target="_parent" class="btn btn-primary">Acompanhar</a>
                </div>
            </div>`;
        });

        listEl.innerHTML = html;

    } catch (error) {
        console.error('Falha ao carregar as conversas:', error);
        listEl.innerHTML = `
            <div class="empty">
                <div class="icon">❌</div>
                <div class="title">Erro de conexão</div>
                <div class="sub">Falha ao buscar dados na API. Verifique os logs do servidor.</div>
            </div>`;
        badgeEl.textContent = 'Erro';
    }
});
