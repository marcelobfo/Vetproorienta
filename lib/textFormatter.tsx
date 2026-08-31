import React from 'react';

/**
 * Renderizador de texto formatado com suporte a negrito por ASTERISCO ÚNICO (*texto*)
 * e conversão de marcadores de lista (* Item).
 */
export function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;

  // 1. Converter qualquer resquício de **texto** em *texto*
  let cleanText = text.replace(/\*\*(.*?)\*\*/g, '*$1*').replace(/\*\*/g, '*');

  const lines = cleanText.split('\n');

  return (
    <div className={`space-y-2 leading-relaxed ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        
        // Se a linha for vazia
        if (!trimmed) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // Linha com marcador de lista (* Item ou - Item)
        const isBullet = /^[*-]\s+/.test(trimmed);
        const lineContent = isBullet ? trimmed.replace(/^[*-]\s+/, '') : line;

        // Processar negrito (*texto*) dentro da linha
        const parts = parseSingleAsteriskBold(lineContent);

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-2">
              <span className="text-brand-teal font-bold select-none">•</span>
              <div className="flex-1">{parts}</div>
            </div>
          );
        }

        return <div key={lineIdx}>{parts}</div>;
      })}
    </div>
  );
}

/**
 * Quebra uma string em nós React convertendo *conteúdo* em <strong className="font-bold">...</strong>
 */
function parseSingleAsteriskBold(str: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  // Regex para capturar *texto em negrito* (não casando quebras de linha ou asteriscos vazios)
  const regex = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    // Texto antes do negrito
    if (match.index > lastIndex) {
      elements.push(str.substring(lastIndex, match.index));
    }

    // Conteúdo em negrito (*...*)
    elements.push(
      <strong key={match.index} className="font-bold text-inherit">
        {match[1]}
      </strong>
    );

    lastIndex = regex.lastIndex;
  }

  // Texto restante após o último match
  if (lastIndex < str.length) {
    elements.push(str.substring(lastIndex));
  }

  return elements.length > 0 ? elements : [str];
}
