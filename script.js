import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
    getStorage,
    connectStorageEmulator,
    ref,
    uploadBytes,
    listAll,
    getBlob
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyD7M43zii3397EgW_WNNTQ3rEBYDEM8nes",
    authDomain: "projeto-em-nuvem.firebaseapp.com",
    projectId: "projeto-em-nuvem",
    storageBucket: "projeto-em-nuvem.firebasestorage.app",
    messagingSenderId: "788700174902",
    appId: "1:788700174902:web:45309e3e129da18adfd697"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const formulario = document.getElementById("formulario");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const sessao = document.getElementById("sessao");
const areaLogada = document.getElementById("area-logada");
const mensagem = document.getElementById("mensagem");

// Executa uma operação e apresenta o resultado ou o erro.
async function executar(operacao, textoSucesso) {
    mensagem.textContent = "Aguarde...";

    document.querySelectorAll("button").forEach(botao => {
        botao.disabled = true;
    });

    try {
        await operacao();
        senha.value = "";
        mensagem.textContent = textoSucesso;
    } catch (erro) {
        const mensagens = {
            "auth/email-already-in-use":
                "Este e-mail já está cadastrado. Clique em Entrar.",
            "auth/invalid-email":
                "Digite um e-mail válido.",
            "auth/weak-password":
                "A senha está muito fraca. Use uma senha mais forte.",
            "auth/password-does-not-meet-requirements":
                "A senha não atende à política configurada no Firebase.",
            "auth/invalid-credential":
                "E-mail ou senha incorretos.",
            "auth/user-not-found":
                "E-mail ou senha incorretos.",
            "auth/wrong-password":
                "E-mail ou senha incorretos.",
            "auth/operation-not-allowed":
                "Ative E-mail/senha no painel do Firebase.",
            "auth/network-request-failed":
                "Falha de conexão. Verifique sua internet.",
            "auth/too-many-requests":
                "Muitas tentativas. Aguarde antes de tentar novamente."
        };

        mensagem.textContent =
            mensagens[erro.code] || "Erro: " + erro.code;
    } finally {
        document.querySelectorAll("button").forEach(botao => {
            botao.disabled = false;
        });
    }
}

// Cadastro: cria a conta e já conecta o usuário.
document.getElementById("cadastrar").addEventListener("click", () => {
    if (!formulario.reportValidity()) return;

    executar(
        () => createUserWithEmailAndPassword(
            auth,
            email.value.trim(),
            senha.value
        ),
        "Conta criada com sucesso!"
    );
});

// Login: acessa uma conta já existente.
formulario.addEventListener("submit", evento => {
    evento.preventDefault();

    executar(
        () => signInWithEmailAndPassword(
            auth,
            email.value.trim(),
            senha.value
        ),
        "Login realizado!"
    );
});

// Logout: encerra a sessão.
document.getElementById("sair").addEventListener("click", () => {
    executar(
        () => signOut(auth),
        "Você saiu da conta."
    );
});

// Atualiza a tela ao entrar, sair ou restaurar uma sessão.
onAuthStateChanged(auth, usuario => {
    formulario.hidden = Boolean(usuario);
    areaLogada.hidden = !usuario;

    sessao.textContent = usuario
        ? "Conectado como: " + usuario.email
        : "Entre ou crie sua conta.";
});
// Conexão com o banco de dados
const db = getFirestore(app);

// Elementos da tela
const formChamado = document.getElementById("form-chamado");
const tituloChamado = document.getElementById("titulo");
const descricaoChamado = document.getElementById("descricao");
const statusChamado = document.getElementById("status-chamado");
const salvarChamado = document.getElementById("salvar-chamado");
const cancelarEdicao = document.getElementById("cancelar-edicao");
const listaChamados = document.getElementById("lista-chamados");
const avisoChamados = document.getElementById("aviso-chamados");

// Controle de edição e da atualização em tempo real
let idEmEdicao = null;
let pararEscuta = null;

function limparFormulario() {
    formChamado.reset();
    idEmEdicao = null;
    salvarChamado.textContent = "Criar chamado";
    cancelarEdicao.hidden = true;
}

cancelarEdicao.addEventListener("click", limparFormulario);

