// Testa as regras isoladas; não substitui testes no servidor Parse real.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const hooks = {};
class ACL {
  constructor() { this.rules = {}; }
  setReadAccess(id, value) { this.rules[id] = { ...this.rules[id], read: value }; }
  setWriteAccess(id, value) { this.rules[id] = { ...this.rules[id], write: value }; }
}
class ParseError extends Error { constructor(code, text) { super(text); this.code = code; } }
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../cloud/main.js'), 'utf8'), {
  Parse: { ACL, Error: ParseError, Cloud: {
    beforeSave: (name, hook) => { hooks.save = hook; },
    beforeDelete: (name, hook) => { hooks.delete = hook; }
  } }
});
const a = { id: 'A', className: '_User' };
const b = { id: 'B', className: '_User' };
function objeto(values = {}) {
  return { values: { titulo: '  Internet  ', descricao: '  Sem conexão  ', ...values },
    get(key) { return this.values[key]; },
    set(key, value) { this.values[key] = value; },
    dirtyKeys() { return Object.keys(this.values); },
    setACL(acl) { this.acl = acl; }
  };
}
test('cria chamado aberto, normaliza textos e impõe ACL privada', () => {
  const o = objeto({ ACL: { '*': { read: true, write: true } } });
  hooks.save({ user: a, object: o });
  assert.equal(o.get('proprietario'), a);
  assert.equal(o.get('status'), 'aberto');
  assert.equal(o.get('titulo'), 'Internet');
  assert.deepEqual(o.acl.rules, { A: { read: true, write: true } });
});
test('recusa criação e exclusão anônimas', () => {
  for (const hook of [hooks.save, hooks.delete]) {
    assert.throws(() => hook({ object: objeto() }), e => e.code === 209);
  }
});
test('recusa proprietário forjado na criação', () => {
  for (const owner of [b, null, { id: 'A', className: 'OutraClasse' }]) {
    assert.throws(() => hooks.save({ user: a, object: objeto({ proprietario: owner }) }));
  }
});
test('recusa alteração por outra conta e transferência de propriedade', () => {
  const original = objeto({ proprietario: a });
  assert.throws(() => hooks.save({ user: b, original, object: objeto({ proprietario: b }) }));
  for (const owner of [b, undefined, null]) {
    assert.throws(() => hooks.save({ user: a, original, object: objeto({ proprietario: owner }) }));
  }
});
test('dono pode editar nos três status e ACL permanece privada', () => {
  for (const status of ['aberto', 'em_andamento', 'concluido']) {
    const o = objeto({ proprietario: a, status });
    hooks.save({ user: a, original: objeto({ proprietario: a }), object: o });
    assert.equal(o.get('status'), status);
    assert.deepEqual(o.acl.rules, { A: { read: true, write: true } });
  }
});
test('valida limites e tipos de título e descrição', () => {
  for (const [key, max] of [['titulo', 100], ['descricao', 2000]]) {
    for (const value of ['', '  ', null, 10, 'a'.repeat(max + 1)]) {
      assert.throws(() => hooks.save({ user: a, object: objeto({ [key]: value }) }));
    }
    hooks.save({ user: a, object: objeto({ [key]: 'a'.repeat(max) }) });
  }
});
test('recusa status inicial indevido, status inválido e campo extra', () => {
  for (const status of ['concluido', 'em_andamento', 'fechado', null]) {
    assert.throws(() => hooks.save({ user: a, object: objeto({ status }) }));
  }
  assert.throws(() => hooks.save({ user: a, object: objeto({ extra: true }) }));
  assert.throws(() => hooks.save({ user: a, original: objeto({ proprietario: a }),
    object: objeto({ proprietario: a, status: 'fechado' }) }));
});
test('exclusão permitida apenas ao proprietário autenticado', () => {
  const object = objeto({ proprietario: a });
  hooks.delete({ user: a, object });
  assert.throws(() => hooks.delete({ user: b, object }));
});
