'use strict';

/* ==========================================================
   index.md — chat com arquivos markdown usando a API do Gemini
   ==========================================================
   Como usar:
   1. Gere uma chave gratuita em https://aistudio.google.com/app/apikey
   2. Cole a chave no campo da barra lateral
   3. Os arquivos .md dentro da pasta arquivos.md/ carregam sozinhos
      ao abrir a página (veja arquivos.md/manifest.json)
   4. Converse — as respostas usam só o conteúdo carregado

   Nota de segurança: a chave fica só na memória desta aba (nunca
   é salva em disco, cookie ou localStorage). Ao recarregar a
   página, você precisa colar a chave de novo — isso é proposital.
   Este é um projeto client-side: qualquer chave usada aqui fica
   visível para quem tiver acesso ao navegador (aba de rede do
   DevTools inclusive). Ótimo para uso pessoal e estudo, mas nunca
   publique este projeto num site público com uma chave fixa no
   código — para isso, o certo é ter um backend que guarda a chave.
   Como cada visitante cola a própria chave, hospedar isso público
   na Vercel não expõe chave nenhuma sua.
   ========================================================== */

// Pasta com os arquivos .md e o manifesto que lista os nomes deles.
// Pra adicionar/remover um documento: edite arquivos.md/manifest.json.
const DOCS_FOLDER = 'arquivos.md';
const MANIFEST_PATH = `${DOCS_FOLDER}/manifest.json`;

// gemini-3.1-flash-lite: modelo estável da geração atual (Gemini 3),
// mais leve que os modelos "latest"/preview mais badalados — como
// esses concentram a maior parte da demanda, esse aqui costuma sofrer
// bem menos com erro 503 (model overloaded), além de ser gratuito e
// rápido o suficiente pra esse tipo de pergunta e resposta.
// Lista de modelos atual em: https://ai.google.dev/gemini-api/docs/models
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

const state = {
  files: [],    // { name, content }
  history: [],  // { role: 'user' | 'model', text }
  apiKey: '',
  loading: true, // true enquanto os arquivos da pasta ainda estão carregando
};

const els = {
  fileInput: document.getElementById('fileInput'),
  fileList: document.getElementById('fileList'),
  uploadLabel: document.querySelector('.upload-btn'),
  loadStatus: document.getElementById('loadStatus'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  clearBtn: document.getElementById('clearBtn'),
  messages: document.getElementById('messages'),
  emptyState: document.getElementById('emptyState'),
  form: document.getElementById('chatForm'),
  input: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
};

init();

function init() {
  renderEmptyState();
  autoLoadFiles();

  els.fileInput.addEventListener('change', (e) => addFiles(e.target.files));
  els.apiKeyInput.addEventListener('input', (e) => {
    state.apiKey = e.target.value.trim();
  });
  els.clearBtn.addEventListener('click', clearConversation);
  els.form.addEventListener('submit', onSubmit);
  els.input.addEventListener('keydown', onInputKeydown);
  els.input.addEventListener('input', autoGrow);

  // arrastar e soltar arquivos direto na área de upload
  const dropZone = els.uploadLabel;
  ['dragenter', 'dragover'].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    })
  );
  dropZone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
}

function setLoadStatus(text, isError) {
  els.loadStatus.textContent = text || '';
  els.loadStatus.classList.toggle('load-status--error', Boolean(isError));
}

async function autoLoadFiles() {
  state.loading = true;
  renderEmptyState();

  try {
    const manifestRes = await fetch(MANIFEST_PATH);
    if (!manifestRes.ok) {
      throw new Error(`não encontrei ${MANIFEST_PATH} (HTTP ${manifestRes.status})`);
    }
    const filenames = await manifestRes.json();

    const results = await Promise.allSettled(
      filenames.map(async (name) => {
        const fileRes = await fetch(`${DOCS_FOLDER}/${name}`);
        if (!fileRes.ok) throw new Error(name);
        return { name, content: await fileRes.text() };
      })
    );

    results.forEach((r) => {
      if (r.status === 'fulfilled') state.files.push(r.value);
      else console.warn('Falha ao carregar arquivo:', r.reason?.message || r.reason);
    });

    const failed = results.filter((r) => r.status === 'rejected').length;
    setLoadStatus(
      failed > 0 ? `${failed} de ${results.length} arquivo(s) do manifest.json não foram encontrados.` : '',
      failed > 0
    );
  } catch (err) {
    setLoadStatus(`não consegui carregar ${DOCS_FOLDER}/ automaticamente (${err.message}).`, true);
  } finally {
    state.loading = false;
    renderFileList(); // atualiza chips + empty state com o resultado final
  }
}

function addFiles(fileListObj) {
  const incoming = Array.from(fileListObj).filter((f) => /\.(md|markdown)$/i.test(f.name));
  incoming.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      state.files = state.files.filter((f) => f.name !== file.name); // evita duplicar
      state.files.push({ name: file.name, content: String(reader.result) });
      renderFileList();
    };
    reader.readAsText(file, 'UTF-8');
  });
  els.fileInput.value = '';
}