// Criar ou atualizar um chamado
formChamado.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const usuario = auth.currentUser;
    if (!usuario) return;

    const dados = {
        titulo: tituloChamado.value.trim(),
        descricao: descricaoChamado.value.trim(),
        status: statusChamado.value
    };

    if (!dados.titulo || !dados.descricao) {
        avisoChamados.textContent = "Preencha o título e a descrição.";
        return;
    }

    salvarChamado.disabled = true;
    cancelarEdicao.disabled = true;
    avisoChamados.textContent = "Salvando...";

    try {
        if (idEmEdicao) {
            const referencia = doc(
                db,
                "usuarios",
                usuario.uid,
                "chamados",
                idEmEdicao
            );

            await updateDoc(referencia, dados);
            avisoChamados.textContent = "Chamado atualizado!";
        } else {
            const referencia = collection(
                db,
                "usuarios",
                usuario.uid,
                "chamados"
            );

            await addDoc(referencia, dados);
            avisoChamados.textContent = "Chamado criado!";
        }

        limparFormulario();
    } catch (erro) {
        avisoChamados.textContent = "Erro ao salvar: " + erro.code;
    } finally {
        salvarChamado.disabled = false;
        cancelarEdicao.disabled = false;
    }
});

// Mostrar um chamado na lista
function mostrarChamado(documento, uid) {
    const dados = documento.data();

    const nomesStatus = {
        aberto: "Aberto",
        em_andamento: "Em andamento",
        concluido: "Concluído"
    };

    const card = document.createElement("article");
    const titulo = document.createElement("h4");
    const descricao = document.createElement("p");
    const status = document.createElement("p");
    const editar = document.createElement("button");
    const excluir = document.createElement("button");

    // textContent exibe os dados como texto, sem executar HTML.
    titulo.textContent = dados.titulo;
    descricao.textContent = dados.descricao;
    status.textContent = "Status: " + nomesStatus[dados.status];

    editar.type = "button";
    editar.textContent = "Editar";

    editar.addEventListener("click", () => {
        idEmEdicao = documento.id;
        tituloChamado.value = dados.titulo;
        descricaoChamado.value = dados.descricao;
        statusChamado.value = dados.status;

        salvarChamado.textContent = "Salvar alterações";
        cancelarEdicao.hidden = false;
        tituloChamado.focus();
    });

    excluir.type = "button";
    excluir.textContent = "Excluir";

    excluir.addEventListener("click", async () => {
        if (!confirm("Deseja excluir este chamado?")) return;

        excluir.disabled = true;

        try {
            await deleteDoc(
                doc(db, "usuarios", uid, "chamados", documento.id)
            );

            if (idEmEdicao === documento.id) {
                limparFormulario();
            }

            avisoChamados.textContent = "Chamado excluído!";
        } catch (erro) {
            avisoChamados.textContent = "Erro ao excluir: " + erro.code;
        } finally {
            excluir.disabled = false;
        }
    });

    card.append(titulo, descricao, status, editar, excluir);
    listaChamados.appendChild(card);
}

// Acompanhar os chamados da conta conectada
onAuthStateChanged(auth, (usuario) => {
    // Encerra a escuta da sessão anterior.
    if (pararEscuta) {
        pararEscuta();
        pararEscuta = null;
    }

    listaChamados.replaceChildren();
    avisoChamados.textContent = "";
    limparFormulario();

    if (!usuario) return;

    const referencia = collection(
        db,
        "usuarios",
        usuario.uid,
        "chamados"
    );

    pararEscuta = onSnapshot(
        referencia,
        (resultado) => {
            listaChamados.replaceChildren();

            if (resultado.empty) {
                listaChamados.textContent = "Nenhum chamado cadastrado.";
                return;
            }

            resultado.forEach((documento) => {
                mostrarChamado(documento, usuario.uid);
            });
        },
        (erro) => {
            avisoChamados.textContent =
                "Erro ao carregar chamados: " + erro.code;
        }

    );
});
// Storage usado exclusivamente no emulador local.
const storage = getStorage(app);

connectStorageEmulator(storage, "127.0.0.1", 9199);

const arquivoUpload = document.getElementById("arquivo-upload");
const enviarArquivo = document.getElementById("enviar-arquivo");
const atualizarArquivos = document.getElementById("atualizar-arquivos");
const mensagemArquivos = document.getElementById("mensagem-arquivos");
const listaArquivos = document.getElementById("lista-arquivos");

