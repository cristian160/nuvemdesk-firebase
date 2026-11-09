# NuvemDesk — painel de chamados com Back4App

Versão de trabalho de 09/11/2026. Reaproveita a identidade visual da versão Firebase do repositório cristian160/nuvemdesk-firebase (referência e22bdbd).

## Abrir e testar

1. Pare o Live Server da pasta anterior. Extraia este ZIP inteiro em uma pasta nova.
2. No VS Code, abra a pasta que contém index.html.
3. Clique com o botão direito em index.html > Open with Live Server.
4. Entre com a conta que você já criou no NuvemDesk/Back4App. Não precisa cadastrá-la novamente. As contas antigas do Firebase não foram importadas.
5. Crie um chamado com título e descrição. Ele deve aparecer com status Aberto.
6. Recarregue: o chamado deve continuar na lista.
7. Clique em Editar, altere o status para Em andamento e salve. Confira o contador e o filtro.
8. Teste Concluído e, por último, Excluir. A exclusão exige confirmação e remove o registro.
9. Saia da conta e entre com outra conta de teste: o chamado da primeira não deve aparecer.

Não é necessário iniciar emuladores Firebase nem instalar dependências Node para usar a página. É necessária conexão com a internet para acessar o Back4App. Não misture os arquivos das duas versões.

## O que esta versão implementa

- Cadastro, login, logout e restauração da sessão.
- Criação, listagem, edição e exclusão de chamados do usuário autenticado.
- Status aberto, em_andamento e concluido; filtro e contadores.
- Validação no cliente e no servidor; ACL privada e proprietário preservado.
- Mensagens de falha e confirmação antes de excluir.

## Arquivos principais

| Arquivo | Função |
|---|---|
| index.html / style.css | Interface e aparência |
| config.js | Identificadores públicos de conexão ao Back4App |
| script.js | Autenticação e sessão |
| chamados.js | Painel e persistência de chamados |
| cloud/main.js | Regras executadas no Back4App |
| vendor/ | SDK Parse 8.7.0 e sua licença |
| tests/ | Testes locais, de navegador e de integração |
| docs/evidencias/ | Resultados das verificações realizadas |

## Configuração do servidor

A classe Chamado usa titulo, descricao e status (String), além de proprietario (Pointer para _User). Os quatro campos são obrigatórios. Status inicial: aberto. Os campos objectId, createdAt, updatedAt e ACL são gerenciados pelo Parse.

Permissões de classe: Public sem permissões; Authenticated com Read e Write; Add field desmarcado. O Cloud Code atribui ACL privada ao proprietário, valida os dados e impede troca de proprietário. O arquivo cloud/main.js deve estar publicado no Back4App. No aplicativo usado nesta entrega, a imposição de ACL privada e o isolamento entre contas foram verificados pela API.

Nunca inclua Master Key no frontend, no GitHub ou em prints. A Master Key anteriormente compartilhada precisa ser regenerada no painel, caso isso ainda não tenha sido feito. As chaves de cliente não substituem ACL e permissões de classe.

## Evidências e limites

- 12 testes locais passaram: 8 cenários de regras e 4 cenários do painel com DOM/API simulados. Resultado em docs/evidencias/testes-locais.txt.
- A integração real registra cada verificação e sua limpeza em docs/evidencias/integracao-back4app.json. Somente dados temporários próprios foram usados; nenhuma Master Key foi utilizada.
- O usuário confirmou anteriormente cadastro/login, sessão após recarregar, logout e senha incorreta. A nova interface de chamados ainda precisa ser conferida manualmente no navegador.
- A suíte Playwright foi preparada, mas não foi validada neste ambiente porque o Chromium não iniciou. Testes DOM não comprovam aparência visual.
- Não foram realizados push, PR, publicação Azure ou execução de workflow nesta etapa. O ZIP não contém histórico Git.

## Executar verificações

Com Node.js 22 ou superior:

```sh
npm ci
npm test
```

Para os testes de navegador com API simulada (exigem Chromium disponível):

```sh
npx playwright install chromium
npm run test:browser
```

Teste real opcional, com Python 3. Cria duas contas temporárias e remove os próprios dados ao terminar:

```sh
python tests/integracao-back4app.py --confirmar
```

## Ainda pendente

Conferência manual do painel; integração da versão ao GitHub com histórico e PR; workflow YAML; publicação e validação em Azure; materiais finais conforme os documentos da disciplina. Anexos não foram implementados nesta versão.

A documentação histórica em docs/README-versao-firebase.md descreve a versão anterior e não deve orientar a execução atual.
