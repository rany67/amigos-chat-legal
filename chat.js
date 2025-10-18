// Sistema de Chat - Versão Estável
let usuarioAtual = '';
let amigos = [];
let canalAtual = 'global';
let conversaPrivadaAtual = null;

// Login
async function fazerLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const mensagem = document.getElementById('mensagem');

    if (!username || !password) {
        mostrarMensagem("Preencha usuário e senha!", "red");
        return;
    }

    try {
        const userDoc = await db.collection('usuarios').doc(username).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.senha === password) {
                loginSucesso(username);
            } else {
                mostrarMensagem("Senha incorreta!", "red");
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
        mostrarMensagem("Erro ao conectar. Tente novamente.", "red");
    }
}

function mostrarMensagem(texto, cor) {
    const mensagem = document.getElementById('mensagem');
    mensagem.textContent = texto;
    mensagem.style.color = cor;
}

function loginSucesso(username) {
    usuarioAtual = username;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';
    document.getElementById('usuario-logado').textContent = username;
    
    carregarAmigos();
    configurarPesquisa();
    mudarCanal('global');
}

// Sistema de Canais
function mudarCanal(canal) {
    canalAtual = canal;
    conversaPrivadaAtual = null;
    
    document.querySelectorAll('.canal-item').forEach(item => {
        item.classList.remove('ativo');
    });
    event.target.classList.add('ativo');
    
    const tituloCanal = document.getElementById('titulo-canal');
    const infoCanal = document.getElementById('info-canal');
    
    if (canal === 'global') {
        tituloCanal.textContent = '💬 Chat Global';
        infoCanal.textContent = 'Todos os usuários podem ver';
    } else if (canal === 'grupo') {
        tituloCanal.textContent = '👥 Chat do Grupo';
        infoCanal.textContent = 'Apenas amigos podem ver';
    }
    
    carregarMensagens();
}

// Pesquisa
function configurarPesquisa() {
    const pesquisaInput = document.getElementById('pesquisa-usuario');
    const resultados = document.getElementById('resultados-pesquisa');
    
    pesquisaInput.addEventListener('input', async function(e) {
        const termo = e.target.value.trim();
        
        if (termo.length < 2) {
            resultados.style.display = 'none';
            return;
        }
        
        try {
            const usuariosRef = await db.collection('usuarios').get();
            const usuariosEncontrados = [];
            
            usuariosRef.forEach(doc => {
                const username = doc.id;
                if (username.toLowerCase().includes(termo.toLowerCase()) && username !== usuarioAtual) {
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
                                ${!jaEhAmigo ? `<button class="btn-acao btn-adicionar" onclick="adicionarAmigo('${user}')">Add</button>` : ''}
                                <button class="btn-acao btn-privado" onclick="iniciarConversaPrivada('${user}')">Msg</button>
                            </div>
                        </div>
                    `;
                }).join('');
                resultados.style.display = 'block';
            } else {
                resultados.innerHTML = '<div class="usuario-resultado">Nenhum usuário</div>';
                resultados.style.display = 'block';
            }
        } catch (error) {
            console.error("Erro na pesquisa:", error);
        }
    });
}

// Amigos
async function adicionarAmigo(amigoUsername) {
    try {
        await db.collection('usuarios').doc(usuarioAtual).update({
            amigos: firebase.firestore.FieldValue.arrayUnion(amigoUsername)
        });
        
        document.getElementById('resultados-pesquisa').style.display = 'none';
        document.getElementById('pesquisa-usuario').value = '';
        carregarAmigos();
        alert(`✅ ${amigoUsername} adicionado!`);
    } catch (error) {
        console.error("Erro:", error);
        alert("Erro ao adicionar.");
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
                        <span>👤 ${amigo}</span>
                    </div>
                `).join('');
            } else {
                listaAmigos.innerHTML = '<div style="color: #666; text-align: center;">Nenhum amigo</div>';
            }
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

// Conversas Privadas
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

// Mensagens
function carregarMensagens() {
    db.collection('mensagens')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            const container = document.getElementById('mensagens');
            container.innerHTML = '';
            
            let mensagensMostradas = 0;
            
            snapshot.forEach(doc => {
                const msg = doc.data();
                let deveMostrar = false;
                
                if (canalAtual === 'global' && msg.tipo === 'global') {
                    deveMostrar = true;
                }
                else if (canalAtual === 'grupo' && msg.tipo === 'grupo') {
                    if (!msg.visivelPara || msg.visivelPara.includes(usuarioAtual)) {
                        deveMostrar = true;
                    }
                }
                else if (canalAtual === 'privado' && msg.tipo === 'privada') {
                    if (msg.participantes && msg.participantes.includes(usuarioAtual) && msg.participantes.includes(conversaPrivadaAtual)) {
                        deveMostrar = true;
                    }
                }
                
                if (deveMostrar) {
                    mensagensMostradas++;
                    mostrarMensagemNaTela(msg, doc.id);
                }
            });
            
            if (mensagensMostradas === 0) {
                container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Nenhuma mensagem</div>';
            }
            
            container.scrollTop = container.scrollHeight;
        });
}

function mostrarMensagemNaTela(msg, docId) {
    const container = document.getElementById('mensagens');
    const div = document.createElement('div');
    
    let hora = 'Agora';
    if (msg.timestamp) {
        hora = msg.timestamp.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
    }
    
    let tipoClasse = 'mensagem-global';
    let tipoBadge = '🌐 Global';
    
    if (msg.tipo === 'grupo') {
        tipoClasse = 'mensagem-grupo';
        tipoBadge = '👥 Grupo';
    } else if (msg.tipo === 'privada') {
        tipoClasse = 'mensagem-privada';
        tipoBadge = '🔒 Privado';
    }
    
    div.className = `mensagem-item ${tipoClasse} ${msg.usuario === usuarioAtual ? 'minha-mensagem' : ''}`;
    
    div.innerHTML = `
        <div class="mensagem-header">
            <div>
                <strong>${msg.usuario}</strong>
                <span class="tipo-mensagem">${tipoBadge}</span>
            </div>
            <small>${hora}</small>
        </div>
        <div class="mensagem-texto">${msg.texto}</div>
        ${msg.usuario === usuarioAtual ? `<button class="btn-apagar" onclick="apagarMensagem('${docId}')">×</button>` : ''}
    `;
    
    container.appendChild(div);
}

function enviarMensagem() {
    const input = document.getElementById('mensagem-input');
    const texto = input.value.trim();

    if (!texto) {
        alert("Digite uma mensagem!");
        return;
    }

    let mensagemData = {
        usuario: usuarioAtual,
        texto: texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        tipo: canalAtual
    };

    if (canalAtual === 'grupo') {
        mensagemData.visivelPara = [usuarioAtual, ...amigos];
    } else if (canalAtual === 'privado') {
        mensagemData.tipo = 'privada';
        mensagemData.participantes = [usuarioAtual, conversaPrivadaAtual];
    }

    db.collection('mensagens').add(mensagemData)
        .then(() => {
            input.value = '';
        })
        .catch(error => {
            console.error("Erro:", error);
            alert("Erro ao enviar.");
        });
}

async function apagarMensagem(mensagemId) {
    if (confirm("Apagar mensagem?")) {
        try {
            await db.collection('mensagens').doc(mensagemId).delete();
        } catch (error) {
            console.error("Erro:", error);
        }
    }
}

function sair() {
    if (confirm("Sair do chat?")) {
        location.reload();
    }
}

// Event Listeners
document.getElementById('mensagem-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') enviarMensagem();
});

document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') fazerLogin();
});
