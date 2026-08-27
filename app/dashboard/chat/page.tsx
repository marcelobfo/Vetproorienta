'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', content: 'Olá! Sou o assistente de pré-diagnóstico do VetPro Orienta. Como posso ajudar com seu pet hoje? Diga-me os sintomas, raça e idade.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (!response.ok) throw new Error('Falha na requisição');

      const data = await response.json();
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: data.text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      <div className="h-[76px] px-8 flex items-center border-b border-brand-border-strong bg-brand-surface/30">
        <div>
          <h1 className="font-display text-lg font-bold">Triagem IA e Pré-diagnóstico</h1>
          <p className="text-xs text-brand-text-muted">Aviso: A IA fornece apenas orientações básicas. Casos graves exigem visita à clínica.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brand-surface-2' : 'bg-brand-teal/20 text-brand-teal'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-brand-text-muted" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-brand-surface-2 border border-brand-border-strong' : 'bg-brand-surface border border-brand-border-strong'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-3xl">
            <div className="w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="px-5 py-3.5 rounded-2xl bg-brand-surface border border-brand-border-strong text-brand-text-muted text-sm flex items-center">
              Analisando sintomas...
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-6 bg-brand-surface/50 border-t border-brand-border-strong">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva o que está acontecendo com o pet..."
            disabled={isLoading}
            className="w-full bg-brand-bg border border-brand-border-strong rounded-full pl-5 pr-14 py-3.5 focus:outline-none focus:border-brand-accent transition-colors disabled:opacity-50 text-[15px]"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-brand-accent/20 text-brand-accent-2 flex items-center justify-center hover:bg-brand-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
