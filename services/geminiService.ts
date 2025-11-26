import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert commercial kitchen inventory auditor. 
Your SOLE TASK is to count "Kachori Dough Balls" (Raw Maida/Flour balls) arranged in a rectangular tray.

ANALYSIS PROTOCOL:
1. **SCAN**: Systematically scan the image from top-left to bottom-right.
2. **DISTINGUISH**: Differentiate between:
   - A dough ball (Count this).
   - A reflection on the metal tray (Ignore this).
   - A gap/empty space (Ignore this).
3. **GROUPING**: If balls are touching, look for the curvature to separate them.
4. **OUTPUT**: Return ONLY the final integer count.

Note: The lighting might be dim or industrial. Trust the shape and texture.
`;

export const analyzeImageForCount = async (base64Image: string): Promise<GeminiAnalysisResult> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Clean base64 string if it contains the header
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
              },
            },
            {
              text: "Count the dough balls in this tray. Be extremely precise.",
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingBudget: 32768, // Max thinking for precision counting
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            count: {
              type: Type.INTEGER,
              description: "The verified total count of dough balls.",
            },
          },
          required: ["count"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini.");
    }

    // Clean up Markdown code blocks if present (e.g., ```json ... ```)
    const cleanText = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON:", cleanText);
      throw new Error("AI returned invalid JSON format.");
    }
    
    return {
      count: parsed.count,
      rawText: text,
    };

  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);
    // Extract meaningful error message
    const msg = error.message || "Unknown error";
    if (msg.includes("500") || msg.includes("Rpc failed") || msg.includes("Network")) {
      throw new Error("Server busy. Please try scanning again.");
    }
    throw error;
  }
};