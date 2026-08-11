import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing.");
}

const ai = new GoogleGenAI({
  apiKey,
});

const ANALYSIS_PROMPT = `
You are an English communication teacher evaluating a school student's spoken English.

Listen carefully to the student's audio.

The student is practicing:

"Introduce Yourself"

The student should talk about:

- Name
- Age
- Where they live
- School or studies

Analyze the student's actual spoken English.

Evaluate:

1. What the student actually said
2. Sentence formation
3. Grammar
4. Vocabulary
5. Fluency
6. Pronunciation as far as reasonably possible from the audio

IMPORTANT:

- Do not invent words that the student did not say.
- The transcript must represent the student's actual speech.
- If the student's sentence is grammatically correct, say that it is correct.
- If there are grammar mistakes, provide the corrected sentence.
- Keep explanations simple enough for a school student.
- Be encouraging.
- Scores must be between 0 and 100.
- Return ONLY valid JSON.
- Do not use Markdown.
- Do not put JSON inside a code block.

Return exactly this structure:

{
  "transcript": "What the student actually said",
  "correct_sentence": "Corrected version of the student's sentence",
  "pronunciation_score": 0,
  "vocabulary_score": 0,
  "grammar_score": 0,
  "fluency_score": 0,
  "overall_score": 0,
  "grammar_correction": "What was wrong",
  "grammar_explanation": "Simple explanation for the student",
  "vocabulary_suggestion": "Better vocabulary suggestions",
  "feedback": "Short encouraging feedback"
}

If the student's sentence is already correct:

"correct_sentence": "Your sentence is correct."

"grammar_correction": "No grammar correction is required."

"grammar_explanation": "Your sentence formation is good."

Give scores based on the actual audio.
`;

function score(value: unknown): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}

function buildResult(result: any) {
  return {
    transcript: String(
      result?.transcript || ""
    ),

    correct_sentence: String(
      result?.correct_sentence ||
        "Your sentence is correct."
    ),

    corrected_sentence: String(
      result?.correct_sentence ||
        "Your sentence is correct."
    ),

    pronunciation_score: score(
      result?.pronunciation_score
    ),

    vocabulary_score: score(
      result?.vocabulary_score
    ),

    grammar_score: score(
      result?.grammar_score
    ),

    fluency_score: score(
      result?.fluency_score
    ),

    overall_score: score(
      result?.overall_score
    ),

    grammar_correction: String(
      result?.grammar_correction ||
        "No grammar correction is required."
    ),

    grammar_explanation: String(
      result?.grammar_explanation ||
        "Your sentence formation is good."
    ),

    vocabulary_suggestion: String(
      result?.vocabulary_suggestion ||
        "Your vocabulary is good."
    ),

    feedback: String(
      result?.feedback ||
        "Good effort! Keep practicing."
    ),
  };
}

