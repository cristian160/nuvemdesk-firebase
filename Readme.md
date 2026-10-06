# NuvemDesk — Central de Chamados

Aplicação web de suporte de TI desenvolvida para demonstrar o uso do Firebase como Backend as a Service (BaaS).

## Objetivo

O NuvemDesk permite que usuários criem uma conta, façam login e gerenciem chamados de suporte. A aplicação utiliza HTML, CSS e JavaScript no frontend e serviços do Firebase no backend.

## Funcionalidades

- Cadastro de usuário com e-mail e senha.
- Login, logout e controle de sessão.
- Criação de chamados.
- Visualização dos chamados da conta conectada.
- Edição e exclusão de chamados.
- Alteração de status: aberto, em andamento e concluído.
- Atualização automática da lista em tempo real.
- Upload e download de imagens e PDFs de até 5 MB na demonstração local.
- Regras de segurança para separar os dados de cada usuário.
- Interface responsiva com tema visual próprio.

## Tecnologias

- HTML5
- CSS3
- JavaScript (módulos ES)
- Firebase Authentication
- Cloud Firestore
- Firebase Storage Emulator
- Firebase Local Emulator Suite
- GitHub

## Arquitetura

```text
Navegador
   |
   | HTML, CSS e JavaScript
   |
Firebase Authentication ---- identifica o usuário
   |
Cloud Firestore ------------ armazena os chamados
   |
Storage Emulator ----------- demonstra arquivos localmente
```

Os chamados são organizados no Firestore desta forma:

```text
usuarios/{uid}/chamados/{idDoChamado}
```

O `uid` identifica a conta autenticada. As regras do Firestore permitem que cada usuário acesse somente os próprios chamados.

## Estrutura dos arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da interface |
| `style.css` | Tema, layout e responsividade |
| `script.js` | Autenticação, CRUD, tempo real e Storage |
| `firebase.json` | Configuração do emulador |
| `storage.rules` | Regras de acesso aos arquivos |
| `.gitignore` | Arquivos temporários ignorados pelo Git |

## Pré-requisitos

- Windows, macOS ou Linux.
- Node.js instalado.
- Java instalado para o Firebase Emulator Suite.
- Visual Studio Code.
- Extensão Live Server no VS Code.
- Firebase CLI instalada.

No Windows PowerShell, a instalação da CLI pode ser feita com:

```powershell
npm.cmd install -g firebase-tools
```

## Como executar

1. Baixe ou clone este repositório.
2. Abra a pasta no VS Code.
3. Abra o terminal na pasta que contém o arquivo `firebase.json`.
4. Inicie o Storage Emulator:

```powershell
firebase.cmd emulators:start --only storage --project projeto-em-nuvem --export-on-exit=./dados-emulador
```

5. Mantenha esse terminal aberto.
6. Abra o `index.html` com o Live Server.
7. Acesse o endereço mostrado pelo Live Server.
8. Use uma conta de teste para entrar na aplicação.

O painel do emulador fica disponível em:

```text
http://127.0.0.1:4000
```

Para encerrar, pressione `Ctrl + C` no terminal e aguarde a exportação dos dados.

Para iniciar novamente usando os dados exportados:

```powershell
firebase.cmd emulators:start --only storage --project projeto-em-nuvem --import=./dados-emulador --export-on-exit=./dados-emulador
```

## Demonstração

A demonstração pode seguir esta ordem:

1. Criar uma conta.
2. Fazer login.
3. Criar um chamado.
4. Mostrar o chamado no Cloud Firestore.
5. Editar o chamado.
6. Abrir duas abas e demonstrar a atualização em tempo real.
7. Excluir um chamado.
8. Enviar e baixar um arquivo pelo Storage Emulator.
9. Mostrar as regras de segurança e o painel do emulador.
10. Fazer logout.

## Segurança

As regras usam o usuário autenticado e o `uid` do caminho do documento. Assim, uma conta não deve ler, editar ou excluir chamados de outra conta.

Os arquivos permitidos na demonstração local são:

- PNG.
- JPEG.
- PDF.

O tamanho máximo configurado é de 5 MB.

## Limitação da demonstração local

O Storage está conectado ao emulador por meio de `connectStorageEmulator`. Portanto, os arquivos enviados ficam no computador que executa o emulador.

A autenticação e o Cloud Firestore usam o projeto Firebase configurado no código. O Storage em nuvem exigiria uma configuração de cobrança compatível com as regras atuais do Firebase. Por isso, esta versão usa o emulador para a demonstração gratuita.

## Equipe

Projeto acadêmico sobre Computação em Nuvem, Sistemas Distribuídos e Backend as a Service.

## Licença

Projeto desenvolvido para fins acadêmicos.

