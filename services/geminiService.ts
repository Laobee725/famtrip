import { GoogleGenAI, Type } from "@google/genai";
import { DayPlan, ItineraryEvent } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please set it in GitHub Secrets.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * 為旅遊故事本生成感性的前言
 */
export const generateTripIntro = async (destination: string, season: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `請為前往「${destination}」的「${season}」旅行寫一段極簡、感性、富有詩意的日系雜誌風格序言。字數在 60 字以內，繁體中文。`,
    });
    return response.text.trim();
  } catch (e) {
    console.error("Gemini Intro Error:", e);
    return "讓靈魂在異地的晨曦中醒來，是給生活最美的告白。";
  }
};

export const generateItinerary = async (destination: string, duration: number, preferences: string): Promise<DayPlan[]> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `請為我規劃前往 ${destination} 的 ${duration} 天家庭旅遊。考慮到：${preferences}。請務必以 JSON 格式回傳，且結構必須符合 DayPlan 陣列。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              accommodation: { type: Type.STRING },
              transportMode: { type: Type.STRING },
              events: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    time: { type: Type.STRING },
                    title: { type: Type.STRING },
                    location: { type: Type.STRING },
                    type: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["id", "time", "title", "location", "type"]
                }
              }
            },
            required: ["day", "events"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Gemini Itinerary Error:", e);
    return [];
  }
};

export const generateTripImage = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A beautiful, high-quality professional travel photography of ${prompt}. Japanese minimal aesthetic, soft natural lighting, cinematic composition, 4k resolution.` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("AI Image Generation Error:", e);
    return null;
  }
};

export const getDaySuggestions = async (city: string, existingEvents: string[], preferences: string): Promise<Partial<ItineraryEvent>[]> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `我在 ${city} 旅遊。目前已安排：${existingEvents.join(', ')}。請根據 ${preferences} 再推薦 3 個不衝突的行程建議。請回傳 JSON 格式。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              title: { type: Type.STRING },
              location: { type: Type.STRING },
              type: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["time", "title", "location", "type", "description"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (e: any) {
    console.error("Gemini Suggestions Error:", e);
    return [];
  }
};

export const getStayWeather = async (city: string, date: string): Promise<{ weather: string; temp: number }> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `請查詢並提供 ${city} 在 ${date} 左右的典型天氣。請回傳 JSON。`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weather: { type: Type.STRING },
            temp: { type: Type.NUMBER }
          },
          required: ["weather", "temp"]
        }
      }
    });
    return JSON.parse(response.text || '{"weather": "晴時多雲", "temp": 22}');
  } catch (e) {
    return { weather: "晴時多雲", temp: 22 };
  }
};