import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { geminiService } from "./services/gemini.service.js";

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// ── Endpoints ────────────────────────────────────────────────────────────────

// 1. Health check for browser extension
app.get("/api/v1/simplify/health", (req: Request, res: Response) => {
  res.status(200).send("OK");
});

// 2. Main simplification endpoint
app.post("/api/v1/simplify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, level } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        code: "VALIDATION_FAILED",
        message: "Field 'text' is required and must not be empty.",
      });
    }

    const normalizedLevel = (level || "B1").toUpperCase();
    const validLevels = ["A2", "B1", "B2"];

    if (!validLevels.includes(normalizedLevel)) {
      return res.status(400).json({
        code: "INVALID_LEVEL",
        message: `Invalid CEFR level '${level}'. Allowed values: A2, B1, B2.`,
      });
    }

    console.log(`[Simplify] Processing ${text.length} chars for level ${normalizedLevel}`);
    const simplifiedText = await geminiService.simplify(text, normalizedLevel);

    return res.status(200).json({
      simplifiedText,
      cached: false,
      characterCount: simplifiedText.length,
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    next(error);
  }
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Error Handler]", err);

  const statusCode = err.status || err.statusCode || 502;
  return res.status(statusCode).json({
    code: "AI_SERVICE_ERROR",
    message: err.message || "Failed to process text simplification.",
  });
});

export default app;
