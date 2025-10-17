# 💬 Nosso Papo

<div align="center">

![Nosso Papo Logo](src/assets/nosso-papo-logo.png)

**Um chat moderno e seguro, inspirado no WhatsApp e Telegram, desenvolvido em React + Supabase, com suporte completo a PWA, notificações push, chamadas em grupo e stories.**

[![Versão](https://img.shields.io/badge/versão-1.0.0-blue.svg)](https://github.com/mrpink2025/papo-leve-chat)
[![Licença](https://img.shields.io/badge/licença-MIT-green.svg)](LICENSE)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-brightgreen.svg)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-Enabled-purple.svg)](https://web.dev/progressive-web-apps/)
[![Feito com ❤️](https://img.shields.io/badge/Feito%20com-❤️-red.svg)](https://nossopapo.net)

[🚀 Demo ao Vivo](https://nossopapo.net) • [📖 Documentação](#documentação) • [🐛 Reportar Bug](https://github.com/mrpink2025/papo-leve-chat/issues)

</div>

---

## 📸 Demonstração

<div align="center">

### Tela Principal • Modo Claro e Escuro

| Modo Claro | Modo Escuro |
|------------|-------------|
| Interface limpa e moderna | Design acolhedor para uso noturno |

### Funcionalidades em Ação

- 💬 **Chat em tempo real** com envio de texto, mídia e emojis
- 📞 **Chamadas de vídeo** com múltiplos participantes
- 📷 **Stories** com visualização e reações
- 🔔 **Notificações push** mesmo com app fechado

**[Acesse agora: nossopapo.net](https://nossopapo.net)**

</div>

---

## ✨ Principais Funcionalidades

### 💬 Conversas e Mensagens
- ✅ Conversas individuais e em grupo
- ✅ Envio de texto, fotos, vídeos e arquivos
- ✅ Reações com emojis e respostas a mensagens
- ✅ Fixar, arquivar, silenciar e excluir conversas
- ✅ Indicadores de digitação em tempo real
- ✅ Status de entrega e leitura (✓✓)
- ✅ Menções (@usuário) em grupos
- ✅ Busca avançada de mensagens e conversas

### 🎙️ Chamadas de Voz e Vídeo
- ✅ Chamadas 1:1 e em grupo (WebRTC)
- ✅ Alternância entre câmera frontal/traseira
- ✅ Mudo, desligar vídeo e encerrar chamada
- ✅ Indicador de qualidade de conexão
- ✅ Notificação de chamada recebida (mesmo com app fechado)
- ✅ Histórico completo de chamadas

### 📷 Stories e Mídia
- ✅ Criação de stories com fotos e vídeos
- ✅ Visualização de stories de contatos
- ✅ Reações e respostas a stories
- ✅ Editor de imagens integrado
- ✅ Captura de foto/vídeo direto da câmera
- ✅ Expiração automática em 24h

### 🔔 Notificações e PWA
- ✅ Notificações push em tempo real
- ✅ Suporte a notificações com app fechado (Android e Desktop)
- ✅ Instalação como PWA (Progressive Web App)
- ✅ Modo offline com sincronização automática
- ✅ Ícones e tela de splash personalizados
- ✅ Configuração granular de notificações por conversa

### 🌙 Personalização
- ✅ Tema escuro e claro
- ✅ Toques personalizados por contato
- ✅ Configurações de privacidade (último visto, foto de perfil, etc.)
- ✅ Idioma (Português e outras línguas)
- ✅ Planos de fundo personalizados

### 🛡️ Segurança e Privacidade
- ✅ Autenticação segura via Supabase Auth
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Histórico de mensagens baseado em `joined_at` (novos membros só veem mensagens após entrada)
- ✅ Bloqueio de contatos
- ✅ Controle de quem pode adicionar em grupos
- ✅ Criptografia de dados em trânsito (HTTPS)

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Uso |
|------------|-----|
| **React 18** | Biblioteca principal para UI |
| **Vite** | Build tool e dev server ultrarrápido |
| **TypeScript** | Tipagem estática e segurança |
| **Tailwind CSS** | Framework CSS utility-first |
| **shadcn/ui** | Componentes React modernos e acessíveis |
| **Supabase** | Backend-as-a-Service (Auth, Database, Storage, Realtime) |
| **PostgreSQL** | Banco de dados relacional |
| **WebRTC** | Chamadas de voz e vídeo peer-to-peer |
| **Service Worker** | Notificações push e cache offline |
| **Framer Motion** | Animações fluidas |
| **TanStack Query** | Gerenciamento de estado assíncrono |
| **React Router** | Roteamento e navegação |
| **Nginx** | Servidor web em produção |
| **Docker** | Containerização (opcional) |
| **Ubuntu 24.04 LTS** | Servidor recomendado |

---

## 🚀 Instalação Local

### Pré-requisitos

- **Node.js** 18+ e npm
- Conta no [Supabase](https://supabase.com) (gratuita)
- Git

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/mrpink2025/papo-leve-chat.git
cd papo-leve-chat

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env

# 4. Edite o arquivo .env com suas credenciais do Supabase
# (veja a seção "Variáveis de Ambiente" abaixo)

# 5. Inicie o servidor de desenvolvimento
npm run dev

# 6. Acesse no navegador
# http://localhost:8080
```

O app estará rodando em modo de desenvolvimento com hot-reload!

---

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase | `eyJhbGc...` |
| `VITE_VAPID_PUBLIC_KEY` | Chave pública VAPID para Web Push | `BG7x...` |
| `VITE_DOMAIN` | Domínio do app em produção | `nossopapo.net` |
| `VITE_APP_NAME` | Nome do aplicativo | `Nosso Papo` |

### Como obter as chaves do Supabase:

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Crie um novo projeto (ou use um existente)
3. Vá em **Settings** → **API**
4. Copie a `URL` e a `anon/public` key

### Como gerar chaves VAPID para Web Push:

```bash
# Instale o web-push globalmente
npm install -g web-push

# Gere as chaves VAPID
web-push generate-vapid-keys

# Copie a chave pública para VITE_VAPID_PUBLIC_KEY
# E configure a chave privada no Supabase (Secrets)
```

---

## 🌐 Deploy em Produção

### Método 1: Script Automatizado (Ubuntu 24.04 LTS)

O projeto inclui um script de instalação automatizado que configura todo o ambiente de produção:

```bash
# Download do script
wget https://raw.githubusercontent.com/mrpink2025/papo-leve-chat/main/install_nossopapo.sh

# Torne executável
chmod +x install_nossopapo.sh

# Execute como root
sudo ./install_nossopapo.sh
```

**O script automaticamente:**
- ✅ Instala Node.js, npm, Nginx
- ✅ Clona o repositório
- ✅ Configura variáveis de ambiente
- ✅ Builda o projeto para produção
- ✅ Configura Nginx como proxy reverso
- ✅ Instala e configura certificado SSL (Let's Encrypt)
- ✅ Configura firewall (UFW) e Fail2Ban
- ✅ Cria serviços systemd para auto-restart
- ✅ Configura backups automáticos

### Método 2: Manual

```bash
# 1. Clone e instale
git clone https://github.com/mrpink2025/papo-leve-chat.git
cd papo-leve-chat
npm install

# 2. Configure .env para produção
nano .env

# 3. Build para produção
npm run build

# 4. Sirva os arquivos da pasta dist/ com Nginx
# Exemplo de configuração Nginx em /etc/nginx/sites-available/nossopapo
```

**Exemplo de configuração Nginx:**

```nginx
server {
    listen 80;
    server_name nossopapo.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nossopapo.net;

    ssl_certificate /etc/letsencrypt/live/nossopapo.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nossopapo.net/privkey.pem;

    root /var/www/nossopapo/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 📂 Estrutura de Pastas

```
papo-leve-chat/
├── src/
│   ├── assets/              # Imagens, ícones, logos
│   ├── components/          # Componentes React reutilizáveis
│   │   ├── ui/             # Componentes shadcn/ui
│   │   ├── ChatHeader.tsx
│   │   ├── MessageBubble.tsx
│   │   └── ...
│   ├── hooks/              # Custom hooks React
│   │   ├── useAuth.tsx
│   │   ├── useMessages.tsx
│   │   ├── useNativeVideoCall.tsx
│   │   └── ...
│   ├── pages/              # Páginas principais
│   │   ├── Auth.tsx
│   │   ├── Chat.tsx
│   │   ├── Call.tsx
│   │   └── ...
│   ├── utils/              # Funções utilitárias
│   │   ├── WebRTCCall.ts
│   │   ├── pushNotificationHelper.ts
│   │   └── ...
│   ├── integrations/       # Integrações externas
│   │   └── supabase/
│   ├── App.tsx             # Componente raiz
│   ├── main.tsx            # Entry point
│   └── index.css           # Estilos globais
├── public/
│   ├── sw-push.js          # Service Worker para push
│   ├── app-icon-192.png
│   ├── app-icon-512.png
│   └── ...
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── send-push-notification/
│   │   ├── cleanup-expired-calls/
│   │   └── ...
│   ├── migrations/         # Migrações SQL
│   └── config.toml         # Configuração Supabase
├── docs/                   # Documentação adicional
│   ├── CALL_DEBUG_GUIDE.md
│   ├── NATIVE_CALLS_SYSTEM.md
│   └── ...
├── install_nossopapo.sh    # Script de instalação
├── update_nossopapo.sh     # Script de atualização
├── .env                    # Variáveis de ambiente (não commitado)
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🔔 Notificações e Chamadas

### Como funciona?

O **Nosso Papo** utiliza a **Web Push API** combinada com **Service Workers** e **Supabase Realtime** para entregar notificações instantâneas, mesmo quando o PWA está fechado.

#### Fluxo de Notificações:

1. **Registro**: Ao fazer login, o app solicita permissão de notificações e registra o token no Supabase
2. **Evento**: Quando uma mensagem ou chamada é recebida, o backend envia um evento via Supabase Realtime
3. **Service Worker**: O SW intercepta o push e exibe a notificação com som, vibração e ações
4. **Interação**: O usuário pode:
   - **Atender** uma chamada (abre `/call/:callId`)
   - **Recusar** uma chamada (envia rejeição e fecha notificação)
   - **Abrir** uma mensagem (navega para a conversa)

#### Cancelamento Multi-Dispositivo:

Quando um usuário atende uma chamada em um dispositivo, todos os outros dispositivos recebem um evento `cancel-call` que fecha automaticamente a notificação.

#### Timeout Automático:

Chamadas sem resposta por **30 segundos** são marcadas como "perdidas" automaticamente por um cron job no Supabase.

**Documentação completa:** [NATIVE_CALLS_SYSTEM.md](NATIVE_CALLS_SYSTEM.md)

---

## 🤝 Contribuição

Contribuições são muito bem-vindas! Siga estas diretrizes:

### Como contribuir:

1. **Fork** o repositório
2. Crie uma **branch** para sua feature (`git checkout -b feature/MinhaNovaFeature`)
3. **Commit** suas mudanças seguindo [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: adiciona suporte a mensagens de áudio"
   ```
4. **Push** para a branch (`git push origin feature/MinhaNovaFeature`)
5. Abra um **Pull Request** detalhado

### Padrões de código:

```bash
# Rode o linter antes de commitar
npm run lint

# Formate o código automaticamente
npm run format

# Execute os testes (quando disponíveis)
npm run test
```

### Tipos de commit:

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação (sem mudança de lógica)
- `refactor:` Refatoração de código
- `test:` Testes
- `chore:` Manutenção

---

## 📋 Roadmap

### Em desenvolvimento:
- [ ] Mensagens de áudio
- [ ] Compartilhamento de localização
- [ ] Enquetes em grupos
- [ ] Gravação de chamadas (com consentimento)
- [ ] Mensagens programadas

### Planejado:
- [ ] Desktop app (Electron)
- [ ] Suporte a iOS (quando disponível para PWA)
- [ ] Criptografia end-to-end (E2EE)
- [ ] Backup automático na nuvem
- [ ] Temas personalizados

---

## 📜 Licença

Este projeto está licenciado sob a **Licença MIT** - veja o arquivo [LICENSE](LICENSE) para detalhes.

```
MIT License

Copyright (c) 2025 Mr_Pink

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🙏 Créditos e Agradecimentos

Este projeto não seria possível sem estas tecnologias e comunidades incríveis:

- **[Supabase](https://supabase.com)** - Backend-as-a-Service poderoso e open-source
- **[shadcn/ui](https://ui.shadcn.com)** - Componentes React elegantes e acessíveis
- **[Vite](https://vitejs.dev)** - Build tool extremamente rápido
- **[Tailwind CSS](https://tailwindcss.com)** - Framework CSS utility-first
- **[React](https://react.dev)** - Biblioteca JavaScript para interfaces
- **[WebRTC](https://webrtc.org)** - Comunicação em tempo real
- **[Radix UI](https://www.radix-ui.com)** - Primitivos UI acessíveis

Um agradecimento especial a todos os colaboradores e à comunidade open-source! 💜

---

## 📞 Contato e Suporte

- **Website**: [nossopapo.net](https://nossopapo.net)
- **Issues**: [GitHub Issues](https://github.com/mrpink2025/papo-leve-chat/issues)
- **Discussões**: [GitHub Discussions](https://github.com/mrpink2025/papo-leve-chat/discussions)

---

<div align="center">

**Desenvolvido com ❤️ por [Mr_Pink](https://github.com/mrpink2025)**

**Nosso Papo** — Onde cada conversa importa

[⬆ Voltar ao topo](#-nosso-papo)

</div>
