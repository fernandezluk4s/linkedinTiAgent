# index.md

Chatbot em HTML/CSS/JS puro que carrega automaticamente os arquivos
`.md` da pasta `arquivos.md/` e responde perguntas sobre o conteúdo,
usando a API do Gemini (Google). Feito para ser hospedado no GitHub
com deploy na Vercel.

## Estrutura do projeto

```
.
├── index.html
├── style.css
├── script.js
├── README.md
└── arquivos.md/
    ├── manifest.json          <- lista os nomes dos arquivos a carregar
    ├── headline-e-titulo-formula-e-palavras-chave.md
    ├── resumo-sobre-estrutura-e-storytelling.md
    └── ... (os outros arquivos .md da base)
```

## Passo a passo

### 1. Coloque seus arquivos .md na pasta certa

Copie seus 13 arquivos `.md` da base de LinkedIn para dentro de
`arquivos.md/`. O `manifest.json` dessa pasta já vem preenchido com
os nomes exatos deles — se os nomes dos seus arquivos forem esses
mesmos, não precisa mexer em nada.

Para adicionar, remover ou renomear um arquivo mais tarde, edite a
lista em `arquivos.md/manifest.json` (é só um array JSON com os
nomes):

```json
[
  "headline-e-titulo-formula-e-palavras-chave.md",
  "novo-arquivo-aqui.md"
]
```

### 2. Teste localmente

Como os arquivos agora são buscados com `fetch()` em vez de upload
manual, abrir o `index.html` com duplo clique não funciona mais — o
navegador bloqueia esse tipo de requisição em arquivos abertos
localmente. Suba um servidor simples na pasta do projeto:

```bash
npx serve .
```

ou, se preferir Python:

```bash
python -m http.server 8000
```

Abra o endereço que aparecer no terminal (algo como
`http://localhost:3000` ou `http://localhost:8000`).

### 3. Suba para o GitHub

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

(troque a URL pela do repositório que você criar no GitHub)

### 4. Hospede na Vercel

1. Crie uma conta em vercel.com (dá para entrar direto com o GitHub)
2. No dashboard, clique em "Add New" -> "Project"
3. Escolha "Import Git Repository" e selecione o repositório que você
   acabou de subir
4. Por ser um site estático sem framework, a Vercel deve detectar o
   preset "Other" sozinha, sem comando de build — normalmente não
   precisa mudar nenhuma configuração
5. Clique em "Deploy" e espere terminar (leva menos de um minuto)
6. Pronto — a Vercel te entrega uma URL tipo `seu-projeto.vercel.app`

### 5. Use

1. Abra a URL do projeto (local ou da Vercel)
2. Gere uma chave gratuita em https://aistudio.google.com/app/apikey
3. Cole a chave no campo "Chave da API (Gemini)" na barra lateral
4. Espere a mensagem "pronto pra conversar" aparecer (os documentos
   carregam sozinhos) e pergunte algo

## Aviso de segurança

Este é um projeto **client-side**: a chave de API que cada pessoa
digita fica visível só no navegador dela (inclusive na aba de rede
do DevTools), e nunca é enviada ou salva em nenhum servidor. Como
cada visitante cola a própria chave, hospedar isso publicamente na
Vercel não expõe chave nenhuma sua — só não coloque sua chave fixa
em nenhum arquivo do repositório.

## Detalhes técnicos

- Ao abrir a página, o `script.js` busca `arquivos.md/manifest.json`,
  pega a lista de nomes e busca cada arquivo com `fetch()`. Se algum
  arquivo listado não existir, ele avisa na barra lateral mas segue
  com os outros normalmente.
- O conteúdo de cada `.md` carregado vira `systemInstruction` a cada
  mensagem, junto com o histórico da conversa.
- O botão "+ adicionar mais arquivos" continua funcionando para
  complementar com arquivos extras — mas isso só afeta a conversa de
  quem enviou, na hora; não altera os arquivos do repositório nem o
  que outros visitantes veem.
- As respostas do modelo são renderizadas como markdown (`marked.js`)
  e sanitizadas (`DOMPurify`) antes de irem para a tela.
- O modelo usado é `gemini-3.1-flash-lite`. Se parar de funcionar,
  troque a constante `GEMINI_MODEL` no topo do `script.js` — lista
  atual em https://ai.google.dev/gemini-api/docs/models.

## Adaptando para outra IA

A chamada à API fica isolada na função `callGemini()`, em `script.js`.
Para usar outro provedor (OpenAI, Claude, etc.), essa é a única
função que precisa mudar — o resto do código (leitura da pasta,
histórico, UI) continua igual.
