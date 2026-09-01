import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

let aiClient: GoogleGenAI | null = null;

function getAi() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key_for_build' });
  }
  return aiClient;
}

// Função utilitária para normalizar negrito (garante apenas *texto* e remove qualquer resquício de **)
function formatSingleAsteriskBold(text: string): string {
  if (!text) return '';
  // Substitui **texto** por *texto*
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
  // Se sobrou algum ** isolado, substitui por *
  formatted = formatted.replace(/\*\*/g, '*');
  return formatted;
}

// Extração heurística rápida de dados fornecidos no chat
function extractPetAndTutorInfo(conversationText: string) {
  const info: {
    tutorName: string | null;
    petName: string | null;
    species: string | null;
    breed: string | null;
    sex: string | null;
    age: string | null;
    weight: string | null;
    symptoms: string | null;
  } = {
    tutorName: null,
    petName: null,
    species: null,
    breed: null,
    sex: null,
    age: null,
    weight: null,
    symptoms: null,
  };

  const text = conversationText;

  // 1. Seu nome / Tutor
  const tutorMatch = text.match(/(?:seu\s+nome|nome\s+do\s+tutor|tutor|meu\s+nome\s+é|me\s+chamo|sou\s+o|sou\s+a)[\s*:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,30})/i);
  if (tutorMatch) {
    const val = tutorMatch[1].trim().split('\n')[0].replace(/[*_]/g, '');
    if (val && !['do pet', 'do cão', 'do gato'].includes(val.toLowerCase())) {
      info.tutorName = val;
    }
  }

  // 2. Nome do pet
  const petMatch = text.match(/(?:nome\s+do\s+pet|pet|animal|ele\s+se\s+chama|ela\s+se\s+chama|o\s+nome\s+dele\s+é|o\s+nome\s+dela\s+é|chama-se)[\s*:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,25})/i);
  if (petMatch) {
    info.petName = petMatch[1].trim().split('\n')[0].replace(/[*_]/g, '');
  }

  // 3. Espécie (cão ou gato)
  if (/\b(cão|cachorro|cadela|canino|canina|cao)\b/i.test(text)) {
    info.species = 'Cão';
  } else if (/\b(gato|gata|felino|felina)\b/i.test(text)) {
    info.species = 'Gato';
  }

  // 4. Raça
  const breedMatch = text.match(/(?:raça|raca)[\s*:]+([A-Za-zÀ-ÖØ-öø-ÿ\s-]{2,35})/i);
  if (breedMatch) {
    info.breed = breedMatch[1].trim().split('\n')[0].replace(/[*_]/g, '');
  } else {
    if (/srd|vira[- ]lata|sem\s+raça|mestiço/i.test(text)) info.breed = 'SRD (Sem Raça Definida)';
    else if (/golden(?:\s+retriever)?/i.test(text)) info.breed = 'Golden Retriever';
    else if (/shih[- ]tzu/i.test(text)) info.breed = 'Shih Tzu';
    else if (/pit[- ]bull|pitbull/i.test(text)) info.breed = 'Pitbull';
    else if (/buldogue|bulldog/i.test(text)) info.breed = 'Buldogue';
    else if (/poodle/i.test(text)) info.breed = 'Poodle';
    else if (/pastor(?:\s+alemão)?/i.test(text)) info.breed = 'Pastor Alemão';
    else if (/siamês|siames/i.test(text)) info.breed = 'Siamês';
    else if (/persa/i.test(text)) info.breed = 'Persa';
    else if (/maine\s+coon/i.test(text)) info.breed = 'Maine Coon';
  }

  // 5. Sexo
  if (/\b(macho|masculino|menino|ele\s+é\s+macho)\b/i.test(text)) {
    info.sex = 'Macho';
  } else if (/\b(fêmea|femea|feminino|menina|ela\s+é\s+fêmea)\b/i.test(text)) {
    info.sex = 'Fêmea';
  }

  // 6. Idade
  const ageMatch = text.match(/(?:idade)[\s*:]+([0-9A-Za-zÀ-ÖØ-öø-ÿ\s]{1,25})/i) || 
                   text.match(/(\d+\s*(?:anos?|meses|mês|semanas?|dias?))/i);
  if (ageMatch) {
    info.age = ageMatch[1].trim().split('\n')[0].replace(/[*_]/g, '');
  }

  // 7. Peso aproximado
  const weightMatch = text.match(/(?:peso(?:\s+aproximado)?)[\s*:]+([0-9.,\sA-Za-z]{1,20})/i) ||
                      text.match(/(\d+(?:[.,]\d+)?\s*(?:kg|quilos?|g|gramas?))/i);
  if (weightMatch) {
    info.weight = weightMatch[1].trim().split('\n')[0].replace(/[*_]/g, '');
  }

  return info;
}

