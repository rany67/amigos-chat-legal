// CONFIGURAÇÃO DO FIREBASE - SUBSTITUA COM SEUS DADOS!
const firebaseConfig = {
    apiKey: "AIzaSyBpHrKLeNQ18UjMCUJCTMol5JoUBoOMvlg",
    authDomain: "meu-chat-grupo.firebaseapp.com",
    projectId: "meu-chat-grupo",
    storageBucket: "meu-chat-grupo.firebasestorage.app",
    messagingSenderId: "553703801847",
    appId: "1:553703801847:web:c8a7d5763de6f1dc1664f2"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();