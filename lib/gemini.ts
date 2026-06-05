import { GoogleGenAI } from "@google/genai";

export const generateWithGemini = async (prompt: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return "Erro: Chave da API não configurada.";
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Nenhuma resposta gerada.";
  } catch (error) {
    console.error(error);
    return "Falha ao gerar o plano com IA. Tente novamente mais tarde.";
  }
};
