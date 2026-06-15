# Portal Premium Pernambucana Centro de Manutenção

Projeto demonstrativo com:

- Landing page moderna e responsiva.
- Botão de acesso ao painel financeiro.
- Login simples para apresentação comercial.
- Dashboard financeiro com dados locais, filtros, KPIs, gráficos em canvas via Chart.js e rótulos nos gráficos.
- Logo da Pernambucana aplicada na landing page e no painel.

## Como abrir

1. Extraia o ZIP.
2. Abra o arquivo `index.html` no navegador.
3. Clique em **Acessar painel financeiro**.

## Login de apresentação

- Login: `nsnexus`
- Senha: `123456`

## Observação

Este login é apenas para protótipo/apresentação. Depois a autenticação pode ser trocada por Google, Supabase, SharePoint, Firebase ou outro controle real de acesso.

## Arquivos principais

- `index.html` — landing page.
- `landing.css` — visual da landing page.
- `landing.js` — login, animações e partículas.
- `painel.html` — painel financeiro.
- `dashboard.css` — visual do dashboard.
- `app.js` — lógica do dashboard.
- `data.js` — dados locais do painel.
- `auth-guard.js` — bloqueia o painel sem login.
- `dashboard-auth.js` — botão sair do painel.
- `assets/logo-pernambucana.jpg` — logo aplicada no projeto.
