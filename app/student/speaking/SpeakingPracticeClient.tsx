"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Analysis = {
  transcript: string;
  pronunciation_score: number;
  vocabulary_score: number;
  grammar_score: number;
  fluency_score: number;
  overall_score: number;
  corrected_sentence: string;
  grammar_correction: string;
  grammar_explanation: string;
  vocabulary_suggestion: string;
  feedback: string;
};


async function convertAudioBlobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error(
      "Your browser does not support audio conversion."
    );
  }

  const audioContext = new AudioContextClass();

  try {
    const audioBuffer =
      await audioContext.decodeAudioData(arrayBuffer.slice(0));

    const numberOfChannels =
      Math.min(audioBuffer.numberOfChannels, 2);

    const sampleRate =
      audioBuffer.sampleRate;

    const length =
      audioBuffer.length;

    const interleaved = new Float32Array(
      length * numberOfChannels
    );

    if (numberOfChannels === 1) {
      interleaved.set(
        audioBuffer.getChannelData(0)
      );
    } else {
      const left =
        audioBuffer.getChannelData(0);
      const right =
        audioBuffer.getChannelData(1);

      for (let i = 0; i < length; i++) {
        interleaved[i * 2] = left[i];
        interleaved[i * 2 + 1] = right[i];
      }
    }

    const bytesPerSample = 2;
    const blockAlign =
      numberOfChannels * bytesPerSample;

    const byteRate =
      sampleRate * blockAlign;

    const dataSize =
      interleaved.length * bytesPerSample;

    const buffer =
      new ArrayBuffer(44 + dataSize);

    const view =
      new DataView(buffer);

    function writeString(
      offset: number,
      value: string
    ) {
      for (let i = 0; i < value.length; i++) {
        view.setUint8(
          offset + i,
          value.charCodeAt(i)
        );
      }
    }

    writeString(0, "RIFF");
    view.setUint32(
      4,
      36 + dataSize,
      true
    );
    writeString(8, "WAVE");
    writeString(12, "fmt ");

    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(
      22,
      numberOfChannels,
      true
    );
    view.setUint32(
      24,
      sampleRate,
      true
    );
    view.setUint32(
      28,
      byteRate,
      true
    );
    view.setUint16(
      32,
      blockAlign,
      true
    );
    view.setUint16(
      34,
      16,
      true
    );

    writeString(36, "data");
    view.setUint32(
      40,
      dataSize,
      true
    );

    let offset = 44;

    for (
      let i = 0;
      i < interleaved.length;
      i++
    ) {
      const sample =
        Math.max(
          -1,
          Math.min(
            1,
            interleaved[i]
          )
        );

      const intSample =
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff;

      view.setInt16(
        offset,
        intSample,
        true
      );

      offset += 2;
    }

    return new Blob(
      [buffer],
      {
        type: "audio/wav",
      }
    );
  } finally {
    await audioContext.close();
  }
}

