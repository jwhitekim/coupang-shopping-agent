import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

export function createGeminiModel(apiKey: string, modelName: string): GenerativeModel {
  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({ model: modelName });
}
