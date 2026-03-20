document.addEventListener('DOMContentLoaded', async () => {
    // Captura o ID do usuário passado via URL pelo iFrame do Chatwoot (ex: ?userId=15)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    const listEl = document.getElementById('list');
    const badgeEl = document.getElementById('badge-count');

    if (!userId) {
        listEl.innerHTML = `
            <div class="empty">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div class="title">Usuário não logado</div>
                <div class="sub">Não foi possível carregar as conversas da API. Verifique a autenticação.</div>
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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    <div class="title">Você está em dia!</div>
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
                    <button onclick="window.parent.postMessage({action:'brk_navigate', url:'${conv.url}'}, '*')" class="btn btn-primary">Acompanhar</button>
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