export async function POST(req: NextRequest) {
  try {
    const ai = getAi();
    const { messages, customPrompt, ragDocs: passedRagDocs, petContext } = await req.json();

    let finalPrompt = customPrompt;
    let finalModel = 'gemini-2.5-flash';
    let finalTemp = 0.2;

    // Buscar configurações de IA e RAG no Supabase se disponíveis
    let dbRagDocs: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        
        // 1. Configurações de IA
        const { data: aiSettings } = await supabase
          .from('ai_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (aiSettings) {
          if (!finalPrompt && aiSettings.system_prompt) finalPrompt = aiSettings.system_prompt;
          if (aiSettings.model_name) finalModel = aiSettings.model_name;
          if (aiSettings.temperature !== undefined) finalTemp = Number(aiSettings.temperature);
        }

        // 2. Documentos RAG ativos
        const { data: kbItems } = await supabase
          .from('knowledge_base')
          .select('title, category, content')
          .eq('is_active', true)
          .limit(10);

        if (kbItems && kbItems.length > 0) {
          dbRagDocs = kbItems;
        }
      } catch (e) {
        console.warn('Aviso: Consulta de IA no Supabase fallback:', e);
      }
    }

    const basePrompt = finalPrompt || `Você é o assistente virtual veterinário compassivo do sistema *VetPro Orienta*. 
Seu objetivo é fazer uma triagem e um pré-diagnóstico humanizado de cães e gatos com base nas informações passadas pelo tutor.

REGRA OBRIGATÓRIA DE FORMATAÇÃO (ESTRITA):
- Em todas as suas respostas, use negrito SEMPRE e APENAS com um único asterisco (*exemplo em negrito*).
- NUNCA utilize dois asteriscos (**exemplo**). Dois asteriscos é estritamente proibido.
- Quando NÃO houver ficha cadastral do animal carregada previamente e for a primeira interação com o tutor, solicite as informações utilizando rigorosamente o formato de lista abaixo (com um único asterisco para o negrito):
* *Seu nome:*
* *Nome do pet:*
* *Espécie (cão ou gato):*
* *Raça:*
* *Sexo:*
* *Idade:*
* *Peso aproximado:*

Regras clínicas e de segurança:
1. Sempre deixe claro que você é uma inteligência artificial e NÃO substitui uma consulta presencial com médico veterinário.
2. Em qualquer sinal de emergência (dificuldade respiratória, sangramento intenso, convulsões, mucosas pálidas, apatia extrema, prostração, intoxicação), instrua o tutor a buscar uma clínica veterinária IMEDIATAMENTE.
3. Não prescreva medicamentos tarja vermelha ou preta sob nenhuma hipótese. Apenas cuidados básicos de suporte, hidratação, manejo e orientações de observação clínica.
4. Seja sempre empático, calmo, acolhedor e atencioso.`;

    let systemInstruction = `${basePrompt}

[DIRETRIZ ESTRITA DE CONFORMIDADE COM O PROMPT E BASE DE CONHECIMENTO RAG]:
1. Você DEVE seguir com fidelidade absoluta todas as orientações e restrições deste System Prompt.
2. Em nenhuma hipótese desvie ou fuja das diretrizes clínicas, regras éticas e restrições de formatação.
3. Suas orientações técnicas, dados vacinais, protocolos e critérios de emergência DEVEM ser estritamente fundamentados na bibliografia e documentos da Base de Conhecimento RAG abaixo. Nunca invente dados contrários à base bibliográfica.`;

    // Injeção de Contexto do Pet já cadastrado (para nunca pedir dados repetidos)
    if (petContext && petContext.name) {
      systemInstruction += `\n\n[FICHA DO PACIENTE JÁ CARREGADA NO PRONTUÁRIO]:
- Nome do Pet: ${petContext.name}
- Tutor: ${petContext.tutor_name || 'Tutor'}
- Espécie: ${petContext.species || 'Cão'}
- Raça: ${petContext.breed || 'SRD'}
- Sexo: ${petContext.sex || 'Não informado'}
- Idade: ${petContext.age || 'Não informada'}
- Peso: ${petContext.weight || 'Não informado'}
${petContext.symptoms ? `- Últimos sintomas registrados: ${petContext.symptoms}` : ''}
${petContext.notes ? `- Observações clínicas anteriores: ${petContext.notes}` : ''}

DIRETRIZ CRÍTICA DE CONTEXTO:
Você JÁ POSSUI todos os dados cadastrais deste pet. NUNCA peça para o tutor digitar o nome, espécie, raça, sexo, idade ou peso novamente! Cumprimente o tutor e o pet pelo nome com acolhimento e foque diretamente na queixa principal, sintomas relatados e orientações de conduta.`;
    }

    // Injeção de Documentos da Base RAG (combina os passados pelo cliente + os do Supabase)
    const combinedRagDocs = (passedRagDocs && Array.isArray(passedRagDocs) && passedRagDocs.length > 0)
      ? passedRagDocs
      : dbRagDocs;

    if (combinedRagDocs && combinedRagDocs.length > 0) {
      const ragContext = combinedRagDocs
        .map((doc: any, idx: number) => `--- DOCUMENTO BIBLIOGRÁFICO RAG ${idx + 1}: ${doc.title || 'Diretriz'} (${doc.category || 'Protocolo Clínico'}) ---\n${doc.content || ''}`)
        .join('\n\n');

      systemInstruction += `\n\n[BIBLIOGRAFIA E BASE DE CONHECIMENTO CLÍNICO RAG OFICIAL DA CLÍNICA]:\nUtilize rigorosamente como fonte de verdade médica e científica os seguintes protocolos e diretrizes:\n${ragContext}`;
    }

    const formattedHistory = messages.slice(0, -1).map((m: any) => {
      const parts: any[] = [{ text: m.content || '' }];
      if (m.image) {
        const matches = m.image.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }
      return {
        role: m.role,
        parts
      };
    });

    const lastMessage = messages[messages.length - 1];
    const lastParts: any[] = [{ text: lastMessage.content || '' }];
    if (lastMessage.image) {
      const matches = lastMessage.image.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        lastParts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }

    const chat = ai.chats.create({
      model: finalModel || "gemini-2.5-flash",
      config: {
        systemInstruction,
        temperature: finalTemp ?? 0.2,
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message: lastParts.length > 1 ? lastParts : lastMessage.content });
    
    // Normalizar todo o texto gerado para ter apenas * em negrito
    const cleanText = formatSingleAsteriskBold(response.text || '');

    // Extrair dados cadastrais acumulados exclusivamente das mensagens enviadas pelo tutor/usuário
    const userConversation = messages
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content)
      .join('\n');
    const extractedData = extractPetAndTutorInfo(userConversation);

    // Avaliação heurística do nível de triagem (verde, amarelo, vermelho)
    let triageLevel: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    const textLower = (cleanText + ' ' + userConversation).toLowerCase();
    if (
      textLower.includes('emergência') || 
      textLower.includes('urgência imediata') ||
      textLower.includes('convuls') ||
      textLower.includes('hemorragia') ||
      textLower.includes('sangramento intenso') ||
      textLower.includes('dificuldade respiratória') ||
      textLower.includes('asfixia') ||
      textLower.includes('intoxicação') ||
      textLower.includes('veneno') ||
      textLower.includes('inconsciente')
    ) {
      triageLevel = 'vermelho';
    } else if (
      textLower.includes('atenção') ||
      textLower.includes('vômito') ||
      textLower.includes('diarreia') ||
      textLower.includes('febre') ||
      textLower.includes('dor') ||
      textLower.includes('mancando') ||
      textLower.includes('apatia') ||
      textLower.includes('não quer comer')
    ) {
      triageLevel = 'amarelo';
    }

    return NextResponse.json({ 
      text: cleanText,
      extractedData,
      triageLevel
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Erro ao processar mensagem." }, { status: 500 });
  }
}
