// Testes de navegador com API simulada. Não criam contas no Back4App.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let browser, server, base;
before(async () => {
  const root = path.resolve(__dirname, '..');
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const mime = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
      res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function ambiente(t) {
  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const state = { mode: 'ok', calls: [], email: 'aluno@example.com' };
  await page.route('https://parseapi.back4app.com/**', async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } }); return;
    }
    const endpoint = new URL(req.url()).pathname;
    const data = req.postDataJSON() || {};
    state.calls.push({ endpoint, data });
    let status = 200;
    let body = { objectId: 'user123', username: state.email, email: state.email,
      sessionToken: 'r:test-session', createdAt: '2026-11-08T00:00:00.000Z' };
    if (endpoint === '/classes/Chamado' && state.mode === 'ok') body = { results: [] };
    else if (endpoint === '/logout') body = {};
    else if (state.mode === 'wrong') { status = 404; body = { code: 101, error: 'Invalid username/password.' }; }
    else if (state.mode === 'duplicate') { status = 400; body = { code: 202, error: 'Username taken.' }; }
    else if (state.mode === 'expired') { status = 400; body = { code: 209, error: 'Invalid session token.' }; }
    else if (state.mode === 'offline') { await route.abort(); return; }
    if (endpoint === '/users' && state.mode === 'ok') {
      state.email = data.email; body.email = data.email; body.username = data.username; status = 201;
    }
    await route.fulfill({ status, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
  });
  await page.goto(base);
  await page.waitForFunction(() => !document.querySelector('#email').disabled);
  return { page, state };
}
async function preencher(page, email = 'Aluno@Example.com', senha = 'SenhaTeste123!') {
  await page.locator('#email').fill(email);
  await page.locator('#senha').fill(senha);
}
async function mensagem(page, texto) {
  await page.waitForFunction(texto => document.querySelector('#mensagem').textContent.includes(texto), texto);
}
test('cadastro, sessão após recarregar, logout e login', async t => {
  const { page, state } = await ambiente(t);
  await preencher(page);
  await page.locator('#cadastrar').click();
  await mensagem(page, 'Conta criada');
  assert.equal(await page.locator('#area-logada').isVisible(), true);
  assert.equal(await page.locator('#senha').inputValue(), '');
  const cadastro = state.calls.find(c => c.endpoint === '/users').data;
  assert.equal(cadastro.username, 'aluno@example.com');
  assert.equal(cadastro.email, 'aluno@example.com');
  assert.equal(cadastro.ACL?.['*'], undefined);
  await page.reload();
  await page.locator('#area-logada').waitFor({ state: 'visible' });
  assert.ok(state.calls.some(c => c.endpoint === '/users/me'));
  await page.locator('#sair').click();
  await mensagem(page, 'Você saiu');
  assert.equal(await page.locator('#area-logada').isVisible(), false);
  await page.reload();
  await page.locator('#formulario').waitFor({ state: 'visible' });
  await preencher(page);
  await page.locator('#formulario button[type=submit]').click();
  await mensagem(page, 'Login realizado');
});
test('senha errada e cadastro duplicado não liberam painel', async t => {
  const { page, state } = await ambiente(t);
  await preencher(page); state.mode = 'wrong';
  await page.locator('#formulario button[type=submit]').click();
  await mensagem(page, 'E-mail ou senha incorretos');
  assert.equal(await page.locator('#area-logada').isVisible(), false);
  state.mode = 'duplicate';
  await page.locator('#cadastrar').click();
  await mensagem(page, 'já está cadastrado');
  assert.equal(await page.locator('#area-logada').isVisible(), false);
});
test('sessão revogada exige novo login', async t => {
  const { page, state } = await ambiente(t);
  await preencher(page); await page.locator('#formulario button[type=submit]').click();
  await mensagem(page, 'Login realizado');
  state.mode = 'expired'; await page.reload();
  await mensagem(page, 'Sua sessão expirou');
  assert.equal(await page.locator('#area-logada').isVisible(), false);
  assert.equal(await page.evaluate(() => Parse.User.current()), null);
});
test('campos inválidos não chamam API e layout cabe em 360px', async t => {
  const { page, state } = await ambiente(t);
  await page.setViewportSize({ width: 360, height: 800 });
  await preencher(page, 'invalido', '123'); await page.locator('#cadastrar').click();
  assert.equal(state.calls.length, 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
});
test('falha de rede exibe erro sem liberar painel', async t => {
  const { page, state } = await ambiente(t);
  await page.evaluate(() => { Parse.CoreManager.set('REQUEST_ATTEMPT_LIMIT', 1); });
  state.mode = 'offline'; await preencher(page);
  await page.locator('#formulario button[type=submit]').click();
  await mensagem(page, 'Falha de conexão');
  assert.equal(await page.locator('#area-logada').isVisible(), false);
  assert.equal(await page.locator('#cadastrar').isEnabled(), true);
});
