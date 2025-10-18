// Sistema de Chat com 3 Canais
let usuarioAtual = '';
let amigos = [];
let conversasPrivadas = [];
let canalAtual = 'global';
let conversaPrivadaAtual = null;

// Login
async function fazerLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const mensagem = document.getElementById('mensagem');

    if (!username || !password) {
        mensagem.textContent = "Preencha usuário e senha!";
        mensagem.style.color = "red";
        return;
    }

    try {
        const userDoc = await db.collection('usuarios').doc(username).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.senha === password) {
                loginSucesso(username);
            } else {
                mensagem.textContent = "Senha incorreta!";
                mensagem.style.color = "red";
            }
        } else {
            await db.collection('usuarios').doc(username).set({
                senha: password,
                dataCriacao: new Date(),
                amigos: []
            });
            loginSucesso(username);
        }
    } catch (error) {
        console.error("Erro:", error);
        mensagem.textContent = "Erro ao conectar.";
        mensagem.style.color = "red";
    }
}

function loginSucesso(username) {
    usuarioAtual = username;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';
    document.getElementById('usuario-logado').textContent = username;
    
    carregarAmigos();
    configurarPesquisa();
    carregarConversasPrivadas();
    mudarCanal('global');
}

// Sistema de Canais
function mudarCanal(canal) {
    canalAtual = canal;
    conversaPrivadaAtual = null;
    
    // Atualizar UI dos canais
    document.querySelectorAll('.canal-item').forEach(item => {
        item.classList.remove('ativo');
    });
    document.querySelector(`.canal-item[onclick="mudarCanal('${canal}')"]`).classList.add('ativo');
    
    // Atualizar cabeçalho
    const tituloCanal = document.getElementById('titulo-canal');
    const infoCanal = document.getElementById('info-canal');
    
    switch(canal) {
        case 'global':
            tituloCanal.textContent = '💬 Chat Global';
            infoCanal.textContent = 'Todos os usuários podem ver';
            break;
        case 'grupo':
            tituloCanal.textContent = '👥 Chat do Grupo';
            infoCanal.textContent = 'Apenas amigos podem ver';
            break;
    }
    
    carregarMensagens();
}

// Iniciar conversa privada
function iniciarConversaPrivada(amigoUsername) {
    canalAtual = 'privado';
    conversaPrivadaAtual = amigoUsername;
    
    document.querySelectorAll('.canal-item').forEach(item => {
        item.classList.remove('ativo');
    });
    
    document.getElementById('titulo-canal').textContent = `🔒 ${amigoUsername}`;
    document.getElementById('info-canal').textContent = 'Conversa privada';
    
    carregarMensagens();
}

