document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('list');
    const badgeEl = document.getElementById('badge-count');

    window.addEventListener('message', async (e) => {
        if (e.data && e.data.action === 'init_auth' && e.data.auth) {
            const auth = e.data.auth;
            window.currentAuth = auth; // Salva para funções secundárias
            
            try {
                // Chama nossa API node repassando a credencial do Chatwoot do usuário logado
                const response = await fetch(`/api/conversations/participating`, {
                    headers: {
                        'x-user-token': auth['access-token'],
                        'x-user-client': auth['client'],
                        'x-user-uid': auth['uid']
                    }
                });
                
                if (!response.ok) throw new Error('API Error');
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
                    <div class="table-row" id="row-${conv.id}">
                        <div class="conv-id">#${conv.id}</div>
                        <div style="min-width:0">
                            <div class="conv-contact">${conv.contact}</div>
                            <div class="conv-snippet">${conv.lastMessage}</div>
                        </div>
                        <div style="text-align:right; display: flex; justify-content: flex-end; gap: 8px;">
                            <button onclick="removeParticipant(${conv.id})" class="btn" style="background:transparent; color:#ef4444; border:1px solid #fca5a5; padding: 4px 8px; font-size: 11px;">Sair</button>
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
                        <div class="sub">Falha ao buscar dados na API Autenticada.</div>
                    </div>`;
                badgeEl.textContent = 'Erro';
            }
        }
    });
});

window.removeParticipant = async function(convId) {
    if (!confirm('Tem certeza que deseja PARAR DE PARTICIPAR desta conversa? Ela sumirá da sua lista.')) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    try {
        const response = await fetch(`/api/conversations/${convId}/participating/${userId}`, {
            method: 'DELETE',
            headers: {
                'x-user-token': window.currentAuth['access-token'],
                'x-user-client': window.currentAuth['client'],
                'x-user-uid': window.currentAuth['uid']
            }
        });
        
        if (response.ok) {
            document.getElementById(`row-${convId}`).remove();
            let badge = document.getElementById('badge-count');
            let num = parseInt(badge.textContent);
            if(!isNaN(num) && num > 0) badge.textContent = (num - 1) + " conversas";
        } else {
            alert('Ocorreu um erro ao tentar sair da conversa.');
        }
    } catch (e) {
        alert('Erro de conexão com o servidor ao remover.');
    }
}