function renderFileList() {
  els.fileList.innerHTML = '';
  state.files.forEach((file, index) => {
    const chip = document.createElement('div');
    chip.className = 'file-chip';

    const name = document.createElement('span');
    name.textContent = file.name;
    name.title = file.name;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `remover ${file.name}`);
    removeBtn.addEventListener('click', () => {
      state.files.splice(index, 1);
      renderFileList();
    });

    chip.append(name, removeBtn);
    els.fileList.appendChild(chip);
  });
  renderEmptyState();
}

function onInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.form.requestSubmit();
  }
}

function autoGrow() {
  els.input.style.height = 'auto';
  els.input.style.height = Math.min(els.input.scrollHeight, 160) + 'px';
}

async function onSubmit(e) {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;

  if (!state.apiKey) {
    appendMessage('error', 'Cole sua chave da API do Gemini na barra lateral antes de conversar.');
    return;
  }
  if (state.loading) {
    appendMessage('error', 'Aguarde o carregamento dos documentos e tente de novo.');
    return;
  }
  if (state.files.length === 0) {
    appendMessage('error', `Nenhum arquivo encontrado em ${DOCS_FOLDER}/ — confira o manifest.json ou adicione um arquivo manualmente aqui do lado.`);
    return;
  }

  if (els.emptyState) {
    els.emptyState.remove();
    els.emptyState = null;
  }

  appendMessage('user', text);
  state.history.push({ role: 'user', text });
  els.input.value = '';
  autoGrow();
  setComposerDisabled(true);

  const typingEl = appendTyping();

  try {
    const reply = await callGemini();
    typingEl.remove();
    appendMessage('model', reply);
    state.history.push({ role: 'model', text: reply });
  } catch (err) {
    typingEl.remove();
    appendMessage('error', `Não consegui falar com a API. ${err.message}`);
  } finally {
    setComposerDisabled(false);
    els.input.focus();
  }
}

function setComposerDisabled(disabled) {
  els.sendBtn.disabled = disabled;
  els.input.disabled = disabled;
}

function buildSystemInstruction() {
  const docs = state.files
    .map((f) => `### Arquivo: ${f.name}\n\n${f.content}`)
    .join('\n\n---\n\n');

  return [
    'Você é um assistente que responde exclusivamente com base no conteúdo dos documentos markdown fornecidos abaixo.',
    'Se a resposta não estiver no conteúdo fornecido, diga claramente que não encontrou essa informação nos documentos carregados, em vez de inventar.',
    'Responda no mesmo idioma da pergunta do usuário, de forma direta e objetiva.',
    '',
    '=== DOCUMENTOS ===',
    docs,
    '=== FIM DOS DOCUMENTOS ===',
  ].join('\n');
}

async function callGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(state.apiKey)}`;

  const body = {
    contents: state.history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    systemInstruction: { parts: [{ text: buildSystemInstruction() }] },
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Sem retry automático de propósito: se o modelo estiver sobrecarregado,
    // o erro já avisa — troque de modelo em vez de ficar tentando de novo.
    if (res.status === 503) {
      throw new Error('o modelo está sobrecarregado no momento (capacidade do lado do Google, não é problema da sua chave) — espere um pouco e tente de novo.');
    }
    let detail = '';
    try {
      detail = (await res.json()).error?.message ?? '';
    } catch (_) {
      /* resposta não veio em JSON, ignora */
    }
    throw new Error(`(${res.status}) ${detail || 'verifique sua chave e tente de novo.'}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text || '').join('').trim();
  if (!text) throw new Error('a API respondeu sem conteúdo — tente reformular a pergunta.');
  return text;
}

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  if (role === 'model') {
    div.innerHTML = window.DOMPurify.sanitize(window.marked.parse(text));
  } else {
    div.textContent = text;
  }
  els.messages.appendChild(div);
  scrollToBottom();
  return div;
}

function appendTyping() {
  const div = document.createElement('div');
  div.className = 'typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  els.messages.appendChild(div);
  scrollToBottom();
  return div;
}

function scrollToBottom() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function renderEmptyState() {
  if (!els.emptyState) return;
  const n = state.files.length;

  let headline, sub;
  if (state.loading) {
    headline = 'carregando documentos';
    sub = `buscando os arquivos em ${DOCS_FOLDER}/...`;
  } else if (n === 0) {
    headline = 'nenhum documento encontrado';
    sub = `confira se os arquivos .md estão em ${DOCS_FOLDER}/ e se o manifest.json lista os nomes certos — ou adicione um arquivo manualmente aqui do lado.`;
  } else {
    headline = 'pronto pra conversar';
    sub = `pergunte algo sobre ${n === 1 ? 'o arquivo carregado' : `os ${n} arquivos carregados`}.`;
  }

  els.emptyState.innerHTML = `
    <p class="empty-headline">${headline}<span class="cursor">_</span></p>
    <p class="empty-sub">${sub}</p>
  `;
}

function clearConversation() {
  state.history = [];
  els.messages.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  els.messages.appendChild(empty);
  els.emptyState = empty;
  renderEmptyState();
}
