# 📚 Books for Agents

Uma knowledge base open source de resumos estruturados de livros, otimizada para consumo por LLMs e agentes de IA via **MCP (Model Context Protocol)**.

Qualquer agente de IA pode se conectar e buscar conhecimento de livros para enriquecer suas respostas.

## Como funciona

```
Usuário: "Me ajude a influenciar pessoas no trabalho"
    ↓
Agente consulta Books for Agents via MCP
    ↓
Encontra "Como Fazer Amigos e Influenciar Pessoas"
    ↓
Usa o conhecimento estruturado na resposta
```

## Livros disponíveis

| Categoria | Livros |
|-----------|--------|
| **Business** | Como Fazer Amigos e Influenciar Pessoas, The Lean Startup |
| **Psychology** | Rápido e Devagar, Hábitos Atômicos |
| **Technology** | O Programador Pragmático, Código Limpo |
| **Self-Improvement** | Trabalho Focado, Os 7 Hábitos das Pessoas Altamente Eficazes |

## Instalação

### Via npx (recomendado)

```bash
npx books-for-agents
```

### Instalação local

```bash
git clone https://github.com/danpalmieri/books-for-agents.git
cd books-for-agents
npm install
npm run build
```

## Configuração do MCP Server

### Claude Desktop

Adicione ao seu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "books-for-agents": {
      "command": "npx",
      "args": ["-y", "books-for-agents"]
    }
  }
}
```

**Caminho do arquivo de configuração:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Claude Code

```bash
claude mcp add books-for-agents -- npx -y books-for-agents
```

### Cursor

Adicione ao `.cursor/mcp.json` do seu projeto:

```json
{
  "mcpServers": {
    "books-for-agents": {
      "command": "npx",
      "args": ["-y", "books-for-agents"]
    }
  }
}
```

### Instalação local (desenvolvimento)

Se clonou o repositório:

```json
{
  "mcpServers": {
    "books-for-agents": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## Tools disponíveis

### `search_books`

Busca livros por tema, palavra-chave ou pergunta.

```json
{
  "query": "como liderar uma equipe",
  "category": "business",
  "limit": 3
}
```

### `get_book`

Retorna o resumo completo de um livro.

```json
{
  "slug": "how-to-win-friends-and-influence-people"
}
```

Ou por título:

```json
{
  "title": "Lean Startup"
}
```

### `get_book_section`

Retorna uma seção específica para economizar tokens.

```json
{
  "slug": "atomic-habits",
  "section": "frameworks"
}
```

Seções disponíveis: `ideias`, `frameworks`, `citacoes`, `conexoes`, `quando-usar`

### `list_categories`

Lista todas as categorias com contagem de livros.

## Resources MCP

- `books://catalog` — Catálogo completo com metadata de todos os livros
- `books://{slug}` — Resumo completo de um livro específico

## Como contribuir

Veja [CONTRIBUTING.md](.github/CONTRIBUTING.md) para guidelines detalhados.

### Resumo rápido

1. Fork o repositório
2. Copie `books/_template.md` para a categoria correta
3. Escreva o resumo seguindo o template
4. Rode `npm run validate` para verificar
5. Abra um PR

## Estrutura do projeto

```
books-for-agents/
├── src/
│   ├── index.ts                 # MCP Server
│   ├── tools/                   # Implementação dos tools
│   └── utils/                   # Parser e search engine
├── books/
│   ├── _template.md             # Template para novos livros
│   ├── business/
│   ├── psychology/
│   ├── technology/
│   └── self-improvement/
└── scripts/
    └── validate-books.ts        # Validação dos livros
```

## Licenças

- **Código:** [MIT](LICENSE)
- **Conteúdo dos livros:** [CC BY-SA 4.0](LICENSE-CONTENT)

Os resumos são análises originais e insights estruturados, não cópias de conteúdo protegido.

## Autor

**Daniel Palmieri** — [@danpalmieri](https://github.com/danpalmieri)
