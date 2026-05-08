# GitHub Job Finder - Frontend

Aplicacao React + Vite para importar dados do LinkedIn, analisar perfil GitHub, buscar vagas compativeis e gerar curriculos personalizados em Markdown/PDF.

## Stack

- React 18
- Vite 5
- TypeScript
- React PDF
- React Markdown
- Vite PWA

## Funcionalidades

- Login, cadastro e sessao persistida por token no `localStorage`.
- Importacao de PDF ou ZIP do LinkedIn.
- Busca de vagas por perfil GitHub.
- Busca de vagas por perfil profissional do LinkedIn.
- Preferencias de busca: modalidade, localizacao, salario, nivel e idade maxima da vaga.
- Historico de vagas encontradas.
- Marcacao de vagas vistas e descarte de vagas.
- Geracao, edicao e exportacao de curriculo.
- Instalavel como PWA.

## Como rodar localmente

Instale as dependencias:

```bash
npm install
```

Crie um arquivo `.env.local` se quiser apontar para outra API:

```env
VITE_API_URL=http://localhost:3001
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Por padrao o Vite sobe em:

```text
http://localhost:5173
```

O backend precisa estar rodando em `http://localhost:3001`, ou no endereco definido em `VITE_API_URL`.

## Scripts

```bash
npm run dev
```

Roda o app em modo desenvolvimento.

```bash
npm run build
```

Executa checagem TypeScript e gera build de producao.

```bash
npm run preview
```

Serve localmente o build gerado pelo Vite.

## Variaveis de ambiente

```env
VITE_API_URL=http://localhost:3001
```

Se `VITE_API_URL` nao for definida, o app usa `http://localhost:3001`.

## Principais telas

- `outros`: busca vagas usando os dados importados do LinkedIn.
- `search`: busca vagas usando usuario GitHub, repositorios e linguagens.
- `history`: historico de vagas salvas no backend.
- `profile`: perfil do usuario autenticado.
- editor de CV: tela dedicada para gerar, editar e exportar curriculo.

## Integracoes usadas pelo frontend

### Backend

Os servicos em `src/services` chamam a API:

- `auth.ts`: registro, login, sessao e perfil.
- `linkedin.ts`: upload de PDF/ZIP do LinkedIn.
- `jobs.ts`: busca por GitHub e acoes de vaga.
- `professionJobs.ts`: busca por historico profissional.
- `searches.ts`: historico.
- `cv.ts`: geracao, consulta e atualizacao de curriculos.

### GitHub

O frontend chama diretamente a API publica do GitHub em:

- `GET https://api.github.com/users/:username`
- `GET https://api.github.com/users/:username/repos?sort=updated&per_page=20`

Essas chamadas extraem perfil, repositorios e linguagens para montar o contexto enviado ao backend.

## PWA

A configuracao PWA fica em `vite.config.ts`:

- nome: `GitHub Job Finder`
- assets: `public/icon.svg`
- registro com `autoUpdate`
- modo standalone

## Estrutura

```text
src/
  App.tsx                  Composicao principal das telas
  components/              Componentes visuais e fluxos de UI
  hooks/                   Hooks de busca e preferencias
  services/                Clientes HTTP e integracoes
  styles/global.css        Estilos globais
  types/                   Tipos compartilhados do frontend
  utils/                   Preferencias e limites locais
```

## Observacoes

- Tokens ficam em `localStorage` com a chave `auth_token`.
- Preferencias e bloqueios de palavras-chave sao gerenciados no navegador.
- Para producao, configure `VITE_API_URL` com a URL publica do backend e ajuste `FRONTEND_URL` no backend para o dominio do frontend.
