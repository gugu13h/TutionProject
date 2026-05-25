const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";

module.exports = async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    response.status(503).json({ error: "OPENAI_API_KEY is not configured" });
    return;
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const className = sanitizeClassName(body.className);
    const studentId = String(body.studentId || "").trim().slice(0, 40);
    const date = String(body.date || "").trim().slice(0, 20);
    const count = Math.min(Math.max(Number(body.count) || 5, 3), 8);

    const openaiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: buildPrompt({ className, studentId, date, count }),
        temperature: 0.8
      })
    });

    const payload = await openaiResponse.json();

    if (!openaiResponse.ok) {
      response.status(openaiResponse.status).json({
        error: payload?.error?.message || "OpenAI request failed"
      });
      return;
    }

    const questions = parseQuestions(extractResponseText(payload)).slice(0, count);
    response.status(200).json({
      className,
      date,
      source: "openai",
      questions
    });
  } catch (error) {
    response.status(500).json({
      error: error.message || "Unable to generate daily questions"
    });
  }
};

function sanitizeClassName(value) {
  const className = String(value || "8").replace(/[^0-9]/g, "");
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].includes(className) ? className : "8";
}

function buildPrompt({ className, studentId, date, count }) {
  return [
    "Generate daily Maths and Science practice questions for a tuition student.",
    `Class: ${className}`,
    `Student ID seed: ${studentId}`,
    `Date seed: ${date}`,
    `Number of questions: ${count}`,
    "Use only Maths and Science. Do not include English, GK, Social Studies, EVS-only, writing, or reasoning questions.",
    "Every question must start with either 'Maths:' or 'Science:'.",
    "Questions must be short, clear, exam-practice style, and different for the date seed.",
    "Return only valid JSON in this exact shape: {\"questions\":[\"question 1\",\"question 2\"]}"
  ].join("\n");
}

function parseQuestions(outputText = "") {
  const text = String(outputText || "").trim();

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.questions)) {
      return parsed.questions.map(normalizeQuestion).filter(Boolean);
    }
  } catch (error) {
    // Fall through to line parsing when the model returns text instead of JSON.
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, ""))
    .map(normalizeQuestion)
    .filter(Boolean);
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  return output
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .map((contentItem) => contentItem.text || "")
    .join("\n")
    .trim();
}

function normalizeQuestion(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 220);
}
