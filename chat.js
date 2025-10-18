// Sistema de Chat com Login e Senha
let usuarioAtual = '';

// Função de login/cadastro
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
        // Verificar se usuário já existe no Firestore
        const userDoc = await db.collection('usuarios').doc(username).get();
        
        if (userDoc.exists) {
            // Tentar login - verificar senha
            const userData = userDoc.data();
            if (userData.senha === password) {
                loginSucesso(username);
            } else {
                mensagem.textContent = "Senha incorreta!";
                mensagem.style.color = "red";
            }
        } else {
            // Cadastrar novo usuário
            await db.collection('usuarios').doc(username).set({
                senha: password,
                dataCriacao: new Date()
            });
            mensagem.textContent = "Conta criada com sucesso!";
            mensagem.style.color = "green";
            loginSucesso(username);
        }
    } catch (error) {
        console.error("Erro:", error);
        mensagem.textContent = "Erro ao conectar. Tente novamente.";
        mensagem.style.color = "red";
    }
}

function loginSucesso(username) {
    usuarioAtual = username;
    
    // Mostrar chat
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';
    document.getElementById('usuario-logado').textContent = username;
    
    // Carregar mensagens
    carregarMensagens();
}

function enviarMensagem() {
    const input = document.getElementById('mensagem-input');
    const texto = input.value.trim();

    if (!texto || !usuarioAtual) return;

    // Salvar mensagem no Firebase
    db.collection('mensagens').add({
        usuario: usuarioAtual,
        texto: texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        input.value = '';
    }).catch(error => {
        console.error("Erro ao enviar:", error);
        alert("Erro ao enviar mensagem");
    });
}

function carregarMensagens() {
    // Ouvir mensagens em tempo real
    db.collection('mensagens')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            const container = document.getElementById('mensagens');
            container.innerHTML = '';
            
            snapshot.forEach(doc => {
                const msg = doc.data();
                const div = document.createElement('div');
                div.className = 'mensagem-item';
                
                let hora = 'Agora';
                if (msg.timestamp) {
                    hora = msg.timestamp.toDate().toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
                
                div.innerHTML = `
                    <div class="mensagem-header">
                        <strong>${msg.usuario}</strong>
                        <small>${hora}</small>
                    </div>
                    <div class="mensagem-texto">${msg.texto}</div>
                `;
                
                if (msg.usuario === usuarioAtual) {
                    div.style.background = '#e3f2fd';
                    div.style.borderLeft = '4px solid #2196f3';
                }
                
                container.appendChild(div);
            });
            
            container.scrollTop = container.scrollHeight;
        });
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

// Enviar com Enter
document.getElementById('mensagem-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        enviarMensagem();
    }
});

// Login com Enter nos campos
document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        fazerLogin();
    }
});