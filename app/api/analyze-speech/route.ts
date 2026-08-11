import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing.");
}

const ai = new GoogleGenAI({
  apiKey,
});

// =====================================================
// PROMPT
// =====================================================

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

IMPORTANT RULES:

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

Return exactly this JSON structure:

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

// =====================================================
// SCORE HELPER
// =====================================================

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

// =====================================================
// CLEAN GEMINI RESULT
// =====================================================

function buildFinalResult(result: any) {
  return {
    transcript: String(
      result?.transcript || ""
    ),

    correct_sentence: String(
      result?.correct_sentence ||
        "Your sentence is correct."
    ),

    // Keep this because your existing frontend
    // may use the old field name.
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

// =====================================================
// REMOVE POSSIBLE MARKDOWN FROM GEMINI RESPONSE
// =====================================================

function cleanJsonText(text: string): string {
  let cleaned = text.trim();

  if (
    cleaned.startsWith("```json")
  ) {
    cleaned = cleaned.substring(7);
  }

  if (
    cleaned.startsWith("```")
  ) {
    cleaned = cleaned.substring(3);
  }

  if (
    cleaned.endsWith("```")
  ) {
    cleaned = cleaned.substring(
      0,
      cleaned.length - 3
    );
  }

  return cleaned.trim();
}

// =====================================================
// CALL GEMINI
// =====================================================

async function callGemini(
  model: string,
  base64Audio: string
) {
  console.log(
    "Calling Gemini model:",
    model
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
                mimeType: "audio/wav",
                data: base64Audio,
              },
            },
          ],
        },
      ],

      config: {
        responseMimeType:
          "application/json",
      },
    });

  const text =
    response.text?.trim();

  console.log(
    "Gemini raw response length:",
    text?.length || 0
  );

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  const cleaned =
    cleanJsonText(text);

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error(
      "Gemini JSON parsing failed."
    );

    console.error(
      "Gemini response:",
      cleaned.substring(0, 2000)
    );

    throw new Error(
      "Gemini returned invalid JSON."
    );
  }
}

// =====================================================
// POST
// =====================================================

export async function POST(
  request: Request
) {
  try {
    console.log(
      "================================="
    );

    console.log(
      "GEMINI SPEECH ANALYSIS STARTED"
    );

    console.log(
      "================================="
    );

    // =================================================
    // CHECK API KEY
    // =================================================

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is missing."
      );

      return Response.json(
        {
          error:
            "Gemini API key is not configured on the server.",
        },
        {
          status: 500,
        }
      );
    }

    // =================================================
    // GET FORM DATA
    // =================================================

    const formData =
      await request.formData();

    const audio =
      formData.get("audio");

    if (
      !audio ||
      !(audio instanceof File)
    ) {
      console.error(
        "No audio File received."
      );

      return Response.json(
        {
          error:
            "Audio file was not received.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "Audio information:",
      {
        name: audio.name,
        type: audio.type,
        size: audio.size,
      }
    );

    // =================================================
    // CHECK EMPTY AUDIO
    // =================================================

    if (audio.size <= 0) {
      return Response.json(
        {
          error:
            "The recorded audio is empty.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CHECK AUDIO SIZE
    // =================================================

    const MAX_AUDIO_SIZE =
      15 * 1024 * 1024;

    if (
      audio.size >
      MAX_AUDIO_SIZE
    ) {
      return Response.json(
        {
          error:
            "The recording is too large. Please record a shorter answer.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // READ AUDIO
    // =================================================

    const arrayBuffer =
      await audio.arrayBuffer();

    const audioBuffer =
      Buffer.from(arrayBuffer);

    if (
      audioBuffer.length === 0
    ) {
      return Response.json(
        {
          error:
            "The audio data is empty.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // CONVERT TO BASE64
    // =================================================

    const base64Audio =
      audioBuffer.toString(
        "base64"
      );

    console.log(
      "Audio converted to base64."
    );

    console.log(
      "Base64 length:",
      base64Audio.length
    );

    // =================================================
    // GEMINI MODELS
    // =================================================
    //
    // Primary:
    // gemini-2.5-flash
    //
    // Fallback:
    // gemini-2.5-flash-lite
    //
    // Both support audio input.
    //
    // =================================================

    const models = [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ];

    let geminiResult:
      | any
      | null = null;

    let lastError:
      | any
      | null = null;

    // =================================================
    // TRY MODELS
    // =================================================

    for (
      let modelIndex = 0;
      modelIndex < models.length;
      modelIndex++
    ) {
      const model =
        models[modelIndex];

      // Primary model gets two attempts.
      // Fallback gets one attempt.
      const maxAttempts =
        modelIndex === 0
          ? 2
          : 1;

      for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
      ) {
        try {
          console.log(
            `Trying ${model} - attempt ${attempt}/${maxAttempts}`
          );

          geminiResult =
            await callGemini(
              model,
              base64Audio
            );

          console.log(
            `SUCCESS: ${model}`
          );

          break;
        } catch (error: any) {
          lastError =
            error;

          console.error(
            `FAILED: ${model} attempt ${attempt}`
          );

          console.error(
            error
          );

          const errorMessage =
            String(
              error?.message ||
                ""
            );

          const status =
            Number(
              error?.status ||
                0
            );

          const isTemporaryServerError =
            status >= 500 ||
            errorMessage.includes(
              "500"
            ) ||
            errorMessage.includes(
              "INTERNAL"
            ) ||
            errorMessage.includes(
              "Internal error"
            );

          // -------------------------------------------
          // RETRY TEMPORARY 500 ERROR
          // -------------------------------------------

          if (
            isTemporaryServerError &&
            attempt < maxAttempts
          ) {
            console.log(
              "Temporary Gemini error. Retrying..."
            );

            await new Promise(
              (resolve) =>
                setTimeout(
                  resolve,
                  2000
                )
            );

            continue;
          }

          // -------------------------------------------
          // TRY NEXT MODEL
          // -------------------------------------------

          break;
        }
      }

      if (geminiResult) {
        break;
      }
    }

    // =================================================
    // ALL MODELS FAILED
    // =================================================

    if (!geminiResult) {
      console.error(
        "================================="
      );

      console.error(
        "ALL GEMINI MODELS FAILED"
      );

      console.error(
        lastError
      );

      console.error(
        "================================="
      );

      return Response.json(
        {
          error:
            "Gemini speech analysis is temporarily unavailable. Please try again.",
        },
        {
          status: 503,
        }
      );
    }

    // =================================================
    // BUILD FINAL RESULT
    // =================================================

    const finalResult =
      buildFinalResult(
        geminiResult
      );

    console.log(
      "Final analysis result:",
      finalResult
    );

    // =================================================
    // RETURN
    // =================================================

    return Response.json(
      finalResult,
      {
        status: 200,
      }
    );

  } catch (error: any) {
    // =================================================
    // FINAL ERROR
    // =================================================

    console.error(
      "================================="
    );

    console.error(
      "GEMINI API ERROR"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    const message =
      String(
        error?.message ||
          ""
      );

    // Don't expose the entire internal
    // Gemini stack trace to the student.
    if (
      message.includes(
        "500"
      ) ||
      message.includes(
        "INTERNAL"
      ) ||
      message.includes(
        "Internal error"
      )
    ) {
      return Response.json(
        {
          error:
            "Gemini speech analysis is temporarily unavailable. Please try again.",
        },
        {
          status: 503,
        }
      );
    }

    return Response.json(
      {
        error:
          message ||
          "Gemini speech analysis failed.",
      },
      {
        status: 500,
      }
    );
  }
}