<!-- © 2026 Gabriel Mota Silva. Todos os direitos reservados. Consulte ../COPYRIGHT.md e ../LICENSE. -->

# Memorial Técnico de Desenvolvimento

## Objetivo
Portal web para registrar demandas internas e acompanhar sua evolução, agora com caminhos reproduzíveis de instalação local e execução conteinerizada.

## Tecnologias e justificativas
- Node.js e JavaScript: mesma linguagem no backend e no frontend.
- HTTP nativo: reduz dependências e deixa explícito o fluxo de requisições.
- SQLite / node:sqlite: persistência SQL em arquivo sem servidor de banco separado.
- HTML, CSS e JavaScript: interface sem etapa de compilação.
- Docker Compose e Nginx: ambiente padronizado com frontend e backend separados.

## Arquitetura
O navegador consome endpoints JSON. O backend autentica a sessão, valida dados, aplica regras de negócio e consulta SQLite. O frontend local pode ser servido por `frontend-server.js`, que encaminha chamadas `/api/*` ao backend. No Docker, Nginx entrega os arquivos estáticos e faz proxy para o serviço backend pela rede privada.

## Configuração e persistência
- `config.js` lê `.env` sem dependência npm externa; variáveis já definidas no ambiente têm prioridade.
- `migrate.js` aplica o schema idempotente e cria usuário e dados de demonstração quando necessário.
- `DB_PATH` configura o arquivo SQLite; Compose usa volume nomeado persistente.
- `setup.bat` e `setup.sh` verificam Node/npm, criam `.env`, instalam dependências e executam migrations.

## Segurança e limitações
O login usa hash de senha com salt e cookie HttpOnly/SameSite=Strict. Consultas SQL usam parâmetros e os campos são validados no servidor. As sessões ficam em memória; não há limitação de tentativas, MFA ou auditoria. A senha padrão é apenas para demonstração. Antes de produção, adicionar HTTPS, cookie Secure, proteção CSRF adequada, perfis e permissões, rate limiting, auditoria e monitoramento.

## Regras implementadas
- Login necessário para operações internas.
- Novas solicitações iniciam como Aberto.
- Apenas o solicitante edita/exclui enquanto a solicitação está Aberta.
- Filtros por período, categoria, status e título.
- Dashboard conta total, abertas, em atendimento e concluídas.

## Execução e validação
Consulte [README.md](../README.md) para instalação, comandos, credenciais, Docker Compose e solução de problemas. Use `npm run check`, `npm run migrate` e `docker compose config` antes da entrega. Os testes de execução devem ser registrados somente após efetivamente executados.

## Melhorias futuras
Testes automatizados de integração, paginação, auditoria, perfis de acesso, limitação de tentativas, sessões persistentes, CI/CD e suporte a um banco de dados servidor em cenários de maior escala.

---

© Gabriel Mota Silva. Este projeto foi desenvolvido exclusivamente para avaliação técnica e demonstração de competências profissionais. A disponibilização deste código para análise não constitui cessão de propriedade intelectual, licença de uso comercial ou transferência de direitos autorais.
