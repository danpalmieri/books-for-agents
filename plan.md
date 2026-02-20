# Books for Agents - Claude Code Prompt

Cole este prompt no Claude Code para iniciar o projeto:

---

## Prompt

```
Crie o projeto "Books for Agents" - uma knowledge base open source de resumos de livros otimizada para consumo por LLMs e agentes de IA via MCP (Model Context Protocol).

## Visão do Projeto

Um repositório open source que funciona como uma biblioteca de resumos estruturados de livros em Markdown, acessível via MCP Server. Qualquer agente de IA pode se conectar e buscar conhecimento de livros para enriquecer suas respostas.

Exemplo de uso: um usuário pede pro agente dele "me ajude a influenciar pessoas no trabalho" → o agente consulta o Books for Agents via MCP → encontra o resumo de "How to Win Friends and Influence People" → usa esse conhecimento estruturado na resposta.

## Stack

- TypeScript
- MCP SDK (@modelcontextprotocol/sdk)
- Repositório de conteúdo em Markdown (pasta /books)
- Bun como runtime

## Estrutura do Projeto

```
books-for-agents/
├── README.md                    # Documentação principal + como contribuir
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # MCP Server principal
│   ├── tools/
│   │   ├── search-books.ts      # Tool: busca por tema/palavra-chave
│   │   ├── get-book.ts          # Tool: retorna resumo completo de um livro
│   │   └── list-categories.ts   # Tool: lista categorias disponíveis
│   └── utils/
│       ├── markdown-parser.ts   # Parser dos arquivos .md dos livros
│       └── search-engine.ts     # Busca simples por relevância (TF-IDF ou similar leve)
├── books/
│   ├── _template.md             # Template padrão para novos livros
│   ├── business/
│   │   ├── how-to-win-friends-and-influence-people.md
│   │   └── the-lean-startup.md
│   ├── psychology/
│   │   ├── thinking-fast-and-slow.md
│   │   └── atomic-habits.md
│   ├── technology/
│   │   ├── the-pragmatic-programmer.md
│   │   └── clean-code.md
│   └── self-improvement/
│       ├── deep-work.md
│       └── the-7-habits-of-highly-effective-people.md
└── scripts/
    └── validate-books.ts        # Valida que todos os .md seguem o template
```

## Template de Livro (books/_template.md)

Cada livro DEVE seguir este formato Markdown estruturado:

```markdown
---
title: "Título do Livro"
author: "Autor"
year: 2020
category: "business"
tags: ["liderança", "comunicação", "negociação"]
language: "pt-BR"
isbn: "978-..."
---

# Título do Livro

> **Resumo em uma frase:** [Uma frase que captura a essência do livro]

## Principais Ideias

### 1. [Ideia Central 1]
[Explicação em 2-3 parágrafos]

**Aplicação prática:** [Como aplicar essa ideia]

### 2. [Ideia Central 2]
[Explicação em 2-3 parágrafos]

**Aplicação prática:** [Como aplicar essa ideia]

### 3. [Ideia Central 3]
[Explicação em 2-3 parágrafos]

**Aplicação prática:** [Como aplicar essa ideia]

[Até 7 ideias centrais]

## Frameworks e Modelos

[Qualquer framework, modelo mental ou metodologia que o livro apresenta, em formato estruturado]

## Citações-Chave

> "Citação relevante 1" — Autor

> "Citação relevante 2" — Autor

## Conexões com Outros Livros

- [[outro-livro]]: Como se relaciona
- [[outro-livro-2]]: Como se relaciona

## Quando Usar Este Conhecimento

[Lista de situações em que um agente deveria recorrer a este livro]
- Quando o usuário perguntar sobre...
- Quando o contexto envolver...
```

## MCP Tools a Implementar

### 1. `search_books`
- **Input:** `{ query: string, category?: string, limit?: number }`
- **Output:** Lista de livros relevantes com título, autor, resumo de uma frase e score de relevância
- A busca deve funcionar por semântica simples (match em tags, título, conteúdo)

### 2. `get_book`
- **Input:** `{ slug: string }` ou `{ title: string }`
- **Output:** Conteúdo completo do resumo em Markdown

### 3. `list_categories`
- **Input:** `{}`
- **Output:** Lista de categorias com quantidade de livros em cada

### 4. `get_book_section`
- **Input:** `{ slug: string, section: "ideias" | "frameworks" | "citacoes" | "conexoes" | "quando-usar" }`
- **Output:** Apenas a seção específica do livro (para economizar tokens)

## MCP Resources

Registrar como resource:
- `books://catalog` → catálogo completo (metadata de todos os livros)
- `books://{slug}` → resumo completo de um livro específico

## Requisitos

1. Inicializar com 8 livros de exemplo (2 por categoria) com resumos REAIS e substanciais (não placeholders)
2. README.md completo com:
   - O que é o projeto e pra quem é
   - Como instalar e usar o MCP Server
   - Como contribuir com novos livros
   - Configuração para Claude Desktop, Cursor, etc
3. O search engine deve ser leve e sem dependências externas
4. Código limpo, tipado, bem documentado
5. Script de validação que garante que todos os livros seguem o template
6. .github/CONTRIBUTING.md com guidelines claros
7. Licença MIT para o código, CC BY-SA 4.0 para o conteúdo dos livros

## Livros Iniciais (criar com resumos reais e completos)

1. **How to Win Friends and Influence People** - Dale Carnegie (business)
2. **The Lean Startup** - Eric Ries (business)
3. **Thinking, Fast and Slow** - Daniel Kahneman (psychology)
4. **Atomic Habits** - James Clear (psychology)
5. **The Pragmatic Programmer** - Hunt & Thomas (technology)
6. **Clean Code** - Robert C. Martin (technology)
7. **Deep Work** - Cal Newport (self-improvement)
8. **The 7 Habits of Highly Effective People** - Stephen Covey (self-improvement)

IMPORTANTE: Os resumos devem ser insights estruturados e análises originais, NÃO cópia de conteúdo protegido. Foque em frameworks, modelos mentais e aplicações práticas extraídos dos livros.

Comece criando toda a estrutura, o MCP server funcional, e todos os 8 livros com conteúdo real e substancial.
```

---

## Depois de criar o projeto

Próximos passos manuais:
1. Criar repo no GitHub: `github.com/danpalmieri/books-for-agents`
2. Publicar no npm: `npx books-for-agents` 
3. Submeter no MCP servers directory do Anthropic
4. Post no X/Twitter anunciando o projeto
5. Vídeo no YouTube mostrando o build