const limiteArquivo = 5 * 1024 * 1024;

const tiposPermitidos = [
    "image/png",
    "image/jpeg",
    "application/pdf"
];

// Consulta os arquivos da conta conectada.
async function carregarArquivos() {
    const usuario = auth.currentUser;

    listaArquivos.replaceChildren();

    if (!usuario) return;

    mensagemArquivos.textContent = "Carregando arquivos...";

    try {
        const pasta = ref(
            storage,
            `usuarios/${usuario.uid}/arquivos`
        );

        const resultado = await listAll(pasta);

        // Evita mostrar dados de uma sessão que já terminou.
        if (auth.currentUser?.uid !== usuario.uid) return;

        listaArquivos.replaceChildren();

        for (const item of resultado.items) {
            const linha = document.createElement("li");
            const nome = document.createElement("span");
            const baixar = document.createElement("button");

            // Remove o identificador acrescentado no upload.
            const separador = item.name.indexOf("__");
            const nomeOriginal = separador >= 0
                ? item.name.slice(separador + 2)
                : item.name;

            nome.textContent = nomeOriginal + " ";

            baixar.type = "button";
            baixar.textContent = "Baixar";

            baixar.addEventListener("click", async () => {
                baixar.disabled = true;

                try {
                    const blob = await getBlob(item, limiteArquivo);
                    const endereco = URL.createObjectURL(blob);
                    const link = document.createElement("a");

                    link.href = endereco;
                    link.download = nomeOriginal;

                    document.body.appendChild(link);
                    link.click();
                    link.remove();

                    setTimeout(() => URL.revokeObjectURL(endereco), 10000);

                    mensagemArquivos.textContent = "Download iniciado!";
                } catch (erro) {
                    mensagemArquivos.textContent =
                        "Erro no download: " + (erro.code || erro.message);
                } finally {
                    baixar.disabled = false;
                }
            });

            linha.append(nome, baixar);
            listaArquivos.appendChild(linha);
        }

        mensagemArquivos.textContent = resultado.items.length
            ? "Arquivos carregados."
            : "Nenhum arquivo enviado.";
    } catch (erro) {
        if (auth.currentUser?.uid !== usuario.uid) return;

        mensagemArquivos.textContent =
            "Não foi possível listar os arquivos. Confira o emulador. " +
            (erro.code || erro.message);
    }
}

// Envia o arquivo selecionado.
enviarArquivo.addEventListener("click", async () => {
    const usuario = auth.currentUser;
    const arquivo = arquivoUpload.files[0];

    if (!usuario) {
        mensagemArquivos.textContent = "Entre na sua conta.";
        return;
    }

    if (!arquivo) {
        mensagemArquivos.textContent = "Selecione um arquivo.";
        return;
    }

    if (!tiposPermitidos.includes(arquivo.type)) {
        mensagemArquivos.textContent = "Use PNG, JPG ou PDF.";
        return;
    }

    if (arquivo.size > limiteArquivo) {
        mensagemArquivos.textContent = "O limite é 5 MB.";
        return;
    }

    enviarArquivo.disabled = true;
    mensagemArquivos.textContent = "Enviando...";

    try {
        const nomeSeguro = arquivo.name.replace(/[\\/]/g, "_");
        const identificador = crypto.randomUUID();

        const destino = ref(
            storage,
            `usuarios/${usuario.uid}/arquivos/${identificador}__${nomeSeguro}`
        );

        await uploadBytes(destino, arquivo, {
            contentType: arquivo.type
        });

        if (auth.currentUser?.uid !== usuario.uid) return;

        arquivoUpload.value = "";
        await carregarArquivos();
    } catch (erro) {
        mensagemArquivos.textContent =
            "Erro no upload: " + (erro.code || erro.message);
    } finally {
        enviarArquivo.disabled = false;
    }
});

atualizarArquivos.addEventListener("click", carregarArquivos);

// Limpa a tela ao sair e carrega os arquivos ao entrar.
onAuthStateChanged(auth, (usuario) => {
    listaArquivos.replaceChildren();
    mensagemArquivos.textContent = "";
    arquivoUpload.value = "";

    if (usuario) {
        carregarArquivos();
    }
});