import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
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

    // =========================================
    // CONVERT AUDIO TO BASE64
    // =========================================

    const audioBuffer =
      Buffer.from(
        await audio.arrayBuffer()
      );

    const base64Audio =
      audioBuffer.toString(
        "base64"
      );

    const mimeType =
      audio.type ||
      "audio/webm";

    console.log(
      "Sending audio to Gemini..."
    );

    // =========================================
    // GEMINI ANALYSIS
    // =========================================

    const response =
      await ai.models.generateContent({
        model: "gemini-3.6-flash",

        contents: [
          {
            role: "user",

            parts: [
              {
                text: `
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
- Do not put the JSON inside \`\`\` blocks.

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

and:

"grammar_correction": "No grammar correction is required."

"grammar_explanation": "Your sentence formation is good."

Give scores based on the actual audio.
`,
              },

              {
                inlineData: {
                  mimeType:
                    mimeType,

                  data:
                    base64Audio,
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

    // =========================================
    // GET GEMINI RESPONSE
    // =========================================

    const text =
      response.text?.trim();

    console.log(
      "Gemini response:",
      text
    );

    if (!text) {
      return Response.json(
        {
          error:
            "Gemini returned an empty response.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // PARSE JSON
    // =========================================

    let result: any;

    try {
      result =
        JSON.parse(text);
    } catch (error) {
      console.error(
        "Gemini JSON parse error:",
        text
      );

      return Response.json(
        {
          error:
            "Gemini returned invalid JSON.",
          raw:
            text.substring(
              0,
              500
            ),
        },
        { status: 500 }
      );
    }

    // =========================================
    // SCORE HELPER
    // =========================================

    function score(
      value: any
    ) {
      const number =
        Number(value);

      if (
        Number.isNaN(number)
      ) {
        return 0;
      }

      return Math.max(
        0,
        Math.min(
          100,
          Math.round(number)
        )
      );
    }

    // =========================================
    // FINAL RESULT
    // =========================================

    const finalResult = {
      transcript:
        String(
          result.transcript ||
            ""
        ),

      // DATABASE FIELD
      correct_sentence:
        String(
          result.correct_sentence ||
            "Your sentence is correct."
        ),

      // ALSO RETURN OLD NAME
      // SO EXISTING FRONTEND DOESN'T BREAK
      corrected_sentence:
        String(
          result.correct_sentence ||
            "Your sentence is correct."
        ),

      pronunciation_score:
        score(
          result.pronunciation_score
        ),

      vocabulary_score:
        score(
          result.vocabulary_score
        ),

      grammar_score:
        score(
          result.grammar_score
        ),

      fluency_score:
        score(
          result.fluency_score
        ),

      overall_score:
        score(
          result.overall_score
        ),

      grammar_correction:
        String(
          result.grammar_correction ||
            "No grammar correction is required."
        ),

      grammar_explanation:
        String(
          result.grammar_explanation ||
            "Your sentence formation is good."
        ),

      vocabulary_suggestion:
        String(
          result.vocabulary_suggestion ||
            "Your vocabulary is good."
        ),

      feedback:
        String(
          result.feedback ||
            "Good effort! Keep practicing."
        ),
    };

    console.log(
      "Final analysis:",
      finalResult
    );

    // =========================================
    // RETURN RESULT
    // =========================================

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