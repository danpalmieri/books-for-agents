# Contribuindo com Books for Agents

Obrigado pelo interesse em contribuir! Este guia explica como adicionar novos livros e contribuir com o projeto.

## Adicionando um novo livro

### 1. Escolha um livro

- Livros de não-ficção com insights práticos e aplicáveis
- Livros amplamente reconhecidos e recomendados na área
- Evite livros muito nichados ou obscuros (pelo menos inicialmente)

### 2. Crie o arquivo

1. Copie `books/_template.md`
2. Renomeie para o slug do livro: `nome-do-livro-em-ingles.md`
3. Coloque na categoria correta dentro de `books/`

**Categorias existentes:**
- `business/` — Negócios, empreendedorismo, gestão
- `psychology/` — Psicologia, comportamento, economia comportamental
- `technology/` — Programação, engenharia de software, tecnologia
- `self-improvement/` — Desenvolvimento pessoal, produtividade

Para sugerir uma nova categoria, abra uma issue primeiro.

### 3. Escreva o resumo

**Siga o template rigorosamente.** Cada livro deve conter:

- **Frontmatter** com todos os campos obrigatórios (title, author, year, category, tags, language)
- **Resumo em uma frase** que captura a essência do livro
- **5-7 Principais Ideias** com 2-3 parágrafos cada e aplicação prática
- **Frameworks e Modelos** — metodologias e modelos mentais do livro
- **Citações-Chave** — 3-5 citações relevantes
- **Conexões com Outros Livros** — referências a outros livros no repositório
- **Quando Usar Este Conhecimento** — situações em que um agente deveria recorrer a este livro

### 4. Diretrizes de conteúdo

- Escreva em **português brasileiro (pt-BR)**
- Foque em **insights estruturados e análises originais**, não em reprodução de conteúdo
- Extraia **frameworks, modelos mentais e aplicações práticas**
- Mínimo de **50 linhas** de conteúdo não-vazio (excluindo frontmatter)
- Cada ideia deve ter **aplicação prática** claramente definida
- As conexões devem referenciar livros que existem no repositório usando `[[slug]]`

### 5. Valide

```bash
npm run validate
```

O script verifica se o livro segue o template corretamente.

### 6. Abra um PR

- Branch: `add/slug-do-livro`
- Título: `Add: Nome do Livro — Autor`
- Descrição: breve explicação de por que este livro é relevante

## Contribuindo com código

### Setup de desenvolvimento

```bash
git clone https://github.com/danpalmieri/books-for-agents.git
cd books-for-agents
npm install
npm run build
```

### Padrões

- TypeScript strict mode
- Sem dependências externas além do MCP SDK
- Testes devem passar antes do PR

## Código de conduta

- Seja respeitoso e construtivo
- Resumos devem ser insights originais, não cópia de conteúdo protegido
- Foque em qualidade sobre quantidade

## Dúvidas?

Abra uma [issue](https://github.com/danpalmieri/books-for-agents/issues) no repositório.
