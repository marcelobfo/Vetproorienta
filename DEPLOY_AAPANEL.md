# 🚀 Guia de Instalação e Deploy do VetPro Orienta no aaPanel & VPS

Este documento contém o passo a passo completo para clonar, configurar variáveis de ambiente, compilar e executar o **VetPro Orienta** em produção utilizando o **aaPanel** com **Nginx**, **Node.js (PM2)** e **Certificado SSL**.

---

## 📋 Pré-requisitos no aaPanel

1. **Node.js Version Manager** instalado via **App Store** do aaPanel:
   - Versão recomendada do Node: **v20.x** ou **v22.x LTS**.
   - Definir como padrão (*Set to default*).
2. **Nginx** instalado e ativo no aaPanel.
3. Repositório Git clonado ou arquivos extraídos no servidor.

---

## 📂 1. Estrutura de Diretórios Recomendada

Clone ou coloque os arquivos do projeto dentro do diretório padrão:
```bash
/www/wwwroot/vetproorienta.technedigital.com.br
# ou /mnt/Techocloud/Techne/technedigital/dist/test/Vetproorienta
```

---

## ⚙️ 2. Configuração do Arquivo de Ambiente (`.env`)

Dentro da pasta do projeto, crie o arquivo `.env`:

```bash
cd /www/wwwroot/vetproorienta.technedigital.com.br
nano .env
```

Cole o modelo abaixo e preencha com as suas credenciais reais:

```env
# ==============================================================================
# CONFIGURAÇÃO DE SERVIDOR & DOMÍNIO
# ==============================================================================
PORT=3000
NODE_ENV=production
APP_URL=https://vetproorienta.technedigital.com.br
NEXT_PUBLIC_APP_URL=https://vetproorienta.technedigital.com.br

# ==============================================================================
# INTELIGÊNCIA ARTIFICIAL (GOOGLE GEMINI)
# Obtenha em: https://aistudio.google.com/app/apikey
# ==============================================================================
GEMINI_API_KEY=AIzaSy_SUA_CHAVE_GEMINI_AQUI

# ==============================================================================
# BANCO DE DADOS E AUTENTICAÇÃO (SUPABASE)
# Obtenha em: Supabase Dashboard > Settings > API
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...CHAVE_ANON
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...CHAVE_SERVICE_ROLE

# ==============================================================================
# DISPARO DE WHATSAPP (EVOLUTION API - Opcional)
# ==============================================================================
EVOLUTION_SERVER_URL=https://sua-evolution-api.technedigital.com.br
EVOLUTION_API_KEY=sua_chave_global_evolution
EVOLUTION_DEFAULT_INSTANCE=vetpro-clinica

# ==============================================================================
# GATEWAY DE PAGAMENTOS (ASAAS - Opcional)
# Obtenha em: Painel Asaas > Minha Conta > Integrações > Chave de API
# ==============================================================================
ASAAS_API_KEY=$aact_SUA_CHAVE_ASAAS_AQUI
ASAAS_WEBHOOK_AUTH_TOKEN=sua_chave_secreta_webhook_com_min_32_caracteres
```

---

## 🔨 3. Instalar Dependências e Gerar o Build de Produção

No terminal do servidor, dentro da pasta do projeto:

```bash
cd /www/wwwroot/vetproorienta.technedigital.com.br

# Instalar dependências
npm install

# Compilar para produção (Next.js)
npm run build
```

---

## 🚀 4. Executar a Aplicação com PM2 (Process Manager)

Para garantir que o serviço permaneça sempre online e reinicie automaticamente em caso de reboot do servidor:

```bash
# 1. Instalar o PM2 globalmente (caso ainda não tenha)
npm install -g pm2

# 2. Iniciar o processo do Next.js na porta 3000
pm2 start ./node_modules/next/dist/bin/next --name "vetpro" -- start -p 3000

# 3. Salvar o estado do PM2 para inicialização automática no boot do Linux
pm2 save
pm2 startup
```

Para verificar se o servidor está respondendo localmente:
```bash
curl -I http://127.0.0.1:3000
```

---

## 🌐 5. Configuração do Nginx no aaPanel

1. No **aaPanel**, acesse **Website** > selecione o domínio `vetproorienta.technedigital.com.br`.
2. Clique na aba **Config file** (ou abra as configurações do Nginx do site) e garanta que o bloco `location /` faça o proxy reverso para a porta `3000`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name vetproorienta.technedigital.com.br;
    index index.html index.htm;

    # Bloqueio de arquivos sensíveis
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.svn|\.project|LICENSE|README.md|package.json|package-lock.json|\.env|node_modules) {
        return 404;
    }

    # Proxy Reverso para a aplicação Next.js no PM2 (Porta 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header REMOTE-HOST $remote_addr;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        add_header X-Cache $upstream_cache_status;

        proxy_connect_timeout 60s;
        proxy_read_timeout 86400s;
        proxy_send_timeout 60s;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    access_log  /www/wwwlogs/Vetproorienta.log;
    error_log  /www/wwwlogs/Vetproorienta.error.log;
}
```

3. Clique em **Save**.

---

## 🔒 6. Ativação do Certificado SSL (HTTPS Gratuito)

1. Na janela de configurações do site no aaPanel, vá para a aba **SSL**.
2. Selecione **Let's Encrypt**, marque a caixa do seu domínio e clique em **Apply**.
3. Ative a opção **Force HTTPS**.

---

## 🔄 Comandos Úteis de Manutenção

- **Ver logs em tempo real:**
  ```bash
  pm2 logs vetpro
  ```
- **Reiniciar a aplicação:**
  ```bash
  pm2 restart vetpro
  ```
- **Atualizar código com nova versão do Git:**
  ```bash
  cd /www/wwwroot/vetproorienta.technedigital.com.br
  git pull
  npm install
  npm run build
  pm2 restart vetpro
  ```
