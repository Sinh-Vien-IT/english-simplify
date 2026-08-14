# English Simplify — AI-Powered Article Simplification Backend

> Node.js / TypeScript Serverless backend for simplifying English articles to CEFR levels (A2, B1, B2).  
> Powered by Google Gemini AI API (`gemini-3.5-flash`).  
> Optimized for **Vercel Serverless Deployment** and **Chrome Extension**.

---

## 📐 Architecture Overview

```
Chrome Extension
       │
       ▼ POST /api/v1/simplify
┌────────────────────────────────────────┐
│           Express / Vercel API         │
└──────────────────┬─────────────────────┘
                   │
┌──────────────────▼─────────────────────┐
│             GeminiService              │
│   1. Sentence-aware text chunking      │
│   2. Call Google Gemini API (Parallel) │
│   3. Merge & format simplified text    │
└──────────────────┬─────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Google Gemini API  │
        │  (gemini-3.5-flash) │
        └─────────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- npm

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create or edit `.env` in the root folder:
```properties
GEMINI_API_KEY=AQ.Ab8RN6JN6p7EoQad4kr5bFSu1JLujUdHFFflRBEc6binc4v84Q
GEMINI_MODEL=gemini-3.5-flash
PORT=8080
```

### 4. Run the Server
```bash
npm run dev
```

The server starts on **http://localhost:8080** and seamlessly works with the Chrome Extension!

---

## 🌐 Deploy to Vercel (1-Click & Free 100%)

### Cách 1: Deploy qua Vercel Dashboard (Giao diện Web)
1. Push mã nguồn lên GitHub repository của bạn.
2. Truy cập [Vercel Dashboard](https://vercel.com/new).
3. Chọn Repository vừa tạo và bấm **Import**.
4. Trong phần **Environment Variables**, thêm biến:
   * `GEMINI_API_KEY`: Mã API key của bạn
   * `GEMINI_MODEL`: `gemini-3.5-flash`
5. Bấm **Deploy**. Vercel sẽ tự động build và cung cấp URL dạng `https://your-project.vercel.app`.

### Cách 2: Deploy qua Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 📡 API Reference

### POST `/api/v1/simplify`

Simplify an English article to a CEFR level.

**Request:**
```json
{
  "text": "The proliferation of digital technologies has fundamentally transformed the contemporary information landscape, enabling unprecedented access to knowledge while simultaneously creating new challenges related to information overload and cognitive fatigue.",
  "level": "B1"
}
```

**Response:**
```json
{
  "simplifiedText": "The growth of digital technology has completely changed how we get information today. It allows people to access more knowledge than ever before. However, it also creates new problems, such as having too much information and feeling mentally tired.",
  "cached": false,
  "characterCount": 248,
  "processedAt": "2026-08-14T02:47:29.889Z"
}
```

### GET `/api/v1/simplify/health`

Health check endpoint for browser extension connectivity.