export default function SpeakingPracticeClient() {
  const searchParams = useSearchParams();

  const lessonId =
    searchParams.get("lessonId");

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const audioChunksRef =
    useRef<Blob[]>([]);

  const [isRecording, setIsRecording] =
    useState(false);

  const [audioBlob, setAudioBlob] =
    useState<Blob | null>(null);

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [supported, setSupported] =
    useState(true);

  const [lessonCompleted, setLessonCompleted] =
    useState(false);

  // =========================================
  // CHECK MICROPHONE
  // =========================================

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setSupported(false);
    }
  }, []);

  // =========================================
  // START RECORDING
  // =========================================

  async function startRecording() {
    try {
      setErrorMessage("");
      setAnalysis(null);
      setAudioBlob(null);
      setLessonCompleted(false);

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setSupported(false);

        setErrorMessage(
          "Microphone recording is not supported in this browser."
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      let mimeType =
        "audio/webm";

      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
      ) {
        mimeType =
          "audio/webm;codecs=opus";
      } else if (
        MediaRecorder.isTypeSupported(
          "audio/webm"
        )
      ) {
        mimeType =
          "audio/webm";
      }

      const recorder =
        new MediaRecorder(
          stream,
          {
            mimeType,
          }
        );

      audioChunksRef.current = [];

      recorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = () => {
        const blob =
          new Blob(
            audioChunksRef.current,
            {
              type:
                recorder.mimeType ||
                "audio/webm",
            }
          );

        setAudioBlob(blob);

        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      };

      mediaRecorderRef.current =
        recorder;

      recorder.start();

      setIsRecording(true);

    } catch (error) {
      console.error(
        "Microphone error:",
        error
      );

      setErrorMessage(
        "Microphone access was denied. Please allow microphone access and try again."
      );
    }
  }

  // =========================================
  // STOP RECORDING
  // =========================================

  function stopRecording() {
    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }

    setIsRecording(false);
  }

  // =========================================
  // SAVE LESSON PROGRESS
  // =========================================

  async function markLessonCompleted(
    studentId: string,
    currentLessonId: string
  ) {
    try {
      // First check whether a progress
      // record already exists.

      const {
        data: existingProgress,
        error: findError,
      } =
        await supabase
          .from("student_progress")
          .select("id")
          .eq(
            "student_id",
            studentId
          )
          .eq(
            "lesson_id",
            currentLessonId
          )
          .maybeSingle();

      if (findError) {
        console.error(
          "Progress lookup error:",
          findError
        );

        return false;
      }

      // =====================================
      // UPDATE EXISTING RECORD
      // =====================================

      if (existingProgress) {
        const {
          error: updateError,
        } =
          await supabase
            .from("student_progress")
            .update({
              completed: true,
            })
            .eq(
              "id",
              existingProgress.id
            );

        if (updateError) {
          console.error(
            "Progress update error:",
            updateError
          );

          return false;
        }

        return true;
      }

      // =====================================
      // CREATE NEW RECORD
      // =====================================

      const {
        error: insertError,
      } =
        await supabase
          .from("student_progress")
          .insert({
            student_id:
              studentId,

            lesson_id:
              currentLessonId,

            completed: true,
          });

      if (insertError) {
        console.error(
          "Progress insert error:",
          insertError
        );

        return false;
      }

      return true;

    } catch (error) {
      console.error(
        "Mark lesson completed error:",
        error
      );

      return false;
    }
  }

  // =========================================
  // ANALYZE SPEECH
  // =========================================

  async function analyzeSpeech() {
    if (!audioBlob) {
      setErrorMessage(
        "Please record your speech first."
      );

      return;
    }

    setAnalyzing(true);
    setErrorMessage("");
    setAnalysis(null);
    setLessonCompleted(false);

    try {
      // =====================================
      // CHECK LOGIN
      // =====================================

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        window.location.href =
          "/login";

        return;
      }

      // =====================================
      // GET STUDENT
      // =====================================

      const {
        data: student,
        error: studentError,
      } =
        await supabase
          .from("students")
          .select("id")
          .eq(
            "auth_user_id",
            authData.user.id
          )
          .single();

      if (
        studentError ||
        !student
      ) {
        throw new Error(
          "Student information could not be found."
        );
      }

      // =====================================
      // SEND AUDIO TO AI
      // =====================================

      // Gemini's audio input currently supports WAV, MP3,
      // AIFF, AAC, OGG Vorbis and FLAC. Convert the browser's
      // WebM recording to WAV before sending it to the API.
      const wavBlob =
        await convertAudioBlobToWav(
          audioBlob
        );

      const formData =
        new FormData();

      formData.append(
        "audio",
        wavBlob,
        "student-speech.wav"
      );

      const response =
        await fetch(
          "/api/analyze-speech",
          {
            method: "POST",
            body: formData,
          }
        );

      const responseText =
        await response.text();

      let result: any;

      try {
        result =
          JSON.parse(
            responseText
          );
      } catch {
        console.error(
          "Invalid AI response:",
          responseText
        );

        throw new Error(
          "The AI server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Speech analysis failed."
        );
      }

      // =====================================
      // NORMALIZE AI RESULT
      // =====================================

      const finalAnalysis: Analysis =
        {
          transcript:
            result.transcript ||
            "",

          pronunciation_score:
            Number(
              result.pronunciation_score ||
                0
            ),

          vocabulary_score:
            Number(
              result.vocabulary_score ||
                0
            ),

          grammar_score:
            Number(
              result.grammar_score ||
                0
            ),

          fluency_score:
            Number(
              result.fluency_score ||
                0
            ),

          overall_score:
            Number(
              result.overall_score ||
                0
            ),

          corrected_sentence:
            result.corrected_sentence ||
            "",

          grammar_correction:
            result.grammar_correction ||
            "",

          grammar_explanation:
            result.grammar_explanation ||
            "",

          vocabulary_suggestion:
            result.vocabulary_suggestion ||
            "",

          feedback:
            result.feedback ||
            "",
        };

      // =====================================
      // SAVE SPEECH ANALYSIS
      // =====================================

      const {
        error: saveError,
      } =
        await supabase
          .from("speech_analysis")
          .insert({
            student_id:
              student.id,

            lesson_id:
              lessonId || null,

            transcript:
              finalAnalysis.transcript,

            pronunciation_score:
              finalAnalysis.pronunciation_score,

            vocabulary_score:
              finalAnalysis.vocabulary_score,

            grammar_score:
              finalAnalysis.grammar_score,

            fluency_score:
              finalAnalysis.fluency_score,

            overall_score:
              finalAnalysis.overall_score,

            corrected_sentence:
              finalAnalysis.corrected_sentence,

            grammar_correction:
              finalAnalysis.grammar_correction,

            grammar_explanation:
              finalAnalysis.grammar_explanation,

            vocabulary_suggestion:
              finalAnalysis.vocabulary_suggestion,

            feedback:
              finalAnalysis.feedback,
          });

      if (saveError) {
        console.error(
          "Speech analysis save error:",
          saveError
        );

        throw new Error(
          "AI analysis worked, but the result could not be saved: " +
            saveError.message
        );
      }

      // =====================================
      // MARK LESSON COMPLETED
      // =====================================

      if (lessonId) {
        const completed =
          await markLessonCompleted(
            student.id,
            lessonId
          );

        if (completed) {
          setLessonCompleted(true);
        } else {
          console.warn(
            "Speech saved, but lesson completion could not be saved."
          );
        }
      }

      // =====================================
      // SHOW ANALYSIS
      // =====================================

      setAnalysis(
        finalAnalysis
      );

    } catch (error: any) {
      console.error(
        "Speech analysis error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to analyze speech."
      );
    }

    setAnalyzing(false);
  }

  // =========================================
  // TRY AGAIN
  // =========================================

  function tryAgain() {
    setAnalysis(null);
    setAudioBlob(null);
    setErrorMessage("");
    setLessonCompleted(false);
  }

  // =========================================
  // GO TO LESSON
  // =========================================

  function goBackToLesson() {
    if (lessonId) {
      window.location.href =
        `/student/lessons/${lessonId}`;
    } else {
      window.location.href =
        "/student/lessons";
    }
  }

  // =========================================
  // DASHBOARD
  // =========================================

  function goDashboard() {
    window.location.href =
      "/student";
  }

  // =========================================
  // PAGE
  // =========================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =================================== */}
      {/* HEADER */}
      {/* =================================== */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <div>

            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              AI Speaking Practice
            </p>

          </div>

          <div className="flex gap-3">

            <button
              onClick={
                goBackToLesson
              }
              className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              â† Lesson
            </button>

            <button
              onClick={
                goDashboard
              }
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Dashboard
            </button>

          </div>

        </div>

      </header>

      {/* =================================== */}
      {/* CONTENT */}
      {/* =================================== */}

      <section className="mx-auto max-w-4xl px-6 py-10">

        {/* TITLE */}

        <div className="text-center">

          <div className="text-6xl">
            ðŸŽ¤
          </div>

          <h2 className="mt-5 text-3xl font-bold text-gray-900">
            Speaking Practice
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            Speak naturally and receive
            AI feedback on your English.
          </p>

        </div>

        {/* ================================= */}
        {/* SPEAKING TASK */}
        {/* ================================= */}

        <section className="mt-8 rounded-2xl bg-blue-600 p-8 text-white shadow-sm">

          <p className="text-sm font-semibold text-blue-100">
            Speaking Task
          </p>

          <h3 className="mt-3 text-2xl font-bold">
            Introduce Yourself
          </h3>

          <p className="mt-4 leading-7 text-blue-100">
            Tell us your name, age,
            where you live, and where
            you study.
          </p>

          {lessonId && (
            <p className="mt-4 text-xs text-blue-200">
              Lesson connected âœ“
            </p>
          )}

        </section>

        {/* ================================= */}
        {/* ERROR */}
        {/* ================================= */}

        {errorMessage && (

          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-red-600">

            <p className="font-semibold">
              âš ï¸ {errorMessage}
            </p>

          </div>

        )}

        {/* ================================= */}
        {/* MICROPHONE */}
        {/* ================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-10 text-center shadow-sm">

          <div
            className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full ${
              isRecording
                ? "animate-pulse bg-red-100"
                : "bg-blue-50"
            }`}
          >

            <span className="text-6xl">
              ðŸŽ™ï¸
            </span>

          </div>

          {isRecording ? (

            <>

              <h3 className="mt-6 text-2xl font-bold text-red-600">
                Recording...
              </h3>

              <p className="mt-2 text-gray-500">
                Speak clearly into your microphone.
              </p>

              <button
                onClick={
                  stopRecording
                }
                className="mt-6 rounded-xl bg-red-600 px-8 py-4 font-bold text-white hover:bg-red-700"
              >
                â¹ Stop Recording
              </button>

            </>

          ) : (

            <>

              <h3 className="mt-6 text-2xl font-bold text-gray-900">
                Ready to speak?
              </h3>

              <p className="mt-2 text-gray-500">
                Click the button and
                introduce yourself.
              </p>

              <button
                onClick={
                  startRecording
                }
                disabled={!supported}
                className="mt-6 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ðŸŽ™ Start Recording
              </button>

            </>

          )}

        </section>

        {/* ================================= */}
        {/* RECORDING READY */}
        {/* ================================= */}

        {audioBlob &&
          !isRecording &&
          !analysis && (

            <section className="mt-8 rounded-2xl border bg-white p-8 text-center shadow-sm">

              <div className="text-5xl">
                âœ…
              </div>

              <h3 className="mt-4 text-2xl font-bold text-gray-900">
                Recording Ready
              </h3>

              <p className="mt-2 text-gray-500">
                Your recording is ready
                for AI analysis.
              </p>

              <button
                onClick={
                  analyzeSpeech
                }
                disabled={analyzing}
                className="mt-6 rounded-xl bg-purple-600 px-8 py-4 font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyzing
                  ? "ðŸ¤– Analyzing..."
                  : "ðŸ¤– Analyze My Speech"}
              </button>

            </section>

          )}

        {/* ================================= */}
        {/* ANALYSIS RESULTS */}
        {/* ================================= */}

        {analysis && (

          <div className="mt-8 space-y-8">

            {/* LESSON COMPLETE */}

            {lessonCompleted && (

              <section className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">

                <div className="text-6xl">
                  ðŸŽ‰
                </div>

                <h3 className="mt-4 text-3xl font-bold text-green-700">
                  Lesson Completed!
                </h3>

                <p className="mt-3 text-green-700">
                  Great job! Your speaking
                  activity has been completed.
                </p>

                <div className="mt-5 inline-block rounded-xl bg-white px-6 py-4 shadow-sm">

                  <p className="text-sm text-gray-500">
                    Your Score
                  </p>

                  <p className="text-4xl font-bold text-green-600">
                    {analysis.overall_score}%
                  </p>

                </div>

              </section>

            )}

            {/* TRANSCRIPT */}

            <section className="rounded-2xl border bg-white p-8 shadow-sm">

              <h3 className="text-2xl font-bold text-gray-900">
                ðŸ“ What You Said
              </h3>

              <div className="mt-5 rounded-xl bg-slate-50 p-6">

                <p className="leading-8 text-gray-700">
                  {analysis.transcript ||
                    "No transcript available."}
                </p>

              </div>

            </section>

            {/* CORRECT SENTENCE */}

            <section className="rounded-2xl border border-green-200 bg-white p-8 shadow-sm">

              <h3 className="text-2xl font-bold text-gray-900">
                âœ… Correct Sentence
              </h3>

              <div className="mt-5 rounded-xl bg-green-50 p-6">

                <p className="text-lg font-semibold leading-8 text-green-800">
                  {analysis.corrected_sentence ||
                    "No correction required."}
                </p>

              </div>

            </section>

            {/* GRAMMAR */}

            <section className="rounded-2xl border bg-white p-8 shadow-sm">

              <h3 className="text-2xl font-bold text-gray-900">
                âœï¸ Grammar Correction
              </h3>

              <div className="mt-5 rounded-xl bg-yellow-50 p-6">

                <p className="leading-7 text-gray-700">
                  {analysis.grammar_correction ||
                    "No grammar correction required."}
                </p>

              </div>

            </section>

            {/* GRAMMAR EXPLANATION */}

            <section className="rounded-2xl border bg-white p-8 shadow-sm">

              <h3 className="text-2xl font-bold text-gray-900">
                ðŸ’¡ Grammar Explanation
              </h3>

              <div className="mt-5 rounded-xl bg-blue-50 p-6">

                <p className="leading-7 text-gray-700">
                  {analysis.grammar_explanation ||
                    "Your sentence formation is good."}
                </p>

              </div>

            </section>

            {/* VOCABULARY */}

            <section className="rounded-2xl border bg-white p-8 shadow-sm">

              <h3 className="text-2xl font-bold text-gray-900">
                ðŸ“š Vocabulary Suggestion
              </h3>

              <div className="mt-5 rounded-xl bg-purple-50 p-6">

                <p className="leading-7 text-gray-700">
                  {analysis.vocabulary_suggestion ||
                    "Keep improving your vocabulary."}
                </p>

              </div>

            </section>

            {/* SCORES */}

            <section className="rounded-2xl border bg-white p-8 shadow-sm">

              <div className="text-center">

                <h3 className="text-3xl font-bold text-gray-900">
                  ðŸ¤– AI Speech Analysis
                </h3>

                <div className="mx-auto mt-8 flex h-44 w-44 items-center justify-center rounded-full bg-blue-50">

                  <div>

                    <p className="text-6xl font-bold text-green-600">
                      {analysis.overall_score}
                    </p>

                    <p className="font-semibold text-gray-500">
                      Overall Score
                    </p>

                  </div>

                </div>

              </div>

              <ScoreBar
                title="ðŸ—£ï¸ Pronunciation"
                score={
                  analysis.pronunciation_score
                }
              />

              <ScoreBar
                title="ðŸ“š Vocabulary"
                score={
                  analysis.vocabulary_score
                }
              />

              <ScoreBar
                title="âœï¸ Grammar"
                score={
                  analysis.grammar_score
                }
              />

              <ScoreBar
                title="ðŸ’¬ Fluency"
                score={
                  analysis.fluency_score
                }
              />

            </section>

            {/* FEEDBACK */}

            <section className="rounded-2xl bg-blue-600 p-8 text-white shadow-sm">

              <h3 className="text-2xl font-bold">
                ðŸŒŸ AI Feedback
              </h3>

              <p className="mt-5 whitespace-pre-line leading-8 text-blue-50">
                {analysis.feedback ||
                  "Good effort! Keep practicing."}
              </p>

            </section>

            {/* ACTIONS */}

            <section className="rounded-2xl border bg-white p-8 text-center shadow-sm">

              <h3 className="text-2xl font-bold text-gray-900">
                ðŸŽ¯ What would you like to do?
              </h3>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">

                <button
                  onClick={
                    tryAgain
                  }
                  className="rounded-xl bg-purple-600 px-8 py-4 font-bold text-white hover:bg-purple-700"
                >
                  ðŸŽ™ Try Again
                </button>

                <button
                  onClick={
                    goBackToLesson
                  }
                  className="rounded-xl bg-blue-600 px-8 py-4 font-bold text-white hover:bg-blue-700"
                >
                  â† Back to Lesson
                </button>

                <button
                  onClick={() => {
                    window.location.href =
                      "/student/progress";
                  }}
                  className="rounded-xl bg-green-600 px-8 py-4 font-bold text-white hover:bg-green-700"
                >
                  ðŸ“Š View Progress
                </button>

              </div>

            </section>

          </div>

        )}

      </section>

    </main>
  );
}

// =========================================
// SCORE BAR
// =========================================

function ScoreBar({
  title,
  score,
}: {
  title: string;
  score: number;
}) {
  const safeScore =
    Math.min(
      100,
      Math.max(
        0,
        Number(score) || 0
      )
    );

  return (
    <div className="mt-7">

      <div className="flex items-center justify-between">

        <h4 className="font-bold text-gray-800">
          {title}
        </h4>

        <span className="font-bold text-blue-600">
          {safeScore}%
        </span>

      </div>

      <div className="mt-3 h-4 overflow-hidden rounded-full bg-gray-200">

        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{
            width: `${safeScore}%`,
          }}
        />

      </div>

    </div>
  );
}