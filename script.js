/* Autenticação Back4App e comunicação da sessão ao painel. */
(() => {
  'use strict';
  const formulario = document.getElementById('formulario');
  const email = document.getElementById('email');
  const senha = document.getElementById('senha');
  const sessao = document.getElementById('sessao');
  const areaLogada = document.getElementById('area-logada');
  const mensagem = document.getElementById('mensagem');
  const cadastrar = document.getElementById('cadastrar');
  const sair = document.getElementById('sair');
  let ocupado = false;
  let usuarioConfirmado = null;

  function bloquear(valor) {
    ocupado = valor;
    for (const elemento of [email, senha, cadastrar, sair, formulario.querySelector('[type="submit"]')]) {
      elemento.disabled = valor;
    }
    formulario.setAttribute('aria-busy', String(valor));
  }

  function mostrarSessao(usuario) {
    usuarioConfirmado = usuario;
    formulario.hidden = Boolean(usuario);
    areaLogada.hidden = !usuario;
    sessao.textContent = usuario
      ? 'Conectado como: ' + (usuario.get('email') || usuario.get('username'))
      : 'Entre ou crie sua conta.';
    window.dispatchEvent(new CustomEvent('nuvemdesk:sessao', { detail: usuario }));
  }

  function descreverErro(erro) {
    const textos = {
      100: 'Falha de conexão. Verifique sua internet e tente novamente.',
      101: 'E-mail ou senha incorretos.',
      119: 'Operação não permitida. Confira as permissões da aplicação.',
      125: 'Digite um e-mail válido.',
      200: 'Informe seu e-mail.',
      201: 'Informe sua senha.',
      202: 'Este e-mail já está cadastrado. Clique em Entrar.',
      203: 'Este e-mail já está cadastrado. Clique em Entrar.',
      209: 'Sua sessão expirou. Entre novamente.',
      142: 'O cadastro não atende às regras do servidor. Confira a senha e a configuração.'
    };
    return textos[erro?.code] || 'Não foi possível concluir. Confira a conexão e a configuração do Back4App.';
  }

  if (!window.Parse || !window.NUVEMDESK_CONFIG) {
    mostrarSessao(null);
    bloquear(true);
    mensagem.textContent = 'Não foi possível carregar os arquivos de acesso. Confira se extraiu a pasta inteira e recarregue a página.';
    return;
  }
  const Parse = window.Parse;
  const config = window.NUVEMDESK_CONFIG;
  Parse.initialize(config.applicationId, config.javascriptKey);
  Parse.serverURL = config.serverURL;

  async function executar(operacao, sucesso) {
    if (ocupado) return;
    bloquear(true);
    mensagem.textContent = 'Aguarde...';
    try {
      await operacao();
      senha.value = '';
      mostrarSessao(Parse.User.current());
      mensagem.textContent = sucesso;
    } catch (erro) {
      mostrarSessao(usuarioConfirmado && Parse.User.current());
      mensagem.textContent = descreverErro(erro);
    } finally {
      bloquear(false);
    }
  }

  function obterEmail() {
    return email.value.trim().toLowerCase();
  }

  cadastrar.addEventListener('click', () => {
    email.value = obterEmail();
    if (ocupado || !formulario.reportValidity()) return;
    executar(async () => {
      const usuario = new Parse.User();
      usuario.set('username', obterEmail());
      usuario.set('email', obterEmail());
      usuario.set('password', senha.value);
      usuario.setACL(new Parse.ACL());
      await usuario.signUp();
    }, 'Conta criada com sucesso!');
  });

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    email.value = obterEmail();
    if (ocupado || !formulario.reportValidity()) return;
    executar(() => Parse.User.logIn(obterEmail(), senha.value), 'Login realizado!');
  });

  sair.addEventListener('click', () => {
    executar(() => Parse.User.logOut(), 'Você saiu da conta.');
  });

  async function restaurarSessao() {
    bloquear(true);
    try {
      const usuario = Parse.User.current();
      const validado = usuario ? await Parse.User.become(usuario.getSessionToken()) : null;
      mostrarSessao(validado);
    } catch (erro) {
      if (erro.code === 209 || erro.code === 101) {
        try { await Parse.User.logOut(); } catch { /* SDK limpa a sessão local. */ }
      }
      mostrarSessao(null);
      mensagem.textContent = erro.code === 209 || erro.code === 101
        ? 'Sua sessão expirou. Entre novamente.'
        : 'Não foi possível verificar sua sessão. Confira a internet e recarregue a página.';
    } finally {
      bloquear(false);
    }
  }
  restaurarSessao();
})();
