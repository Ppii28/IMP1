import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";
import { InterviewQuestion, ResponseEvaluation, OverallEvaluation, InterviewRole } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiService = {
  async generateQuestions(
    role: InterviewRole, 
    difficulty: string, 
    counts: { technical: number, behavioral: number, situational: number }
  ): Promise<InterviewQuestion[]> {
    const total = counts.technical + counts.behavioral + counts.situational;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${total} interview questions for a ${difficulty}-level ${role} position. 
      The questions MUST be distributed as follows:
      - ${counts.technical} Technical questions
      - ${counts.behavioral} Behavioral questions
      - ${counts.situational} Situational questions
      
      Use Google Search to find current industry trends or common recent interview questions for this specific role in 2025-2026.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['technical', 'behavioral', 'situational'] }
            },
            required: ["id", "text", "category"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  },

  async evaluateResponse(question: string, answer: string): Promise<ResponseEvaluation> {
    // Using gemini-2.5-flash-lite for fast feedback
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: `Evaluate the following interview answer.
      Question: ${question}
      Answer: ${answer}
      
      Provide scores (0-100) for:
      1. Overall content quality (score)
      2. Communication clarity (communication)
      3. Perceived confidence (confidence)
      4. Confidence Score (confidenceScore): Specifically calculate this based on the answer's assertiveness, directness, and use of hedging language (e.g., "I think", "maybe", "sort of"). A higher score means more assertive and direct.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            communication: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER },
            confidenceScore: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["score", "communication", "confidence", "confidenceScore", "feedback", "strengths", "improvements"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  },

  async generateFinalReport(role: string, history: { question: string, answer: string, evaluation: ResponseEvaluation }[]): Promise<OverallEvaluation> {
    const historyText = history.map(h => `Q: ${h.question}\nA: ${h.answer}\nConfidence Score: ${h.evaluation.confidenceScore}%\nFeedback: ${h.evaluation.feedback}`).join("\n\n");
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Analyze the following interview session for a ${role} position and provide a comprehensive final report.
      
      Interview History:
      ${historyText}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            communicationScore: { type: Type.NUMBER },
            confidenceScore: { type: Type.NUMBER },
            technicalScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["overallScore", "communicationScore", "confidenceScore", "technicalScore", "summary", "keyTakeaways"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  },

  async textToSpeech(text: string): Promise<string | undefined> {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say professionally and clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  },

  async transcribeAudio(base64Audio: string): Promise<string | undefined> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/wav",
              data: base64Audio,
            },
          },
          { text: "Transcribe this interview answer exactly as spoken." },
        ],
      },
    });

    return response.text;
  },

  async chatWithAssistant(message: string, history: any[]): Promise<string | undefined> {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: "You are an expert career coach and interview mentor. Help the user with interview preparation, resume tips, and career advice. Use thinking mode to provide deep, well-reasoned answers.",
      },
    });

    return response.text;
  }
};
