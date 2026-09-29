# Guia técnico de execução e alterações

© 2026 Gabriel Mota Silva. Todos os direitos reservados.

## Objetivo

Documentar as alterações de estrutura necessárias para que um avaliador possa configurar e executar o Portal de Solicitações Internas em uma máquina limpa, usando Node.js ou Docker Compose.

## Arquitetura resultante

- **Backend:** Node.js 22+, API JSON na porta 3000 e SQLite.
- **Frontend:** arquivos estáticos em `public/`; localmente servidos por `frontend-server.js` na porta 5173, ou por Nginx no container frontend.
- **Proxy de API:** o frontend encaminha chamadas `/api/*` ao backend; não é necessária configuração de CORS no navegador.
- **Persistência:** SQLite em `DB_PATH`; no Compose, volume nomeado `portal_data`.
- **Configuração:** `config.js` lê `.env` sem exigir dependências npm externas; variáveis do ambiente prevalecem.
- **Migrações e seed:** `migrate.js` aplica o schema idempotente, cria o administrador de demonstração se ausente e insere três solicitações de exemplo se a tabela estiver vazia.

## Alterações implementadas

1. **Configuração por ambiente:** adicionados `HOST`, `PORT`, `FRONTEND_PORT`, `BACKEND_URL`, `DB_PATH`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` e `SEED_DEMO_DATA`.
2. **Migrações repetíveis:** `schema.sql` usa `IF NOT EXISTS` para tabelas e índices. Executar `npm run migrate` várias vezes não duplica schema nem seed.
3. **Conta de demonstração:** login por e-mail `admin@portal.local` e senha inicial `Admin@123`, configuráveis via ambiente.
4. **Execução em dois processos:** scripts npm para backend e frontend, com proxy de API local.
5. **Instalação guiada:** `setup.bat` e `setup.sh` verificam Node/npm, criam `.env`, executam `npm install` e a migração.
6. **Docker Compose:** containers independentes para backend e frontend, rede interna, healthcheck, dependência do frontend em backend saudável e volume persistente para SQLite.
7. **Documentação:** README com pré-requisitos, execução, configuração, variáveis, credenciais, estrutura, troubleshooting e avisos de segurança.

## Procedimento de validação recomendado

Execute na raiz do repositório:

```bash
node --version
npm --version
npm run check
npm run migrate
npm run migrate
npm run start:backend
```

Em outro terminal, execute `npm run start:frontend` e verifique:

- `http://localhost:5173` abre a tela de login.
- `http://localhost:3000/api/health` responde JSON com `ok: true`.
- O login de demonstração funciona num banco recém-criado.
- O dashboard carrega os dados de exemplo.
- Criar solicitação e recarregar mantém os dados no SQLite.

Para Docker, execute `docker compose config`, depois `docker compose up --build`; confira logs e os mesmos endpoints. Para validar persistência, crie uma solicitação, rode `docker compose down` (sem `-v`) e inicie novamente.

## Decisões e limitações

- O SQLite mantém simples a execução de avaliação e não exige um servidor de banco separado.
- Não existem dependências de frontend/npm externas; `npm install` mantém o fluxo de instalação familiar e gera o lockfile local.
- A senha inicial é de demonstração e deve ser alterada antes de qualquer exposição pública.
- Sessões em memória não sobrevivem a reinício do backend.
- A imagem do frontend é independente e faz proxy para o backend pela rede interna Docker.
- O script de migração é idempotente para o schema e seed, mas não redefine a senha de um usuário que já existe; alterar senha em ambiente já inicializado requer uma operação de administração apropriada ou recriar o banco descartável.

## Arquivos novos ou modificados

- Modificados: `README.md`, `server.js`, `public/index.html`, `schema.sql`, `package.json`, `.gitignore`, `docs/memorial-tecnico.md`.
- Novos: `.env.example`, `config.js`, `migrate.js`, `frontend-server.js`, `setup.bat`, `setup.sh`, `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf`, `docker-compose.yml`, este guia.

---

© Gabriel Mota Silva. Este projeto foi desenvolvido exclusivamente para avaliação técnica e demonstração de competências profissionais. A disponibilização deste código para análise não constitui cessão de propriedade intelectual, licença de uso comercial ou transferência de direitos autorais.
