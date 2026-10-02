# Automação local — Portal de Solicitações Internas

© 2026 Gabriel Mota Silva. Todos os direitos reservados.

## Execução rápida no Windows

1. Abra a pasta do projeto.
2. Execute `EXECUTAR-PORTAL.bat`.
3. O script instala dependências, cria o `.env`, executa a migration, inicia backend e frontend e abre o navegador.
4. Acesse `http://localhost:5173`.

## Encerramento

Execute `PARAR-PORTAL.bat` para encerrar os serviços nas portas 3000 e 5173.

## Validação

- `npm run check` verifica a sintaxe.
- `npm test` executa o smoke test de integração.
- `npm run migrate` prepara o banco SQLite e o usuário de demonstração.
- `docker compose up --build` é o fluxo reproduzível para Docker, quando Docker Desktop estiver instalado.

## Demonstração

E-mail: `admin@portal.local`
Senha: `Admin@123`

## Observação

O ambiente local desta máquina não possui Docker Desktop instalado no momento. A execução sem Docker foi validada com Node.js 26.7.0, npm 11.19.0, SQLite e os testes automatizados.
