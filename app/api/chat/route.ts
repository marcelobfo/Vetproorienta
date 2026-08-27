import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

let aiClient: GoogleGenAI | null = null;

function getAi() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key_for_build' });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const ai = getAi();
    const { messages } = await req.json();

    
    const systemInstruction = `Você é um assistente virtual veterinário compassivo do sistema VetPro Orienta. 
Seu objetivo é fazer uma triagem e um pré-diagnóstico de pets com base nas informações passadas pelo tutor.
Seja conciso, faça perguntas relevantes (idade, raça, tempo dos sintomas) para entender melhor.
Regras críticas:
1. Sempre deixe claro que você é uma inteligência artificial e NÃO substitui uma consulta presencial.
2. Em qualquer sinal de emergência (dificuldade respiratória, sangramento intenso, convulsões, mucosas pálidas, apatia extrema), instrua o tutor a buscar uma clínica veterinária IMEDIATAMENTE.
3. Não prescreva medicamentos tarja vermelha ou preta sob nenhuma hipótese. Apenas cuidados básicos, manejo e orientações de observação.
Formate suas respostas de forma clara, amigável e legível.`;

    const formattedHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
        temperature: 0.5,
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message: lastMessage.content });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Erro ao processar mensagem." }, { status: 500 });
  }
}
