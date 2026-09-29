<!-- © 2026 Gabriel Mota Silva. Todos os direitos reservados. Consulte ../COPYRIGHT.md e ../LICENSE. -->

# Memorial Técnico de Desenvolvimento

## Objetivo
Portal web para registrar demandas internas e acompanhar sua evolução.

## Tecnologias e justificativas
- Node.js e JavaScript: mesma linguagem no backend e frontend.
- HTTP nativo: reduz dependências para este escopo e deixa explícito o fluxo de requisições.
- SQLite / node:sqlite: persistência SQL em arquivo, simples de executar localmente.
- HTML, CSS e JavaScript: interface sem etapa de compilação, adaptável a telas menores.
- crypto.scrypt: deriva hash de senha com salt aleatório.

## Arquitetura
O navegador consome endpoints JSON. O servidor autentica a sessão, valida os dados, aplica regras de negócio e consulta SQLite. A estrutura foi mantida enxuta para um projeto de avaliação júnior; se crescer, rotas, serviços e repositórios podem ser separados.

## Modelagem
As tabelas users e requests têm relação um-para-muitos. As solicitações guardam título, descrição, categoria, status, solicitante e datas. O schema.sql documenta a estrutura.

## Segurança e limitações
O login usa hash de senha e cookie HttpOnly com SameSite=Strict. Consultas SQL usam parâmetros e campos são validados no servidor. As sessões ficam em memória; não há limitação de tentativas nem proteção CSRF completa. Para produção, adicionar HTTPS, cookie Secure, gestão de perfis, sessões persistentes, auditoria, monitoramento e testes de segurança.

## Regras implementadas
- Login necessário para operações internas.
- Novas solicitações iniciam como Aberto.
- Apenas o solicitante edita/exclui enquanto a solicitação está Aberta.
- Filtros por período, categoria, status e título.
- Dashboard conta total, abertas, em atendimento e concluídas.
- Status aceitos: Aberto, Em Atendimento e Concluído.

## Testes e análise crítica
Execute os cenários do README antes de entregar: autenticação, criação, filtros, mudança de status, edição, exclusão e persistência após reinício. Registre apenas testes realmente executados e inclua capturas reais da aplicação.

Melhorias futuras: testes automatizados, paginação, auditoria, migrações, perfis de acesso, limite de tentativas, sessão persistente e implantação com Docker/CI-CD.
