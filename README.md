# 🐾 VetPro Orienta

Sistema completo de Gestão Veterinária, Prontuários Inteligentes com IA, Automação de WhatsApp via Evolution API e Assinaturas via Asaas.

---

## 📖 Guias de Deploy e Instalação

- **[Guia Completo de Instalação no aaPanel & VPS Linux](./DEPLOY_AAPANEL.md)**: Passo a passo detalhado com Nginx, PM2, Node.js e SSL Let's Encrypt.
- **Configuração do Banco de Dados**: Execute o script [`supabase-schema.sql`](./supabase-schema.sql) no SQL Editor do seu projeto Supabase.

---

## 🚀 Como Rodar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure o arquivo `.env`:**
   Copie `.env.example` para `.env` e preencha suas chaves do Supabase e Gemini.

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Para compilar e rodar em produção:**
   ```bash
   npm run build
   npm run start
   ```
