# Portal de Solicitações Internas

**Autor:** Gabriel Mota Silva · **Finalidade:** avaliação técnica e demonstração profissional · **Criado em:** 29/09/2026

Aplicação web full stack para registrar, filtrar e acompanhar solicitações internas. Inclui autenticação, painel de indicadores, estados de atendimento e persistência SQLite. O repositório oferece execução local com Node.js ou ambiente conteinerizado com Docker Compose.

## Tecnologias

- **Backend:** Node.js 22 LTS, HTTP nativo e módulo `node:sqlite`.
- **Frontend:** HTML5, CSS3 e JavaScript sem etapa de compilação.
- **Banco:** SQLite, persistido em volume/diretório local.
- **Contêineres:** Docker, Docker Compose e Nginx (servidor estático e proxy da API).
- **Testes de sintaxe:** `node --check`.

Não são necessárias dependências npm externas para executar a aplicação. O módulo `node:sqlite` requer Node.js 22.13 ou superior.

## Funcionalidades

- Login por e-mail e senha com hash de senha usando `crypto.scrypt`.
- Sessão com cookie HttpOnly e SameSite=Strict.
- Criação, consulta, pesquisa e filtragem de solicitações.
- Categorias: TI, RH, Compras, Financeiro e Infraestrutura.
- Estados: Aberto, Em Atendimento e Concluído.
- Edição e exclusão de solicitações abertas pelo solicitante.
- Painel com totalizadores e solicitações recentes.
- Migrações idempotentes e dados de demonstração inseridos automaticamente.
- Banco persistente em SQLite.
- Frontend e backend executáveis separadamente, ou por Docker Compose.

## Pré-requisitos

### Opção A — Docker (recomendado para avaliadores)
- Docker Desktop atualizado no Windows/macOS, ou Docker Engine no Linux.
- Docker Compose v2 (comando `docker compose`). A forma legada `docker-compose` também pode funcionar se instalada.

### Opção B — Execução local
- Node.js **22.13 ou superior**.
- npm (incluído no instalador oficial do Node.js).
- Git, para clonar o repositório.
- Windows PowerShell/CMD, ou Bash no Linux/macOS.

## Deploy local com Docker Compose

Esta é a forma mais simples de executar a aplicação. O Docker cria a rede interna, constrói as imagens, inicializa o banco, cria o administrador de demonstração e mantém os dados em volume.

**Passo 1 — Clonar o repositório**
```bash
git clone https://github.com/Gmotas/Portal-Solicitacoes-Internas.git
```

**Passo 2 — Entrar na pasta**
```bash
cd Portal-Solicitacoes-Internas
```

**Passo 3 — Construir e iniciar todo o ambiente**
```bash
docker-compose up --build
```

Com Docker Compose v2, também pode utilizar `docker compose up --build`.

**Passo 4 — Abrir no navegador**
- Frontend: http://localhost:5173
- Backend/API: http://localhost:3000
- Verificação de saúde: http://localhost:3000/api/health

O frontend encaminha chamadas `/api/*` ao backend pela rede privada do Compose. O banco SQLite fica no volume nomeado `portal_data`, persistindo após parar ou recriar os containers.

### Comandos úteis do Docker

```bash
# Executar em segundo plano
docker compose up --build -d

# Ver logs de todos os serviços
docker compose logs -f

# Ver apenas backend
docker compose logs -f backend

# Parar os serviços sem apagar os dados
docker compose down

# Parar e APAGAR o volume do banco (ação destrutiva)
docker compose down -v
```

## Execução local sem Docker

### 1. Clonar e acessar
```bash
git clone https://github.com/Gmotas/Portal-Solicitacoes-Internas.git
cd Portal-Solicitacoes-Internas
```

### 2. Executar o instalador

**Windows (CMD):**
```bat
setup.bat
```

**Linux/macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

O script verifica Node.js e npm, instala dependências npm (não há pacotes externos obrigatórios), copia `.env.example` para `.env` se necessário, executa as migrações e cria os dados iniciais.

### 3. Iniciar backend e frontend

Abra dois terminais na raiz do projeto.

Terminal 1 — Backend/API:
```bash
npm run start:backend
```

Terminal 2 — Frontend:
```bash
npm run start:frontend
```

Acesse o frontend em http://localhost:5173. A API estará em http://localhost:3000. Para execução simplificada, `npm start` inicia o backend que também serve a interface em http://localhost:3000.

## Banco de dados e migrações

- Arquivo local padrão: `./data/portal.db`.
- Docker: volume nomeado `portal_data`, montado em `/app/data`.
- O schema é mantido em `schema.sql`; `migrate.js` cria as tabelas/índices sem duplicá-los e inicializa a conta de demonstração e três solicitações de exemplo quando o banco ainda está vazio.
- Executar migrações manualmente: `npm run migrate`.
- O banco local e os volumes de dados não devem ser commitados no Git.

Para recriar completamente os dados locais, pare os processos e apague o arquivo `data/portal.db`. No Docker, `docker compose down -v` apaga o volume do banco. **Essas ações removem os dados existentes.**

## Variáveis de ambiente

O projeto lê variáveis de `.env` sem depender de biblioteca externa. Copie `.env.example` para `.env`; os valores definidos no ambiente do sistema/contêiner têm prioridade.

