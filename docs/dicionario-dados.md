<!-- © 2026 Gabriel Mota Silva. Todos os direitos reservados. Consulte ../COPYRIGHT.md e ../LICENSE. -->

# Dicionário de Dados

## Tabela users
- id: chave primária numérica.
- username: nome de acesso único.
- salt: valor aleatório usado no cálculo do hash.
- pass: hash derivado da senha; não armazena senha em texto puro.
- name: nome exibido para o solicitante.

## Tabela requests
- id: código único da solicitação.
- title: título obrigatório, entre 3 e 120 caracteres.
- description: descrição obrigatória, entre 3 e 5.000 caracteres.
- category: TI, RH, Compras, Financeiro ou Infraestrutura.
- status: Aberto, Em Atendimento ou Concluído; padrão Aberto.
- user_id: identificador do solicitante.
- created_at: data e hora da abertura.
- updated_at: data e hora da última alteração.

## Relacionamentos
Um usuário pode criar várias solicitações. Cada solicitação pertence a um solicitante. Índices foram definidos para status e categoria.
