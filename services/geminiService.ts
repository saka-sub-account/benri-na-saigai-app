import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, CategoryType } from "../types";

const apiKey = process.env.API_KEY;

// Helper to ensure we have a client instance
const getClient = () => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyzes an image to extract inventory details.
 */
export const identifyItemFromImage = async (base64Image: string): Promise<Partial<InventoryItem>> => {
  const ai = getClient();
  
  const prompt = `
    Analyze this product image for a pantry inventory app.
    Extract the following details in JSON format.
    Output 'name' and 'unit' in Japanese.
    
    - name: The product name (concise, e.g., "トマトスープ").
    - quantity: Estimated quantity based on package size (number). Default to 1 if unsure.
    - unit: The unit (e.g., "缶", "袋", "箱", "本").
    - expiryDate: The expiry date if clearly visible (YYYY-MM-DD). If not visible, estimate a safe duration from today based on product type (e.g., canned goods +2 years).
    - category: One of ['water', 'staple', 'main', 'side', 'hygiene', 'other'].
    - calories: Estimated calories per unit (number).
    - requiresFire: boolean (true if it needs cooking/heating).
    - requiresWater: boolean (true if it needs water to prepare, e.g., dry pasta).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['water', 'staple', 'main', 'side', 'hygiene', 'other'] },
            calories: { type: Type.NUMBER },
            requiresFire: { type: Type.BOOLEAN },
            requiresWater: { type: Type.BOOLEAN },
          },
          required: ['name', 'quantity', 'unit', 'category']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Partial<InventoryItem>;
    }
    throw new Error("No data returned from AI");
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw error;
  }
};

/**
 * Generates recipe or advice based on inventory and mode.
 */
export const getAdvisorSuggestion = async (
  inventory: InventoryItem[],
  isEmergency: boolean
): Promise<{ title: string; description: string; itemsUsed: string[] }[]> => {
  const ai = getClient();

  const inventoryList = inventory.map(i => `${i.name} (${i.quantity} ${i.unit}, 期限: ${i.expiryDate})`).join(', ');

  const systemInstruction = isEmergency
    ? "あなたは災害サバイバルの専門家です。提供された在庫のみを使用して、3つの食事または解決策を提案してください。インフラが停止している前提で、在庫に明記されていない限り火や水の使用は避けてください。カロリー摂取と精神的な安定（モラル）に焦点を当ててください。日本語で出力してください。"
    : "あなたは親切な家庭料理のシェフ兼栄養士です。在庫のアイテムを使用し、賞味期限が近いものを優先して、3つの健康的なレシピを提案してください。バランスの取れた食事に焦点を当ててください。日本語で出力してください。";

  const prompt = `
    現在の在庫: ${inventoryList}
    
    タスク: 3つの提案を作成してください。
    以下のキーを持つJSON配列を返してください: title (料理名/提案名), description (説明), itemsUsed (使用したアイテム名の配列)。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              itemsUsed: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Gemini Advisor Error:", error);
    return [{ title: "エラー", description: "現在提案を生成できません。", itemsUsed: [] }];
  }
};

/**
 * Generates a restock suggestion for a specific item.
 */
export const getRestockDetails = async (itemName: string): Promise<{ searchQuery: string; reason: string }> => {
  const ai = getClient();
  
  const prompt = `
    The user is running low on "${itemName}" in their rolling stock inventory.
    1. Suggest a good search query for Amazon Japan (Amazon.co.jp) to buy this. Prefer bulk or multi-pack if typical for pantry.
    2. Provide a very short reason in Japanese (under 30 chars) why this is added (e.g., "Stock is low").
    
    Output JSON with keys: searchQuery, reason.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            searchQuery: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ['searchQuery', 'reason']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    // Fallback
    return { searchQuery: itemName, reason: "在庫が少なくなっています" };
  } catch (error) {
    console.error("Gemini Restock Error:", error);
    return { searchQuery: itemName, reason: "在庫減少による自動補充" };
  }
};

/**
 * Generates emergency survival actions based on inventory.
 */
export const getEmergencyActions = async (inventory: InventoryItem[]): Promise<string[]> => {
  const ai = getClient();
  const inventoryList = inventory.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ');

  const prompt = `
    Inventory: ${inventoryList}
    
    Situation: Emergency disaster mode.
    Task: Provide 3 short, imperative actionable tips for survival based on this specific inventory in Japanese.
    Examples: "Consume perishable items first", "Ration water to 1L per day", "Use canned tuna for protein".
    
    Output JSON string array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return ["水の確保を最優先してください", "冷蔵庫の中身を確認してください", "体温維持に努めてください"];
  } catch (error) {
    console.error("Gemini Actions Error:", error);
    return ["身の安全を確保してください", "ラジオ等で情報を収集してください"];
  }
};