| Variável | Padrão | Descrição |
|---|---|---|
| `HOST` | `0.0.0.0` | Interface de rede do backend |
| `PORT` | `3000` | Porta do backend |
| `FRONTEND_PORT` | `5173` | Porta do frontend Node local |
| `BACKEND_URL` | `http://127.0.0.1:3000` | URL do backend usada pelo proxy local |
| `DB_PATH` | `./data/portal.db` | Caminho do arquivo SQLite |
| `ADMIN_EMAIL` | `admin@portal.local` | E-mail criado na inicialização |
| `ADMIN_PASSWORD` | `Admin@123` | Senha inicial do administrador |
| `ADMIN_NAME` | `Administrador` | Nome exibido na interface |
| `SEED_DEMO_DATA` | `true` (exceto se definido como `false`) | Insere exemplos se a tabela de solicitações estiver vazia |

O arquivo `.env` contém configurações locais e é ignorado pelo Git. `.env.example` contém apenas valores de demonstração, nunca use a senha padrão em produção.

## Credenciais de demonstração

- **E-mail:** `admin@portal.local`
- **Senha:** `Admin@123`

A conta é criada apenas se ainda não existir. A senha é armazenada como hash com salt aleatório, nunca em texto puro. Credenciais padrão são exclusivas para demonstração local.

## Estrutura do projeto

```text
Portal-Solicitacoes-Internas/
├── public/                  # HTML, CSS e JavaScript do frontend
├── docs/
│   ├── dicionario-dados.md  # Entidades e campos do banco
│   ├── memorial-tecnico.md  # Arquitetura e decisões
│   └── GUIA-DE-EXECUCAO.md  # Guia técnico das alterações de setup
├── screenshots/             # Capturas da interface
├── data/                    # Criado localmente; banco ignorado pelo Git
├── config.js                # Carregamento de .env sem dependências
├── migrate.js               # Schema idempotente e dados iniciais
├── server.js                # Backend/API (e interface em modo simples)
├── frontend-server.js       # Servidor local de frontend com proxy da API
├── schema.sql               # Schema SQLite
├── Dockerfile.backend       # Imagem do backend
├── Dockerfile.frontend      # Imagem Nginx do frontend
├── nginx.conf               # Arquivos estáticos e proxy /api
├── docker-compose.yml       # Serviços, rede, healthchecks e volume
├── setup.bat                # Instalador Windows
├── setup.sh                 # Instalador Linux/macOS
├── .env.example             # Modelo das variáveis
├── .gitignore
├── README.md
├── COPYRIGHT.md
├── LICENSE
└── package.json
```

## API principal

| Método | Endpoint | Finalidade |
|---|---|---|
| GET | `/api/health` | Verificar disponibilidade do backend |
| POST | `/api/login` | Autenticação |
| POST | `/api/logout` | Encerrar sessão |
| GET | `/api/me` | Consultar sessão |
| GET | `/api/dashboard` | Indicadores |
| GET | `/api/requests` | Listar e filtrar |
| POST | `/api/requests` | Criar solicitação |
| GET | `/api/requests/:id` | Consultar solicitação |
| PATCH | `/api/requests/:id` | Editar solicitação aberta |
| DELETE | `/api/requests/:id` | Excluir solicitação aberta |
| PUT | `/api/requests/:id/status` | Atualizar status |

## Solução de problemas

- **`node:sqlite` não encontrado:** atualize para Node.js 22.13 ou superior e confirme com `node --version`.
- **`npm` não reconhecido:** reinstale Node.js pelo instalador oficial e reabra o terminal.
- **Porta 3000 ou 5173 em uso:** altere `PORT` ou `FRONTEND_PORT` no `.env`; se usar Docker, ajuste o lado esquerdo do mapeamento de portas no Compose.
- **Login rejeitado:** confira `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Se o usuário já existia no banco, mudar a variável não redefine sua senha; para um banco descartável, remova `data/portal.db` e rode `npm run migrate` novamente.
- **Frontend informa que o backend está indisponível:** inicie o backend no primeiro terminal e confirme http://localhost:3000/api/health.
- **Docker não conecta:** confirme que o Docker Desktop/Engine está iniciado e que o plugin Compose funciona com `docker compose version`.
- **Alterações de ambiente não surtem efeito:** recrie os containers com `docker compose up --build -d`; não apague o volume a menos que queira remover o banco.
- **Permissão negada no script Linux/macOS:** rode `chmod +x setup.sh` e depois `./setup.sh`.

## Segurança e limites conhecidos

Esta é uma aplicação de demonstração, não uma implantação de produção. As sessões são mantidas em memória e terminam quando o backend reinicia. O projeto não inclui limitação de tentativas de login, MFA, trilha de auditoria ou gestão avançada de papéis. Antes de exposição pública, use senhas fortes e únicas, HTTPS, cookies Secure, proteção CSRF apropriada, limites de requisições, monitoramento e revisão de autorização. Não publique o arquivo `.env` nem o banco de dados.

## Documentação e autoria

- [Memorial técnico](docs/memorial-tecnico.md)
- [Dicionário de dados](docs/dicionario-dados.md)
- [Guia técnico das alterações](docs/GUIA-DE-EXECUCAO.md)
- [Aviso de direitos autorais](COPYRIGHT.md)
- [Termos de uso](LICENSE)

© Gabriel Mota Silva

Este projeto foi desenvolvido exclusivamente para avaliação técnica e demonstração de competências profissionais. A disponibilização deste código para análise não constitui cessão de propriedade intelectual, licença de uso comercial ou transferência de direitos autorais.

---

Desenvolvido por **Gabriel Mota Silva** · [GitHub](https://github.com/Gmotas)
