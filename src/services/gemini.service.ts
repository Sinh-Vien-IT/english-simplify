import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are an expert English language teacher who specializes in rewriting complex texts into simpler versions for English language learners. Your goal is to maintain the original meaning while making the text accessible to learners at the specified CEFR level.`;

const USER_PROMPT_TEMPLATE = (level: string, text: string) => `Rewrite the following text for English learners.

Target CEFR level: ${level}

Rules:
- Use simple vocabulary appropriate for the target level
- Use short, clear sentences
- Avoid idioms and figurative language
- Keep the original meaning and all key information
- Output only the rewritten text, do NOT add any preamble, conversational commentary, or bullet alternatives.

Text:
${text}`;

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private candidateModels = ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-latest"];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Simplify a full text to the target CEFR level.
   */
  async simplify(text: string, level: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    const chunks = this.splitIntoChunks(text, 1000);

    if (chunks.length === 1) {
      return this.simplifyChunk(chunks[0], level);
    }

    // Process chunks in parallel
    const simplifiedChunks = await Promise.all(
      chunks.map((chunk) => this.simplifyChunk(chunk, level))
    );

    return simplifiedChunks.join("\n\n");
  }

  /**
   * Simplify a single chunk of text with automatic fallback between models.
   */
  private async simplifyChunk(chunk: string, level: string): Promise<string> {
    if (!this.genAI) throw new Error("Gemini AI client is not initialized.");

    const preferredModel = process.env.GEMINI_MODEL;
    const modelsToTry = preferredModel
      ? [preferredModel, ...this.candidateModels.filter((m) => m !== preferredModel)]
      : this.candidateModels;

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        });

        const prompt = USER_PROMPT_TEMPLATE(level, chunk);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiService] Model ${modelName} failed (${err.message}). Trying fallback...`);
      }
    }

    throw lastError || new Error("All Gemini models failed to process request.");
  }

  /**
   * Sentence-aware text chunking.
   */
  private splitIntoChunks(text: string, maxWords: number): string[] {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) {
      return [text.trim()];
    }

    // Split on sentence boundaries (. ! ?)
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";
    let currentWordCount = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/).length;
      if (currentWordCount + sentenceWords > maxWords && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
        currentWordCount = 0;
      }
      currentChunk += sentence;
      currentWordCount += sentenceWords;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

export const geminiService = new GeminiService();
