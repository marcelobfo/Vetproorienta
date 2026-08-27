'use client';

import { useState } from 'react';
import { Bot, Key, FileText, Save, Plus, Trash2 } from 'lucide-react';

export default function IAConfigPage() {
  const [activeTab, setActiveTab] = useState<'prompt' | 'api' | 'knowledge'>('prompt');

  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-2">Configuração da Inteligência Artificial</h1>
        <p className="text-brand-text-muted text-sm mb-8">Gerencie o comportamento, chaves de API e a base de conhecimento da IA do seu tenant.</p>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-brand-border-strong mb-8">
          <button 
            onClick={() => setActiveTab('prompt')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'prompt' ? 'border-brand-teal text-brand-text' : 'border-transparent text-brand-text-muted hover:text-brand-text'}`}
          >
            <div className="flex items-center gap-2"><Bot className="w-4 h-4" /> Prompt do Sistema</div>
          </button>
          <button 
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'knowledge' ? 'border-brand-teal text-brand-text' : 'border-transparent text-brand-text-muted hover:text-brand-text'}`}
          >
            <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Base de Conhecimento</div>
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'api' ? 'border-brand-teal text-brand-text' : 'border-transparent text-brand-text-muted hover:text-brand-text'}`}
          >
            <div className="flex items-center gap-2"><Key className="w-4 h-4" /> Credenciais de API</div>
          </button>
        </div>

        {/* Tab: Prompt */}
        {activeTab === 'prompt' && (
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <h3 className="font-bold mb-1">Instruções do Sistema (System Prompt)</h3>
            <p className="text-sm text-brand-text-muted mb-6">Defina o tom de voz e as regras críticas de como a IA deve responder aos tutores.</p>
            
            <textarea 
              className="w-full h-64 bg-brand-bg border border-brand-border-strong rounded-xl p-4 text-[14px] focus:outline-none focus:border-brand-teal text-brand-text-muted transition-colors font-mono"
              defaultValue={`Você é um assistente virtual veterinário compassivo do sistema VetPro Orienta. 
Seu objetivo é fazer uma triagem e um pré-diagnóstico de pets com base nas informações passadas pelo tutor.

Regras críticas:
1. Sempre deixe claro que você é uma inteligência artificial e NÃO substitui uma consulta presencial.
2. Em qualquer sinal de emergência, instrua o tutor a buscar uma clínica veterinária IMEDIATAMENTE.
3. Não prescreva medicamentos tarja vermelha ou preta sob nenhuma hipótese.
4. Mantenha um tom acolhedor, calmo e humanizado.`}
            />
            
            <div className="flex justify-end mt-4">
              <button className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-brand-teal/90 transition-all">
                <Save className="w-4 h-4" /> Salvar Prompt
              </button>
            </div>
          </div>
        )}

        {/* Tab: Knowledge Base */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold mb-1">Materiais de Base de Conhecimento (RAG)</h3>
                <p className="text-sm text-brand-text-muted">A IA consultará estes textos antes de responder para garantir precisão técnica.</p>
              </div>
              <button className="bg-brand-surface-2 border border-brand-border-strong text-brand-text font-medium px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:border-brand-teal transition-all">
                <Plus className="w-4 h-4" /> Adicionar Material
              </button>
            </div>

            <div className="grid gap-4">
              <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-brand-teal mb-1">Protocolo de Vacinação Canina (2025)</h4>
                  <p className="text-xs text-brand-text-muted line-clamp-2">"As vacinas essenciais (core) para cães incluem a vacina múltipla (V8/V10) e a antirrábica. O protocolo deve iniciar aos 45 dias de vida..."</p>
                </div>
                <button className="text-brand-danger hover:bg-brand-danger/10 p-2 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-brand-teal mb-1">Guia de Alimentação Natural</h4>
                  <p className="text-xs text-brand-text-muted line-clamp-2">"A transição para alimentação natural deve ser gradual, ocorrendo ao longo de 7 a 10 dias. Misture a nova dieta com a ração antiga..."</p>
                </div>
                <button className="text-brand-danger hover:bg-brand-danger/10 p-2 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: API Config */}
        {activeTab === 'api' && (
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 max-w-2xl">
            <h3 className="font-bold mb-1">Provedor e Chaves de API</h3>
            <p className="text-sm text-brand-text-muted mb-8">Configure o provedor de IA que o sistema utilizará. (As chaves são armazenadas com criptografia no Supabase Vault em produção).</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Provedor de Inteligência Artificial</label>
                <select className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl p-3 text-[14px] focus:outline-none focus:border-brand-teal text-brand-text transition-colors">
                  <option value="gemini">Google Gemini (Recomendado)</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Chave da API (API Key)</label>
                <input 
                  type="password" 
                  placeholder="sk-..." 
                  defaultValue="************************"
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl p-3 text-[14px] focus:outline-none focus:border-brand-teal text-brand-text transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-brand-border-strong flex justify-end">
                <button className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-brand-teal/90 transition-all">
                  <Save className="w-4 h-4" /> Salvar Credenciais
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
