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

// Extração robusta de dados fornecidos no chat (analisando tanto a IA quanto as mensagens do usuário)
function extractPetAndTutorInfo(conversationText: string, assistantResponseText: string) {
  const info: {
    tutorName: string | null;
    petName: string | null;
    species: string | null;
    breed: string | null;
    sex: string | null;
    age: string | null;
    weight: string | null;
    symptoms: string | null;
    isNewRegistration: boolean;
  } = {
    tutorName: null,
    petName: null,
    species: null,
    breed: null,
    sex: null,
    age: null,
    weight: null,
    symptoms: null,
    isNewRegistration: false,
  };

  const combined = `${conversationText}\n${assistantResponseText}`;
  const resp = assistantResponseText;

  // 0. Tentar extrair de tag estruturada oculta <!-- PET_REGISTER: {...} -->
  const tagMatch = resp.match(/<!--\s*PET_REGISTER:\s*(\{[\s\S]*?\})\s*-->/) || combined.match(/<!--\s*PET_REGISTER:\s*(\{[\s\S]*?\})\s*-->/);
  if (tagMatch) {
    try {
      const parsed = JSON.parse(tagMatch[1]);
      if (parsed.name) info.petName = String(parsed.name).trim();
      if (parsed.tutor_name) info.tutorName = String(parsed.tutor_name).trim();
      if (parsed.species) info.species = String(parsed.species).trim();
      if (parsed.breed) info.breed = String(parsed.breed).trim();
      if (parsed.sex) info.sex = String(parsed.sex).trim();
      if (parsed.age) info.age = String(parsed.age).trim();
      if (parsed.weight) info.weight = String(parsed.weight).trim();
      if (parsed.is_new) info.isNewRegistration = true;
    } catch {
      // continua para regex
    }
  }

  // 1. Detectar intenção de novo cadastro
  if (
    /ficha\s+cadastral\s+d[eao]\s+.*?\s+registrada/i.test(resp) ||
    /vamos\s+cadastrar/i.test(resp) ||
    /cadastr(?:o|ado|ada|amos|ei)\s+com\s+sucesso/i.test(resp) ||
    /gostaria\s+que\s+cadastrasse/i.test(conversationText) ||
    /cadastr(?:ar|e|asse)\s+(?:o|a|outro|mais\s+um)/i.test(conversationText)
  ) {
    info.isNewRegistration = true;
  }

  // 2. Nome do Pet
  if (!info.petName) {
    const petExplicit = combined.match(/(?:[-*•]\s*)?(?:nome\s+do\s+pet|pet|animal|paciente)[\s*:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,25})/i) ||
                        combined.match(/ficha\s+cadastral\s+d[eao]\s+([A-Za-zÀ-ÖØ-öø-ÿ]{2,20})/i) ||
                        conversationText.match(/cadastr(?:ar|e|asse)\s+(?:o|a|o\s+pet|a\s+pet)?\s*([A-Za-zÀ-ÖØ-öø-ÿ]{2,20})/i) ||
                        combined.match(/(?:ele\s+se\s+chama|ela\s+se\s+chama|o\s+nome\s+dele\s+é|o\s+nome\s+dela\s+é|chama-se)[\s*:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,25})/i);
    if (petExplicit) {
      const val = petExplicit[1].trim().split('\n')[0].replace(/[*_•\-]/g, '').trim();
      if (val && !['do pet', 'do cão', 'do gato', 'registrada', 'sucesso', 'agora'].includes(val.toLowerCase())) {
        info.petName = val;
      }
    }
  }

  // 3. Tutor
  if (!info.tutorName) {
    const tutorExplicit = combined.match(/(?:[-*•]\s*)?(?:tutor|nome\s+do\s+tutor|seu\s+nome)[\s*:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,35})/i) ||
                          combined.match(/(?:meu\s+nome\s+é|me\s+chamo|sou\s+o|sou\s+a)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,30})/i) ||
                          resp.match(/compreendido,\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,25})!/i);
    if (tutorExplicit) {
      const val = tutorExplicit[1].trim().split('\n')[0].replace(/[*_•\-]/g, '').trim();
      if (val && !['do pet', 'do cão', 'do gato', 'tutor'].includes(val.toLowerCase())) {
        info.tutorName = val;
      }
    }
  }

  // 4. Espécie
  if (!info.species) {
    const speciesMatch = combined.match(/(?:[-*•]\s*)?(?:espécie|especie)[\s*:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,20})/i);
    if (speciesMatch) {
      const sp = speciesMatch[1].trim().toLowerCase();
      if (sp.includes('gato') || sp.includes('felin')) info.species = 'Gato';
      else if (sp.includes('cão') || sp.includes('cao') || sp.includes('cachorr') || sp.includes('canin')) info.species = 'Cão';
    } else {
      if (/\b(gato|gata|felino|felina|felinos)\b/i.test(combined)) {
        info.species = 'Gato';
      } else if (/\b(cão|cachorro|cadela|canino|canina|cao|caninos)\b/i.test(combined)) {
        info.species = 'Cão';
      }
    }
  }

  // 5. Raça
  if (!info.breed) {
    const breedMatch = combined.match(/(?:[-*•]\s*)?(?:raça|raca)[\s*:]+([A-Za-zÀ-ÖØ-öø-ÿ\s-]{2,35})/i);
    if (breedMatch) {
      info.breed = breedMatch[1].trim().split('\n')[0].replace(/[*_•\-]/g, '').trim();
    } else {
      if (/srd|vira[- ]lata|sem\s+raça|mestiço/i.test(combined)) info.breed = 'SRD (Sem Raça Definida)';
      else if (/siamês|siames/i.test(combined)) info.breed = 'Siamês';
      else if (/persa/i.test(combined)) info.breed = 'Persa';
      else if (/maine\s+coon/i.test(combined)) info.breed = 'Maine Coon';
      else if (/golden(?:\s+retriever)?/i.test(combined)) info.breed = 'Golden Retriever';
      else if (/shih[- ]tzu/i.test(combined)) info.breed = 'Shih Tzu';
      else if (/pit[- ]bull|pitbull/i.test(combined)) info.breed = 'Pitbull';
      else if (/buldogue|bulldog/i.test(combined)) info.breed = 'Buldogue';
      else if (/poodle/i.test(combined)) info.breed = 'Poodle';
      else if (/pastor(?:\s+alemão)?/i.test(combined)) info.breed = 'Pastor Alemão';
    }
  }

  // 6. Sexo
  if (!info.sex) {
    const sexMatch = combined.match(/(?:[-*•]\s*)?(?:sexo)[\s*:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,20})/i);
    if (sexMatch) {
      const s = sexMatch[1].trim().toLowerCase();
      if (s.includes('fêm') || s.includes('fem')) info.sex = 'Fêmea';
      else if (s.includes('mach') || s.includes('masc')) info.sex = 'Macho';
    } else {
      if (/\b(fêmea|femea|feminino|menina|ela\s+é\s+fêmea)\b/i.test(combined)) info.sex = 'Fêmea';
      else if (/\b(macho|masculino|menino|ele\s+é\s+macho)\b/i.test(combined)) info.sex = 'Macho';
    }
  }

  // 7. Idade
  if (!info.age) {
    const ageMatch = combined.match(/(?:[-*•]\s*)?(?:idade)[\s*:]+([0-9A-Za-zÀ-ÖØ-öø-ÿ\s]{1,25})/i) || 
                     combined.match(/(\d+\s*(?:anos?|meses|mês|semanas?|dias?))/i);
    if (ageMatch) {
      info.age = ageMatch[1].trim().split('\n')[0].replace(/[*_•\-]/g, '').trim();
    }
  }

  // 8. Peso aproximado
  if (!info.weight) {
    const weightMatch = combined.match(/(?:[-*•]\s*)?(?:peso(?:\s+aproximado)?)[\s*:]+([0-9.,\sA-Za-z]{1,20})/i) ||
                        combined.match(/(\d+(?:[.,]\d+)?\s*(?:kg|quilos?|g|gramas?))/i);
    if (weightMatch) {
      info.weight = weightMatch[1].trim().split('\n')[0].replace(/[*_•\-]/g, '').trim();
    }
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
3. Suas orientações técnicas, dados vacinais, protocolos e critérios de emergência DEVEM ser estritamente fundamentados na bibliografia e documentos da Base de Conhecimento RAG abaixo. Nunca invente dados contrários à base bibliográfica.

[CADASTRO E REGISTRO DE PETS NO SISTEMA]:
1. Sempre que o tutor pedir para cadastrar um novo pet (ex: "gostaria que cadastrasse a Mia também", "tenho outro gato", "cadastrar novo pet"), ou quando o tutor responder aos dados cadastrais, acolha e confirme o cadastro.
2. Ao confirmar o cadastro de um pet, liste a ficha cadastral completa com os campos: Tutor, Nome do Pet, Espécie, Raça, Sexo, Idade, Peso aproximado.
3. OBRIGATÓRIO: Ao final de qualquer mensagem em que você cadastrar, confirmar ou identificar a ficha cadastral de um pet, inclua SEMPRE no final da resposta a tag estruturada JSON (invisível para o usuário):
<!-- PET_REGISTER: {"name": "NomeDoPet", "tutor_name": "NomeDoTutor", "species": "Cão ou Gato", "breed": "Raça", "sex": "Macho ou Fêmea", "age": "Idade", "weight": "Peso", "is_new": true} -->`;

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
    
    const rawAiText = response.text || '';

    // Extrair dados cadastrais acumulados tanto das mensagens do usuário quanto da resposta da IA
    const userConversation = messages
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content)
      .join('\n');
    const extractedData = extractPetAndTutorInfo(userConversation, rawAiText);

    // Remover a tag <!-- PET_REGISTER: ... --> do texto visível ao usuário
    let userVisibleText = rawAiText.replace(/<!--\s*PET_REGISTER:\s*\{[\s\S]*?\}\s*-->/g, '').trim();

    // Normalizar todo o texto gerado para ter apenas * em negrito
    const cleanText = formatSingleAsteriskBold(userVisibleText);

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
      isNewPet: extractedData.isNewRegistration,
      triageLevel
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Erro ao processar mensagem." }, { status: 500 });
  }
}
