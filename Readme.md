# NuvemDesk

Aplicação web para organizar chamados de TI. Cada usuário pode acessar sua conta e gerenciar seus próprios chamados.

Projeto final da disciplina Desenvolvimento de Software em Nuvem — UNIFOR.
Entrega e apresentação: 11/11/2026.

## Links

- Produção: https://nuvemdesk-ten.vercel.app
- Desenvolvimento no Codespaces: https://vigilant-spork-jjq544p9grgj3q6g7-8000.app.github.dev
- Código: https://github.com/cristian160/nuvemdesk-firebase

O link do Codespaces depende do ambiente e do servidor ativos.
Pode aparecer um aviso do GitHub antes do acesso; selecione Continue.
A Vercel fornece o endereço de produção.

## Funcionalidades

- Cadastro, login, logout e restauração da sessão.
- Criação, consulta, edição e exclusão dos próprios chamados.
- Status Aberto, Em andamento e Concluído.
- Filtro por status e contadores.
- Validação dos dados no servidor.
- Controle de acesso por proprietário.

## Tecnologias e arquitetura

- HTML, CSS e JavaScript na interface.
- SDK Parse para comunicação com o Back4App.
- Back4App para autenticação, banco de dados e Cloud Code.
- Vercel para hospedagem da interface.
- GitHub para versionamento e Pull Requests.
- GitHub Actions para testes automatizados.
- VS Code e GitHub Codespaces para execução e desenvolvimento.

O navegador carrega a interface da Vercel e se comunica por HTTPS
com o Back4App. A versão anterior utilizava Firebase; as contas antigas
não foram importadas.

Após dificuldades de acesso ao Azure e à Oracle, a publicação foi
realizada na Vercel, autorizada pelo professor como última alternativa.

## Executar localmente ou no Codespaces

Na pasta do projeto, com Python 3 instalado:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

No computador, abra http://localhost:8000.
No Windows, caso necessário, substitua python3 por python.

No Codespaces, abra a aba Portas e acesse a porta 8000.
Para compartilhar o endereço, configure sua visibilidade como Public.

É necessária conexão com a internet para acessar o Back4App.
Não é necessário iniciar emuladores Firebase.

## Estrutura

- index.html: interface.
- style.css: aparência.
- script.js: autenticação e sessão.
- chamados.js: operações, filtros e contadores.
- config.js: identificadores públicos de conexão.
- cloud/main.js: validações e regras do Back4App.
- vendor/: SDK Parse e licença.
- tests/: testes.
- docs/: documentação e evidências.
- .github/workflows/testes.yml: automação dos testes.

firebase.json e storage.rules são arquivos da versão anterior.
Eles não são necessários para executar a versão Back4App.

## Banco e segurança

A classe Chamado contém titulo, descricao, status e proprietario,
além dos campos gerenciados pelo Parse.

proprietario é um Pointer para _User.
O Cloud Code valida os campos e estabelece ACL privada,
permitindo leitura e escrita apenas ao proprietário.
Não é permitido transferir a propriedade pelo cliente.

A Master Key não deve ser incluída no frontend ou no repositório.
As chaves de cliente não substituem as permissões do servidor.

## Testes

Com Node.js 22 ou superior:

```bash
npm ci
npm test
```

O GitHub Actions executa os testes em push e Pull Requests.
Foram aprovados 12 testes: 8 de regras do Cloud Code e 4 do painel
com DOM e API simulados.

Separadamente, passaram 19 verificações na API real do Back4App,
utilizando dados temporários removidos ao final.

Os testes manuais confirmaram autenticação, CRUD, persistência,
filtros e isolamento entre contas. A publicação foi acessada pelo celular.
O acesso público do Codespaces foi conferido em janela anônima.

A suíte Playwright foi preparada, mas não foi executada com sucesso
no ambiente de preparação. Ela não integra os 12 testes aprovados.

## Demonstração

1. Entrar na conta.
2. Criar um chamado.
3. Recarregar e conferir a persistência.
4. Editar o status.
5. Conferir filtro e contadores.
6. Excluir com confirmação.
7. Usar outra conta para demonstrar o isolamento.

## Equipe e responsabilidades

- Cristian Henrique: desenvolvimento, integração, testes e publicação.
- André: relatório técnico e organização.
- João Ivys: slides e conferência das telas.
- Juliane: documentação do banco e testes entre contas.
- David: evidências do GitHub, links e apoio à publicação.

## Limites

Esta versão não inclui anexos, notificações externas ou atendimento
compartilhado entre técnicos. A atualização da lista ocorre após as
operações ou pelo botão Atualizar lista.