async function analyzeWithModel(
  model: string,
  base64Audio: string,
  mimeType: string
) {
  console.log(
    `Sending speech to Gemini model: ${model}`
  );

  const response =
    await ai.models.generateContent({
      model,

      contents: [
        {
          role: "user",

          parts: [
            {
              text: ANALYSIS_PROMPT,
            },

            {
              inlineData: {
                mimeType,
                data: base64Audio,
              },
            },
          ],
        },
      ],

      config: {
        responseMimeType: "application/json",
      },
    });

  const text =
    response.text?.trim();

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  console.log(
    `Gemini ${model} response:`,
    text
  );

  try {
    return JSON.parse(text);
  } catch {
    console.error(
      "Gemini returned invalid JSON:",
      text.substring(0, 1000)
    );

    throw new Error(
      "Gemini returned invalid JSON."
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    console.log(
      "=== Gemini speech analysis started ==="
    );

    // =========================================
    // GET AUDIO
    // =========================================

    const formData =
      await request.formData();

    const audio =
      formData.get("audio");

    if (
      !audio ||
      !(audio instanceof File)
    ) {
      return Response.json(
        {
          error:
            "Audio file was not received.",
        },
        { status: 400 }
      );
    }

    console.log(
      "Audio received:",
      {
        name: audio.name,
        type: audio.type,
        size: audio.size,
      }
    );

    if (audio.size === 0) {
      return Response.json(
        {
          error:
            "The recorded audio is empty.",
        },
        { status: 400 }
      );
    }

    // Gemini inline audio requests have a 20 MB
    // total request-size limit.
    if (audio.size > 15 * 1024 * 1024) {
      return Response.json(
        {
          error:
            "The audio recording is too large. Please record a shorter answer.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // AUDIO → BASE64
    // =========================================

    const audioBuffer =
      Buffer.from(
        await audio.arrayBuffer()
      );

    const base64Audio =
      audioBuffer.toString(
        "base64"
      );

    // The new student client sends WAV.
    // Keep the actual MIME type if it is supported.
    let mimeType =
      audio.type ||
      "audio/wav";

    const supportedTypes = [
      "audio/wav",
      "audio/mp3",
      "audio/mpeg",
      "audio/aiff",
      "audio/aac",
      "audio/ogg",
      "audio/flac",
    ];

    if (
      !supportedTypes.includes(
        mimeType
      )
    ) {
      console.warn(
        "Unsupported browser MIME type:",
        mimeType
      );

      mimeType = "audio/wav";
    }

    console.log(
      "Gemini audio:",
      {
        mimeType,
        bytes: audioBuffer.length,
      }
    );

    // =========================================
    // GEMINI
    // =========================================

    let result: any = null;
    let lastError: any = null;

    /*
      First try the current Gemini Flash model.

      If Gemini returns a temporary 5xx error,
      retry once.

      Then fall back to Gemini 2.5 Flash.
    */

    const models = [
      "gemini-3.6-flash",
      "gemini-2.5-flash",
    ];

    for (
      let modelIndex = 0;
      modelIndex < models.length;
      modelIndex++
    ) {
      const model =
        models[modelIndex];

      const attempts =
        modelIndex === 0
          ? 2
          : 1;

      for (
        let attempt = 1;
        attempt <= attempts;
        attempt++
      ) {
        try {
          console.log(
            `Gemini attempt ${attempt}/${attempts}: ${model}`
          );

          result =
            await analyzeWithModel(
              model,
              base64Audio,
              mimeType
            );

          console.log(
            `Gemini analysis successful using ${model}`
          );

          break;
        } catch (error: any) {
          lastError = error;

          console.error(
            `Gemini ${model} attempt ${attempt} failed:`,
            error
          );

          const message =
            String(
              error?.message ||
                ""
            );

          const isServerError =
            message.includes(
              "500"
            ) ||
            message.includes(
              "INTERNAL"
            ) ||
            error?.status >= 500;

          if (
            !isServerError
          ) {
            throw error;
          }

          if (
            attempt < attempts
          ) {
            await new Promise(
              (resolve) =>
                setTimeout(
                  resolve,
                  1500
                )
            );
          }
        }
      }

      if (result) {
        break;
      }
    }

    if (!result) {
      console.error(
        "All Gemini attempts failed:",
        lastError
      );

      return Response.json(
        {
          error:
            "Gemini speech analysis is temporarily unavailable. Please try again in a few seconds.",
        },
        { status: 503 }
      );
    }

    // =========================================
    // FINAL RESULT
    // =========================================

    const finalResult =
      buildResult(result);

    console.log(
      "Final speech analysis:",
      finalResult
    );

    return Response.json(
      finalResult
    );

  } catch (error: any) {
    console.error(
      "=== GEMINI API ERROR ==="
    );

    console.error(error);

    return Response.json(
      {
        error:
          error?.message ||
          "Gemini speech analysis failed.",
      },
      { status: 500 }
    );
  }
}