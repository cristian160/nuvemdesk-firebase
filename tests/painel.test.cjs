// DOM simulado + SDK Parse real; respostas do backend são simuladas.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const ler = name => fs.readFileSync(path.join(root, name), 'utf8');
async function aguardar(fn) {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('A interface não atingiu o estado esperado.');
}
async function ambiente(t) {
  const dom = new JSDOM(ler('index.html'), { url: 'http://localhost/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.eval(ler('vendor/parse-8.7.0.min.js'));
  w.Parse.initialize('test-app', 'test-key');
  const db = new Map();
  const state = { calls: [], failRead: false, failWrite: false, confirm: true, nextId: 0 };
  w.confirm = () => state.confirm;
  w.Parse.CoreManager.setRESTController({
    ajax() { throw new Error('AJAX inesperado neste teste.'); },
    async request(method, route, data, options) {
      state.calls.push({ method, route, data, token: options?.sessionToken });
      assert.equal(options.sessionToken, 'r:conta-a');
      if (method === 'GET') {
        if (state.failRead) throw new w.Parse.Error(100, 'Sem rede');
        const where = data.where || {};
        const rows = [...db.values()].filter(row =>
          (!where.objectId || (typeof where.objectId === 'string' ? row.objectId === where.objectId : row.objectId > where.objectId.$gt))
          && (!where.proprietario || row.proprietario.objectId === where.proprietario.objectId));
        return { results: rows.slice(0, data.limit || 100) };
      }
      if (state.failWrite) throw new w.Parse.Error(142, 'Erro de validação do servidor.');
      if (method === 'POST') {
        const id = String(++state.nextId).padStart(10, '0');
        const time = new Date().toISOString();
        db.set(id, { ...data, objectId: id, createdAt: time, updatedAt: time });
        return { objectId: id, createdAt: time };
      }
      const id = route.split('/').pop();
      if (method === 'PUT') {
        Object.assign(db.get(id), data);
        return { updatedAt: new Date().toISOString() };
      }
      if (method === 'DELETE') { db.delete(id); return {}; }
      throw new Error('Requisição inesperada: ' + method + ' ' + route);
    }
  });
  w.eval(ler('chamados.js'));
  const user = w.Parse.Object.fromJSON({ __type: 'Object', className: '_User', objectId: 'conta-a',
    username: 'aluno@example.com', sessionToken: 'r:conta-a' });
  w.dispatchEvent(new w.CustomEvent('nuvemdesk:sessao', { detail: user }));
  const $ = id => w.document.getElementById(id);
  await aguardar(() => $('aviso-chamados').textContent === 'Lista atualizada.');
  function salvar(titulo = 'Sem internet', descricao = 'Computador sem conexão') {
    $('titulo').value = titulo; $('descricao').value = descricao;
    $('form-chamado').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  }
  const botoes = texto => [...w.document.querySelectorAll('#lista-chamados button')].filter(b => b.textContent === texto);
  return { w, $, db, state, salvar, botoes };
}
test('painel cria, edita, filtra, conta e exclui com confirmação', async t => {
  const { w, $, db, state, salvar, botoes } = await ambiente(t);
  salvar(); await aguardar(() => $('aviso-chamados').textContent === 'Chamado criado!');
  assert.equal(db.size, 1);
  assert.equal($('total-aberto').textContent, '1');
  assert.equal($('status-chamado').disabled, true);
  botoes('Editar')[0].click();
  assert.equal($('status-chamado').disabled, false);
  $('status-chamado').value = 'em_andamento'; salvar('Internet resolvendo');
  await aguardar(() => $('aviso-chamados').textContent === 'Chamado atualizado!');
  assert.equal($('total-aberto').textContent, '0');
  assert.equal($('total-em_andamento').textContent, '1');
  $('filtro-status').value = 'aberto'; $('filtro-status').dispatchEvent(new w.Event('change'));
  assert.equal(botoes('Editar').length, 0);
  $('filtro-status').value = 'todos'; $('filtro-status').dispatchEvent(new w.Event('change'));
  state.confirm = false; botoes('Excluir')[0].click(); assert.equal(db.size, 1);
  state.confirm = true; botoes('Excluir')[0].click();
  await aguardar(() => $('aviso-chamados').textContent === 'Chamado excluído!');
  assert.equal(db.size, 0); assert.equal($('total-em_andamento').textContent, '0');
});
test('texto é renderizado sem interpretar HTML e logout limpa painel', async t => {
  const { w, $, salvar } = await ambiente(t);
  salvar('<img src=x onerror=alert(1)>', '<script>alert(1)</script>');
  await aguardar(() => $('aviso-chamados').textContent === 'Chamado criado!');
  assert.equal($('lista-chamados').querySelector('img, script'), null);
  assert.ok($('lista-chamados').textContent.includes('<img'));
  w.dispatchEvent(new w.CustomEvent('nuvemdesk:sessao', { detail: null }));
  assert.equal($('total-aberto').textContent, '0');
  assert.equal($('lista-chamados').querySelector('article'), null);
});
test('falha de gravação mantém formulário e não declara sucesso', async t => {
  const { $, db, state, salvar } = await ambiente(t);
  state.failWrite = true; salvar();
  await aguardar(() => $('aviso-chamados').textContent.includes('Erro de validação'));
  assert.equal(db.size, 0); assert.equal($('titulo').value, 'Sem internet');
  assert.equal($('salvar-chamado').disabled, false);
});
test('falha ao reler após gravação informa que o chamado foi salvo', async t => {
  const { $, db, state, salvar } = await ambiente(t);
  state.failRead = true; salvar();
  await aguardar(() => $('aviso-chamados').textContent.includes('Não foi possível recarregar'));
  assert.equal(db.size, 1);
  assert.ok($('aviso-chamados').textContent.startsWith('Chamado criado!'));
  assert.equal($('titulo').value, '');
});