// Pesquisa de Usuários
function configurarPesquisa() {
    const pesquisaInput = document.getElementById('pesquisa-usuario');
    
    pesquisaInput.addEventListener('input', async function(e) {
        const termo = e.target.value.trim();
        const resultados = document.getElementById('resultados-pesquisa');
        
        if (termo.length < 2) {
            resultados.style.display = 'none';
            return;
        }
        
        try {
            const usuariosRef = await db.collection('usuarios').get();
            const usuariosEncontrados = [];
            
            usuariosRef.forEach(doc => {
                const username = doc.id;
                if (username.toLowerCase().includes(termo.toLowerCase()) && 
                    username !== usuarioAtual) {
                    usuariosEncontrados.push(username);
                }
            });
            
            if (usuariosEncontrados.length > 0) {
                resultados.innerHTML = usuariosEncontrados.map(user => {
                    const jaEhAmigo = amigos.includes(user);
                    return `
                        <div class="usuario-resultado">
                            <span>👤 ${user}</span>
                            <div>
                                ${!jaEhAmigo ? 
                                    `<button class="btn-acao btn-adicionar" onclick="adicionarAmigo('${user}')">
                                        Adicionar
                                    </button>` : ''
                                }
                                <button class="btn-acao btn-privado" onclick="iniciarConversaPrivada('${user}')">
                                    Mensagem
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
                resultados.style.display = 'block';
            } else {
                resultados.innerHTML = '<div class="usuario-resultado">Nenhum usuário encontrado</div>';
                resultados.style.display = 'block';
            }
        } catch (error) {
            console.error("Erro na pesquisa:", error);
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!pesquisaInput.contains(e.target) && !resultados.contains(e.target)) {
            resultados.style.display = 'none';
        }
    });
}

// Sistema de Amizades
async function adicionarAmigo(amigoUsername) {
    try {
        await db.collection('usuarios').doc(usuarioAtual).update({
            amigos: firebase.firestore.FieldValue.arrayUnion(amigoUsername)
        });
        
        document.getElementById('resultados-pesquisa').style.display = 'none';
        document.getElementById('pesquisa-usuario').value = '';
        carregarAmigos();
        
        alert(`✅ ${amigoUsername} adicionado aos amigos!`);
    } catch (error) {
        console.error("Erro ao adicionar amigo:", error);
        alert("Erro ao adicionar amigo.");
    }
}

async function carregarAmigos() {
    try {
        const userDoc = await db.collection('usuarios').doc(usuarioAtual).get();
        if (userDoc.exists) {
            amigos = userDoc.data().amigos || [];
            
            const listaAmigos = document.getElementById('lista-amigos');
            if (amigos.length > 0) {
                listaAmigos.innerHTML = amigos.map(amigo => `
                    <div class="amigo-item" onclick="iniciarConversaPrivada('${amigo}')">
                        <div class="amigo-info">
                            <div class="status-online"></div>
                            <span>${amigo}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                listaAmigos.innerHTML = '<div style="color: #666; text-align: center;">Nenhum amigo ainda</div>';
            }
        }
    } catch (error) {
        console.error("Erro ao carregar amigos:", error);
    }
}

// Conversas Privadas
async function carregarConversasPrivadas() {
    try {
        // Buscar conversas onde o usuário atual participa
        const conversasSnapshot = await db.collection('mensagens')
            .where('tipo', '==', 'privada')
            .where('participantes', 'array-contains', usuarioAtual)
            .get();
        
        const usuariosConversados = new Set();
        
        conversasSnapshot.forEach(doc => {
            const msg = doc.data();
            if (msg.usuario !== usuarioAtual) {
                usuariosConversados.add(msg.usuario);
            }
            // Também verificar outros participantes
            if (msg.participantes) {
                msg.participantes.forEach(participante => {
                    if (participante !== usuarioAtual) {
                        usuariosConversados.add(participante);
                    }
                });
            }
        });
        
        conversasPrivadas = Array.from(usuariosConversados);
        
        const listaConversas = document.getElementById('lista-conversas');
        if (conversasPrivadas.length > 0) {
            listaConversas.innerHTML = conversasPrivadas.map(user => `
                <div class="conversa-item" onclick="iniciarConversaPrivada('${user}')">
                    <span>🔒 ${user}</span>
                </div>
            `).join('');
        } else {
            listaConversas.innerHTML = '<div style="color: #666; text-align: center;">Nenhuma conversa</div>';
        }
    } catch (error) {
        console.error("Erro ao carregar conversas:", error);
    }
}

// Sistema de Mensagens Multi-Canais
function enviarMensagem() {
    const input = document.getElementById('mensagem-input');
    const texto = input.value.trim();

    if (!texto || !usuarioAtual) return;

    let mensagemData = {
        usuario: usuarioAtual,
        texto: texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        tipo: canalAtual
    };

    // Configurar baseado no canal
    switch(canalAtual) {
        case 'global':
            // Todos podem ver - sem restrições
            break;
            
        case 'grupo':
            // Apenas amigos podem ver
            mensagemData.visivelPara = [usuarioAtual, ...amigos];
            break;
            
        case 'privado':
            // Conversa entre duas pessoas
            mensagemData.tipo = 'privada';
            mensagemData.participantes = [usuarioAtual, conversaPrivadaAtual];
            mensagemData.visivelPara = [usuarioAtual, conversaPrivadaAtual];
            break;
    }

    db.collection('mensagens').add(mensagemData)
        .then(() => {
            input.value = '';
            if (canalAtual === 'privada') {
                carregarConversasPrivadas();
            }
        })
        .catch(error => {
            console.error("Erro ao enviar:", error);
        });
}

function carregarMensagens() {
    let mensagensQuery;
    
    switch(canalAtual) {
        case 'global':
            mensagensQuery = db.collection('mensagens')
                .where('tipo', '==', 'global')
                .orderBy('timestamp', 'asc');
            break;
            
        case 'grupo':
            mensagensQuery = db.collection('mensagens')
                .where('tipo', '==', 'grupo')
                .where('visivelPara', 'array-contains', usuarioAtual)
                .orderBy('timestamp', 'asc');
            break;
            
        case 'privado':
            mensagensQuery = db.collection('mensagens')
                .where('tipo', '==', 'privada')
                .where('participantes', 'array-contains', usuarioAtual)
                .orderBy('timestamp', 'asc');
            break;
    }

    mensagensQuery.onSnapshot(snapshot => {
        const container = document.getElementById('mensagens');
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            const msg = doc.data();
            
            // Para conversas privadas, filtrar apenas as entre os dois usuários
            if (canalAtual === 'privado' && conversaPrivadaAtual) {
                if (!msg.participantes || 
                    !msg.participantes.includes(conversaPrivadaAtual) ||
                    !msg.participantes.includes(usuarioAtual)) {
                    return; // Pular mensagem se não for entre esses dois usuários
                }
            }
            
            const div = document.createElement('div');
            div.className = `mensagem-item mensagem-${msg.tipo} ${msg.usuario === usuarioAtual ? 'minha-mensagem' : ''}`;
            
            let hora = 'Agora';
            if (msg.timestamp) {
                hora = msg.timestamp.toDate().toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            let tipoBadge = '';
            switch(msg.tipo) {
                case 'global': tipoBadge = '🌐 Global'; break;
                case 'grupo': tipoBadge = '👥 Grupo'; break;
                case 'privada': tipoBadge = '🔒 Privado'; break;
            }
            
            div.innerHTML = `
                <div class="mensagem-header">
                    <div>
                        <strong>${msg.usuario}</strong>
                        <span class="tipo-mensagem">${tipoBadge}</span>
                    </div>
                    <small>${hora}</small>
                </div>
                <div class="mensagem-texto">${msg.texto}</div>
                ${msg.usuario === usuarioAtual ? 
                    `<button class="btn-apagar" onclick="apagarMensagem('${doc.id}')">×</button>` : ''
                }
            `;
            
            container.appendChild(div);
        });
        
        container.scrollTop = container.scrollHeight;
    });
}

// Apagar Mensagem
async function apagarMensagem(mensagemId) {
    if (confirm("Tem certeza que quer apagar esta mensagem?")) {
        try {
            await db.collection('mensagens').doc(mensagemId).delete();
        } catch (error) {
            console.error("Erro ao apagar mensagem:", error);
            alert("Erro ao apagar mensagem.");
        }
    }
}

function sair() {
    if (confirm("Sair do chat?")) {
        usuarioAtual = '';
        document.getElementById('chat-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('mensagem').textContent = '';
    }
}

// Event Listeners
document.getElementById('mensagem-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') enviarMensagem();
});

document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') fazerLogin();
});