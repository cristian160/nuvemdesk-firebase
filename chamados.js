(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('form-chamado');
  const lista = $('lista-chamados');
  const aviso = $('aviso-chamados');
  const statusNome = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído' };
  let usuario = null;
  let registros = [];
  let idEdicao = null;
  let ocupado = false;
  let versaoSessao = 0;

  function bloquear(valor) {
    ocupado = valor;
    for (const el of document.querySelectorAll('#painel-chamados button, #painel-chamados input, #painel-chamados textarea, #painel-chamados select')) {
      el.disabled = valor;
    }
    // Novos chamados começam abertos; o status só é editável depois.
    $('status-chamado').disabled = valor || !idEdicao;
    form.setAttribute('aria-busy', String(valor));
  }

  function limparFormulario() {
    form.reset();
    idEdicao = null;
    $('salvar-chamado').textContent = 'Criar chamado';
    $('cancelar-edicao').hidden = true;
    $('status-chamado').disabled = true;
  }

  function erroTexto(erro) {
    if (erro.code === 209) return 'Sua sessão expirou. Saia da conta e entre novamente.';
    if (erro.code === 119) return 'Acesso recusado. Confira as permissões da classe Chamado.';
    if (erro.code === 101) return 'Chamado não encontrado ou acesso não permitido. Atualize a lista.';
    if (erro.code === 100) return 'Falha de conexão. Confira a internet e tente novamente.';
    if ([142, 111, 105, 255].includes(erro.code)) return erro.message;
    return erro.message || 'Não foi possível concluir a operação.';
  }

  function renderizar() {
    const totais = { aberto: 0, em_andamento: 0, concluido: 0 };
    for (const chamado of registros) {
      if (chamado.get('status') in totais) totais[chamado.get('status')]++;
    }
    for (const status of Object.keys(totais)) $('total-' + status).textContent = totais[status];
    lista.replaceChildren();
    const filtro = $('filtro-status').value;
    const visiveis = registros.filter(c => filtro === 'todos' || c.get('status') === filtro);
    if (!visiveis.length) {
      const vazio = document.createElement('p');
      vazio.textContent = registros.length ? 'Nenhum chamado neste status.' : 'Nenhum chamado cadastrado.';
      lista.append(vazio);
      return;
    }
    for (const chamado of visiveis) {
      const card = document.createElement('article');
      const titulo = document.createElement('h4');
      titulo.textContent = chamado.get('titulo');
      const descricao = document.createElement('p');
      descricao.textContent = chamado.get('descricao');
      const status = document.createElement('p');
      status.textContent = 'Status: ' + (statusNome[chamado.get('status')] || 'Desconhecido');
      const editar = document.createElement('button');
      editar.type = 'button'; editar.textContent = 'Editar'; editar.disabled = ocupado;
      editar.addEventListener('click', () => {
        if (ocupado) return;
        idEdicao = chamado.id;
        $('titulo').value = chamado.get('titulo');
        $('descricao').value = chamado.get('descricao');
        $('status-chamado').value = chamado.get('status');
        $('status-chamado').disabled = false;
        $('salvar-chamado').textContent = 'Salvar alterações';
        $('cancelar-edicao').hidden = false;
        aviso.textContent = 'Editando chamado. Altere os campos e salve.';
        $('titulo').focus();
      });
      const excluir = document.createElement('button');
      excluir.type = 'button'; excluir.textContent = 'Excluir'; excluir.disabled = ocupado;
      excluir.addEventListener('click', () => {
        if (ocupado || !confirm('Deseja excluir este chamado?')) return;
        operar(async (dono, options) => {
          const registro = await new Parse.Query('Chamado').get(chamado.id, options);
          await registro.destroy(options);
        }, 'Chamado excluído!');
      });
      card.append(titulo, descricao, status, editar, excluir);
      lista.append(card);
    }
  }

  async function consultar(dono, options) {
    // Paginação evita limitar silenciosamente lista e contadores a 100 itens.
    const todos = [];
    let cursor = null;
    while (true) {
      const query = new Parse.Query('Chamado');
      query.equalTo('proprietario', dono);
      query.ascending('objectId'); query.limit(100);
      if (cursor) query.greaterThan('objectId', cursor);
      const pagina = await query.find(options);
      todos.push(...pagina);
      if (pagina.length < 100) break;
      cursor = pagina[pagina.length - 1].id;
    }
    return todos.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async function atualizar() {
    if (!usuario || ocupado) return;
    const versao = versaoSessao;
    const dono = usuario;
    bloquear(true); aviso.textContent = 'Carregando chamados...';
    try {
      const encontrados = await consultar(dono, { sessionToken: dono.getSessionToken() });
      if (versao !== versaoSessao) return;
      registros = encontrados; renderizar();
      aviso.textContent = 'Lista atualizada.';
    } catch (erro) {
      if (versao !== versaoSessao) return;
      aviso.textContent = erroTexto(erro);
    } finally {
      if (versao === versaoSessao) bloquear(false);
    }
  }

  async function operar(acao, sucesso) {
    if (!usuario || ocupado) return;
    const versao = versaoSessao;
    const dono = usuario;
    const options = { sessionToken: dono.getSessionToken() };
    bloquear(true); aviso.textContent = 'Aguarde...';
    try {
      await acao(dono, options);
      if (versao !== versaoSessao) return;
      limparFormulario();
      try {
        const encontrados = await consultar(dono, options);
        if (versao !== versaoSessao) return;
        registros = encontrados; renderizar(); aviso.textContent = sucesso;
      } catch (erro) {
        if (versao === versaoSessao) {
          // A gravação já aconteceu: não induzir o usuário a salvar novamente.
          registros = []; renderizar();
          aviso.textContent = sucesso + ' Não foi possível recarregar a lista. Clique em Atualizar lista.';
        }
      }
    } catch (erro) {
      if (versao === versaoSessao) aviso.textContent = erroTexto(erro);
    } finally {
      if (versao === versaoSessao) bloquear(false);
    }
  }

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    if (ocupado || !form.reportValidity()) return;
    const titulo = $('titulo').value.trim();
    const descricao = $('descricao').value.trim();
    const status = idEdicao ? $('status-chamado').value : 'aberto';
    if (!titulo || titulo.length > 100 || !descricao || descricao.length > 2000) {
      aviso.textContent = 'Preencha o título (até 100 caracteres) e a descrição (até 2000), sem usar apenas espaços.';
      return;
    }
    const id = idEdicao;
    operar(async (dono, options) => {
      const chamado = id ? await new Parse.Query('Chamado').get(id, options) : new Parse.Object('Chamado');
      if (!id) {
        chamado.set('proprietario', dono);
        chamado.setACL(new Parse.ACL(dono));
      }
      chamado.set('titulo', titulo); chamado.set('descricao', descricao); chamado.set('status', status);
      await chamado.save(null, options);
    }, id ? 'Chamado atualizado!' : 'Chamado criado!');
  });
  $('cancelar-edicao').addEventListener('click', () => {
    if (ocupado) return;
    limparFormulario(); aviso.textContent = 'Edição cancelada.';
  });
  $('filtro-status').addEventListener('change', renderizar);
  $('atualizar-chamados').addEventListener('click', atualizar);

  window.addEventListener('nuvemdesk:sessao', evento => {
    versaoSessao++;
    usuario = evento.detail;
    registros = []; ocupado = false;
    $('filtro-status').value = 'todos';
    limparFormulario(); renderizar(); bloquear(false); aviso.textContent = '';
    if (usuario) atualizar();
  });
})();
