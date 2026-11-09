"""Teste real opt-in. Cria duas contas temporárias e limpa seus próprios dados.
Executar: python tests/integracao-back4app.py --confirmar
Não utiliza Master Key nem credenciais pessoais.
"""
import json, re, secrets, sys, urllib.request, urllib.error, urllib.parse
from pathlib import Path

if '--confirmar' not in sys.argv:
    raise SystemExit('Use --confirmar para criar e remover dados temporários de teste.')
root = Path(__file__).resolve().parents[1]
config = (root / 'config.js').read_text()
def config_value(name):
    return re.search(name + r":\s*'([^']+)'", config).group(1)
base = config_value('serverURL')
headers = {'X-Parse-Application-Id': config_value('applicationId'),
           'X-Parse-JavaScript-Key': config_value('javascriptKey'),
           'Content-Type': 'application/json'}
def api(method, route, data=None, user=None):
    h = dict(headers)
    if user: h['X-Parse-Session-Token'] = user['sessionToken']
    req = urllib.request.Request(base + route, headers=h, method=method,
        data=json.dumps(data).encode() if data is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')

results, users, records = [], [], []
def check(name, condition):
    results.append({'teste': name, 'resultado': 'PASSOU' if condition else 'FALHOU'})
    print(results[-1]['resultado'] + ': ' + name, flush=True)
    if not condition: raise AssertionError(name)

def pointer(user):
    return {'__type': 'Pointer', 'className': '_User', 'objectId': user['objectId']}
try:
    for tag in ['a', 'b']:
        email = 'nuvemdesk-teste-' + tag + '-' + secrets.token_hex(8) + '@example.com'
        code, u = api('POST', 'users', {'username': email, 'email': email,
            'password': secrets.token_urlsafe(24), 'ACL': {}})
        if code == 201: users.append(u)
        check('Cadastro temporário ' + tag, code == 201)
    a, b = users
    data = {'titulo': '  TESTE AUTOMATIZADO  ', 'descricao': '  Remover ao finalizar  ',
            'status': 'aberto', 'proprietario': pointer(a), 'ACL': {'*': {'read': True, 'write': True}}}
    code, created = api('POST', 'classes/Chamado', data, a)
    if code == 201: records.append((created['objectId'], a))
    check('Criar chamado autenticado', code == 201)
    route = 'classes/Chamado/' + created['objectId']
    code, obj = api('GET', route, user=a)
    print('Diagnóstico do registro temporário:', json.dumps({
        'http': code, 'titulo': obj.get('titulo'), 'descricao': obj.get('descricao'),
        'acl_publica': '*' in obj.get('ACL', {}), 'erro': obj.get('error')
    }, ensure_ascii=False), flush=True)
    check('Persistência e normalização', code == 200 and obj['titulo'] == 'TESTE AUTOMATIZADO'
          and obj['descricao'] == 'Remover ao finalizar')
    check('Servidor impõe ACL privada', obj.get('ACL') == {a['objectId']: {'read': True, 'write': True}})
    code, _ = api('GET', route, user=b)
    check('Conta B não lê chamado de A', code in [400, 403, 404])
    code, found = api('GET', 'classes/Chamado?where=' + urllib.parse.quote(json.dumps({'objectId': created['objectId']})), user=b)
    check('Conta B não encontra chamado na busca', code == 200 and found.get('results') == [])
    for method, body, name in [('PUT', {'titulo': 'INVASAO'}, 'altera'), ('DELETE', None, 'exclui')]:
        code, _ = api(method, route, body, b)
        check('Conta B não ' + name + ' chamado de A', code in [400, 403, 404])
    code, _ = api('GET', route)
    check('Leitura anônima bloqueada', code in [400, 403, 404])
    code, unexpected = api('POST', 'classes/Chamado', data)
    if code == 201: records.append((unexpected['objectId'], a))
    print('Criação anônima: HTTP', code, 'código Parse', unexpected.get('code'), flush=True)
    check('Criação anônima bloqueada', (code, unexpected.get('code')) in [(400,119), (403,119), (400,209), (401,209), (404,101)])
    code, _ = api('PUT', route, {'proprietario': pointer(b)}, a)
    check('Transferência de proprietário bloqueada', code == 400)
    for body in [{'titulo': ' '}, {'descricao': 'x' * 2001}, {'status': 'fechado'}]:
        code, _ = api('PUT', route, body, a)
        check('Validação de ' + next(iter(body)), code == 400)
    code, _ = api('PUT', route, {'titulo': 'TESTE EDITADO', 'status': 'em_andamento'}, a)
    check('Edição pelo proprietário', code == 200)
    code, obj = api('GET', route, user=a)
    check('Edição persistida e proprietário preservado', code == 200 and obj['status'] == 'em_andamento'
          and obj['titulo'] == 'TESTE EDITADO' and obj['proprietario']['objectId'] == a['objectId'])
    code, _ = api('DELETE', route, user=a)
    check('Exclusão pelo proprietário', code == 200)
    records.clear()
    code, _ = api('GET', route, user=a)
    check('Exclusão persistida', code == 404)
finally:
    cleanup = []
    for object_id, owner in records:
        code, _ = api('DELETE', 'classes/Chamado/' + object_id, user=owner)
        cleanup.append({'tipo': 'chamado', 'removido': code in [200, 404]})
    for user in users:
        code, _ = api('DELETE', 'users/' + user['objectId'], user=user)
        cleanup.append({'tipo': 'conta temporária', 'removido': code in [200, 404]})
    dest = root / 'docs/evidencias'; dest.mkdir(parents=True, exist_ok=True)
    (dest / 'integracao-back4app.json').write_text(json.dumps({
        'testes': results, 'limpeza': cleanup,
        'escopo': 'API real, somente dados temporários; sem teste visual do navegador'
    }, ensure_ascii=False, indent=2))
    print('Limpeza:', json.dumps(cleanup, ensure_ascii=False), flush=True)
    if not all(item['removido'] for item in cleanup):
        raise RuntimeError('Limpeza incompleta: verificar contas temporárias no painel.')
