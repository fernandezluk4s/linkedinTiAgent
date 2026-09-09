# index.md

Chatbot em HTML/CSS/JS puro que lê arquivos `.md` carregados por você e
responde perguntas sobre o conteúdo, usando a API do Gemini (Google).

## Arquivos

- `index.html` — estrutura da página
- `style.css` — visual (tema escuro, ciano/roxo)
- `script.js` — lógica: leitura dos `.md`, histórico da conversa, chamada à API

## Como rodar

1. Gere uma chave gratuita em https://aistudio.google.com/app/apikey
2. Abra o `index.html` direto no navegador (duplo clique já funciona —
   não precisa de servidor, porque os arquivos `.md` são lidos localmente
   com `FileReader`, não com `fetch`).
3. Cole a chave no campo "Chave da API (Gemini)" na barra lateral.
4. Clique em "+ adicionar arquivos .md" (ou arraste os arquivos para
   cima do botão) e escolha um ou mais arquivos.
5. Pergunte algo no campo de baixo. As respostas usam só o conteúdo
   dos arquivos carregados — se a informação não estiver lá, o modelo
   é instruído a dizer isso em vez de inventar.

## Detalhes técnicos

- Cada arquivo `.md` carregado é lido como texto puro e enviado como
  `systemInstruction` a cada mensagem, junto com o histórico da conversa.
- A chave da API fica só em uma variável JS (memória), nunca em
  localStorage, cookie ou arquivo — some ao recarregar a página.
- As respostas do modelo são renderizadas como markdown (via `marked.js`)
  e sanitizadas (via `DOMPurify`) antes de irem para a tela.
- O modelo usado é `gemini-flash-latest`. Se parar de funcionar, troque
  a constante `GEMINI_MODEL` no topo do `script.js` — a lista de modelos
  atuais fica em https://ai.google.dev/gemini-api/docs/models.

## Aviso de segurança

Este é um projeto **client-side**: a chave de API digitada fica visível
para quem tiver acesso ao navegador (inclusive na aba de rede do
DevTools). Isso é aceitável para uso pessoal/estudo, mas **não publique
este projeto em um site público com uma chave fixa no código** — nesse
caso, o correto é ter um backend que guarda a chave e repassa as
perguntas para a API.

## Adaptando para outra IA

A chamada à API fica isolada na função `callGemini()`, em `script.js`.
Para usar outro provedor (OpenAI, Claude, etc.), essa é a única função
que precisa mudar — o resto do código (upload de arquivos, histórico,
UI) continua igual.
