// Regras do NuvemDesk. O Parse já está disponível no Cloud Code.
const STATUS = ['aberto', 'em_andamento', 'concluido'];
const CAMPOS = ['titulo', 'descricao', 'status', 'proprietario',
  'ACL', 'objectId', 'createdAt', 'updatedAt'];

function recusar(mensagem) {
  throw new Parse.Error(142, mensagem);
}

function exigirUsuario(request) {
  if (!request.user) {
    throw new Parse.Error(209, 'Entre na sua conta para continuar.');
  }
  return request.user;
}

function validarTexto(valor, nome, limite) {
  if (typeof valor !== 'string') recusar(nome + ' deve ser texto.');
  const texto = valor.trim();
  if (!texto || texto.length > limite) {
    recusar(nome + ' deve ter entre 1 e ' + limite + ' caracteres.');
  }
  return texto;
}

function pertenceA(proprietario, usuario) {
  return proprietario && proprietario.className === '_User'
    && proprietario.id === usuario.id;
}

Parse.Cloud.beforeSave('Chamado', request => {
  const usuario = exigirUsuario(request);
  const chamado = request.object;
  const anterior = request.original;

  for (const campo of chamado.dirtyKeys()) {
    if (!CAMPOS.includes(campo)) recusar('Campo não permitido: ' + campo);
  }

  if (anterior) {
    if (!pertenceA(anterior.get('proprietario'), usuario)) {
      recusar('Você não pode alterar este chamado.');
    }
    if (!pertenceA(chamado.get('proprietario'), usuario)) {
      recusar('Não é permitido trocar ou remover o proprietário.');
    }
  } else {
    const informado = chamado.get('proprietario');
    if (informado !== undefined && !pertenceA(informado, usuario)) {
      recusar('O proprietário deve ser o usuário conectado.');
    }
    chamado.set('proprietario', usuario);
    if (chamado.get('status') === undefined) chamado.set('status', 'aberto');
    if (chamado.get('status') !== 'aberto') {
      recusar('Um novo chamado deve iniciar aberto.');
    }
  }

  chamado.set('titulo', validarTexto(chamado.get('titulo'), 'Título', 100));
  chamado.set('descricao', validarTexto(chamado.get('descricao'), 'Descrição', 2000));
  if (!STATUS.includes(chamado.get('status'))) recusar('Status inválido.');

  // Sempre substitui a ACL enviada pelo cliente por uma ACL privada.
  const acl = new Parse.ACL();
  acl.setReadAccess(usuario.id, true);
  acl.setWriteAccess(usuario.id, true);
  chamado.setACL(acl);
});

Parse.Cloud.beforeDelete('Chamado', request => {
  const usuario = exigirUsuario(request);
  if (!pertenceA(request.object.get('proprietario'), usuario)) {
    recusar('Você não pode excluir este chamado.');
  }
});
