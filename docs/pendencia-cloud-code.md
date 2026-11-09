# Verificação do Cloud Code — atualização em 09/11/2026

A divergência observada em 08/11 foi corrigida após substituir o código de exemplo por cloud/main.js e publicar novamente.

A API agora remove os espaços externos de título/descrição e impõe ACL privada, mesmo quando o cliente tenta enviar ACL pública. Uma segunda conta não conseguiu ler, encontrar, alterar nem excluir o chamado da primeira. O acesso anônimo foi bloqueado. O retorno observado para criação anônima foi HTTP 404 / Parse 101; o teste foi ajustado para reconhecer esse retorno de acesso negado.

A execução completa e a limpeza de dados temporários estão registradas em evidencias/integracao-back4app.json. A suíte local passou nos 12 cenários registrados em evidencias/testes-locais.txt. A conferência visual e o teste manual do painel de chamados pelo usuário continuam pendentes.
