const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: ["questions"]
};

module.exports = async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (!["GET", "POST"].includes(request.method)) {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    response.status(503).json({ error: "OPENAI_API_KEY is not configured" });
    return;
  }

  try {
    const body = getRequestData(request);
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
        instructions: buildInstructions(),
        input: buildPrompt({ className, studentId, date, count }),
        text: {
          format: {
            type: "json_schema",
            name: "daily_practice_questions",
            strict: true,
            schema: QUESTION_SCHEMA
          }
        },
        temperature: 0.9,
        max_output_tokens: 700
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

    if (questions.length < count) {
      response.status(502).json({ error: "ChatGPT returned too few valid questions" });
      return;
    }

    response.status(200).json({
      className,
      date,
      source: "chatgpt",
      questions
    });
  } catch (error) {
    response.status(500).json({
      error: error.message || "Unable to generate daily questions"
    });
  }
};

function getRequestData(request) {
  if (request.method === "GET") {
    return request.query || {};
  }

  return typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
}

function sanitizeClassName(value) {
  const className = String(value || "8").replace(/[^0-9]/g, "");
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].includes(className) ? className : "8";
}

function buildInstructions() {
  return [
    "You are a helpful tuition teacher creating fresh daily practice.",
    "Generate age-appropriate Maths and Science questions only.",
    "Avoid repeated, generic, or copied-looking questions.",
    "Return only the requested structured JSON."
  ].join(" ");
}

function buildPrompt({ className, studentId, date, count }) {
  const daySeed = `${className}-${studentId || "guest"}-${date || new Date().toISOString().slice(0, 10)}`;

  return [
    "Generate today's fresh Maths and Science practice questions for a tuition student.",
    `Class: ${className}`,
    `Daily uniqueness seed: ${daySeed}`,
    `Date: ${date}`,
    `Number of questions: ${count}`,
    "Use only Maths and Science. Do not include English, GK, Social Studies, EVS-only, writing, or reasoning questions.",
    "Every question must start with either 'Maths:' or 'Science:'.",
    "Include a balanced mix of calculation, concept, short-answer, and application questions.",
    "Questions must be short, clear, exam-practice style, and different for this daily seed."
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
