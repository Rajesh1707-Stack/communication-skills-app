"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type SpeechAnalysis = {
  id: string;
  lesson_id: string | null;
  transcript: string;
  pronunciation_score: number;
  vocabulary_score: number;
  grammar_score: number;
  fluency_score: number;
  overall_score: number;
  correct_sentence: string | null;
  grammar_correction: string | null;
  grammar_explanation: string | null;
  vocabulary_suggestion: string | null;
  feedback: string | null;
  created_at: string;
};

type Lesson = {
  id: string;
  lesson_number: number;
  title: string;
};

export default function StudentProgressPage() {
  const [analyses, setAnalyses] =
    useState<SpeechAnalysis[]>([]);

  const [lessons, setLessons] =
    useState<Lesson[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadProgress();
  }, []);

  // =========================================
  // LOAD PROGRESS
  // =========================================

  async function loadProgress() {
    try {
      setLoading(true);
      setErrorMessage("");

      // GET LOGGED-IN USER
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        window.location.href =
          "/login";
        return;
      }

      // GET STUDENT
      const {
        data: student,
        error: studentError,
      } = await supabase
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
        console.error(
          "Student error:",
          studentError
        );

        setErrorMessage(
          "Student information could not be found."
        );

        setLoading(false);
        return;
      }

      // GET SPEECH ANALYSIS
      const {
        data: analysisData,
        error: analysisError,
      } = await supabase
        .from("speech_analysis")
        .select(`
          id,
          lesson_id,
          transcript,
          pronunciation_score,
          vocabulary_score,
          grammar_score,
          fluency_score,
          overall_score,
          correct_sentence,
          grammar_correction,
          grammar_explanation,
          vocabulary_suggestion,
          feedback,
          created_at
        `)
        .eq(
          "student_id",
          student.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (analysisError) {
        console.error(
          "Analysis error:",
          analysisError
        );

        setErrorMessage(
          "Unable to load your progress."
        );

        setLoading(false);
        return;
      }

      // GET LESSONS
      const {
        data: lessonData,
        error: lessonError,
      } = await supabase
        .from("lessons")
        .select(`
          id,
          lesson_number,
          title
        `)
        .order(
          "lesson_number",
          {
            ascending: true,
          }
        );

      if (lessonError) {
        console.error(
          "Lesson error:",
          lessonError
        );
      }

      setAnalyses(
        analysisData || []
      );

      setLessons(
        lessonData || []
      );

      setLoading(false);

    } catch (error) {
      console.error(
        "Progress error:",
        error
      );

      setErrorMessage(
        "Something went wrong while loading your progress."
      );

      setLoading(false);
    }
  }

  // =========================================
  // AVERAGE
  // =========================================

  function average(
    values: number[]
  ) {
    if (values.length === 0) {
      return 0;
    }

    const total =
      values.reduce(
        (sum, value) =>
          sum + Number(value || 0),
        0
      );

    return Math.round(
      total / values.length
    );
  }

  const overallAverage =
    average(
      analyses.map(
        (item) =>
          item.overall_score
      )
    );

  const pronunciationAverage =
    average(
      analyses.map(
        (item) =>
          item.pronunciation_score
      )
    );

  const vocabularyAverage =
    average(
      analyses.map(
        (item) =>
          item.vocabulary_score
      )
    );

  const grammarAverage =
    average(
      analyses.map(
        (item) =>
          item.grammar_score
      )
    );

  const fluencyAverage =
    average(
      analyses.map(
        (item) =>
          item.fluency_score
      )
    );

  // =========================================
  // BEST SCORE
  // =========================================

  const bestScore =
    analyses.length > 0
      ? Math.max(
          ...analyses.map(
            (item) =>
              Number(
                item.overall_score || 0
              )
          )
        )
      : 0;

  // =========================================
  // LATEST SCORE
  // =========================================

  const latestScore =
    analyses.length > 0
      ? Number(
          analyses[0]
            ?.overall_score || 0
        )
      : 0;

  // =========================================
  // LESSON PROGRESS
  // =========================================

  const completedLessonIds =
    new Set(
      analyses
        .map(
          (item) =>
            item.lesson_id
        )
        .filter(Boolean)
    );

  const completedLessons =
    completedLessonIds.size;

  const lessonProgress =
    lessons.length > 0
      ? Math.round(
          (completedLessons /
            lessons.length) *
            100
        )
      : 0;

  // =========================================
  // FIND WEAKEST SKILL
  // =========================================

  const skillScores = [
    {
      name: "Pronunciation",
      score: pronunciationAverage,
    },
    {
      name: "Vocabulary",
      score: vocabularyAverage,
    },
    {
      name: "Grammar",
      score: grammarAverage,
    },
    {
      name: "Fluency",
      score: fluencyAverage,
    },
  ];

  const strongestSkill =
    [...skillScores].sort(
      (a, b) =>
        b.score - a.score
    )[0];

  const weakestSkill =
    [...skillScores].sort(
      (a, b) =>
        a.score - b.score
    )[0];

  // =========================================
  // DATE
  // =========================================

  function formatDate(
    date: string
  ) {
    return new Date(
      date
    ).toLocaleString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  // =========================================
  // LESSON NAME
  // =========================================

  function getLessonName(
    lessonId: string | null
  ) {
    if (!lessonId) {
      return "Speaking Practice";
    }

    const lesson =
      lessons.find(
        (item) =>
          item.id === lessonId
      );

    if (!lesson) {
      return "Speaking Practice";
    }

    return `Lesson ${lesson.lesson_number}: ${lesson.title}`;
  }

  // =========================================
  // DASHBOARD
  // =========================================

  function goDashboard() {
    window.location.href =
      "/student";
  }

  // =========================================
  // SPEAKING
  // =========================================

  function goSpeaking() {
    window.location.href =
      "/student/speaking";
  }

  // =========================================
  // LESSONS
  // =========================================

  function goLessons() {
    window.location.href =
      "/student/lessons";
  }

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-6xl px-6 py-20 text-center">

          <div className="text-6xl">
            ⏳
          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Loading your progress...
          </h2>

          <p className="mt-2 text-gray-500">
            Please wait.
          </p>

        </div>

      </main>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-50">

        <header className="border-b bg-white">

          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

            <div>
              <h1 className="text-2xl font-bold text-blue-700">
                Communication Skills
              </h1>

              <p className="text-sm text-gray-500">
                My Progress
              </p>
            </div>

            <button
              onClick={goDashboard}
              className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Dashboard
            </button>

          </div>

        </header>

        <section className="mx-auto max-w-4xl px-6 py-20">

          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">

            <div className="text-6xl">
              ⚠️
            </div>

            <h2 className="mt-5 text-2xl font-bold text-red-600">
              Unable to load progress
            </h2>

            <p className="mt-3 text-gray-500">
              {errorMessage}
            </p>

            <button
              onClick={
                loadProgress
              }
              className="mt-6 rounded-xl bg-blue-600 px-7 py-3 font-bold text-white hover:bg-blue-700"
            >
              Try Again
            </button>

          </div>

        </section>

      </main>
    );
  }

  // =========================================
  // MAIN PAGE
  // =========================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              My Progress
            </p>
          </div>

          <button
            onClick={
              goDashboard
            }
            className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
          >
            ← Dashboard
          </button>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-6 py-10">

        {/* TITLE */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            📊 My Progress
          </h2>

          <p className="mt-2 text-gray-500">
            Track your speaking performance
            and improve your communication
            skills.
          </p>

        </div>

        {/* NO ATTEMPTS */}

        {analyses.length === 0 ? (

          <section className="rounded-2xl bg-white p-12 text-center shadow-sm">

            <div className="text-6xl">
              🎤
            </div>

            <h3 className="mt-5 text-2xl font-bold text-gray-900">
              No speaking attempts yet
            </h3>

            <p className="mx-auto mt-3 max-w-lg text-gray-500">
              Complete a speaking activity
              and your AI analysis will
              appear here.
            </p>

            <button
              onClick={
                goLessons
              }
              className="mt-7 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white hover:bg-blue-700"
            >
              📚 Go to Lessons
            </button>

          </section>

        ) : (

          <>

            {/* ================================= */}
            {/* TOP SCORE */}
            {/* ================================= */}

            <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-white shadow-lg md:p-10">

              <div className="flex flex-col items-center justify-between gap-8 md:flex-row">

                <div>

                  <p className="font-semibold text-blue-100">
                    Your Overall Speaking Score
                  </p>

                  <h3 className="mt-3 text-6xl font-bold">
                    {overallAverage}%
                  </h3>

                  <p className="mt-3 text-blue-100">
                    Based on{" "}
                    {analyses.length}{" "}
                    speaking{" "}
                    {analyses.length === 1
                      ? "attempt"
                      : "attempts"}
                  </p>

                </div>

                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-white/15">

                  <div className="text-center">

                    <div className="text-5xl">
                      🏆
                    </div>

                    <p className="mt-2 text-sm font-semibold">
                      Keep Going!
                    </p>

                  </div>

                </div>

              </div>

              <div className="mt-8 h-4 overflow-hidden rounded-full bg-white/20">

                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{
                    width: `${overallAverage}%`,
                  }}
                />

              </div>

            </section>

            {/* ================================= */}
            {/* SKILL CARDS */}
            {/* ================================= */}

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              <SkillCard
                title="Pronunciation"
                score={
                  pronunciationAverage
                }
                icon="🗣️"
              />

              <SkillCard
                title="Vocabulary"
                score={
                  vocabularyAverage
                }
                icon="📚"
              />

              <SkillCard
                title="Grammar"
                score={
                  grammarAverage
                }
                icon="✏️"
              />

              <SkillCard
                title="Fluency"
                score={
                  fluencyAverage
                }
                icon="💬"
              />

            </div>

            {/* ================================= */}
            {/* QUICK STATS */}
            {/* ================================= */}

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              <QuickStat
                title="Speaking Attempts"
                value={
                  analyses.length
                }
                icon="🎤"
              />

              <QuickStat
                title="Best Score"
                value={`${bestScore}%`}
                icon="🏆"
              />

              <QuickStat
                title="Latest Score"
                value={`${latestScore}%`}
                icon="📈"
              />

              <QuickStat
                title="Lessons Completed"
                value={`${completedLessons}/${lessons.length}`}
                icon="📚"
              />

            </div>

            {/* ================================= */}
            {/* LESSON PROGRESS */}
            {/* ================================= */}

            <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                <div>

                  <h3 className="text-2xl font-bold text-gray-900">
                    📚 Lesson Progress
                  </h3>

                  <p className="mt-1 text-gray-500">
                    Keep completing lessons to
                    improve your communication
                    skills.
                  </p>

                </div>

                <div className="text-3xl font-bold text-blue-600">
                  {lessonProgress}%
                </div>

              </div>

              <div className="mt-6 h-5 overflow-hidden rounded-full bg-gray-200">

                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${lessonProgress}%`,
                  }}
                />

              </div>

              <div className="mt-4 flex justify-between text-sm text-gray-500">

                <span>
                  {completedLessons} completed
                </span>

                <span>
                  {lessons.length} total lessons
                </span>

              </div>

            </section>

            {/* ================================= */}
            {/* STRENGTH & IMPROVEMENT */}
            {/* ================================= */}

            <div className="mt-8 grid gap-6 md:grid-cols-2">

              <section className="rounded-2xl border border-green-200 bg-green-50 p-7">

                <div className="flex items-center gap-3">

                  <span className="text-3xl">
                    🏆
                  </span>

                  <div>

                    <p className="text-sm font-semibold text-green-700">
                      Your Strongest Skill
                    </p>

                    <h3 className="text-2xl font-bold text-green-900">
                      {strongestSkill.name}
                    </h3>

                  </div>

                </div>

                <p className="mt-5 text-green-800">
                  Your average score is{" "}
                  <strong>
                    {strongestSkill.score}%
                  </strong>
                  . Great work! Keep
                  practicing to maintain this
                  strength.
                </p>

              </section>

              <section className="rounded-2xl border border-orange-200 bg-orange-50 p-7">

                <div className="flex items-center gap-3">

                  <span className="text-3xl">
                    💪
                  </span>

                  <div>

                    <p className="text-sm font-semibold text-orange-700">
                      Keep Improving
                    </p>

                    <h3 className="text-2xl font-bold text-orange-900">
                      {weakestSkill.name}
                    </h3>

                  </div>

                </div>

                <p className="mt-5 text-orange-800">
                  Your current average is{" "}
                  <strong>
                    {weakestSkill.score}%
                  </strong>
                  . Practice regularly and
                  you can improve this score.
                </p>

              </section>

            </div>

            {/* ================================= */}
            {/* SPEAKING HISTORY */}
            {/* ================================= */}

            <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                <div>

                  <h3 className="text-2xl font-bold text-gray-900">
                    🎤 Speaking History
                  </h3>

                  <p className="mt-1 text-gray-500">
                    Review your previous AI
                    speaking assessments.
                  </p>

                </div>

                <button
                  onClick={
                    goSpeaking
                  }
                  className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  🎤 Practice Again
                </button>

              </div>

              <div className="mt-6 space-y-4">

                {analyses.map(
                  (
                    item,
                    index
                  ) => (

                    <div
                      key={
                        item.id
                      }
                      className="rounded-2xl border bg-slate-50 p-6"
                    >

                      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

                        <div className="flex-1">

                          <div className="flex flex-wrap items-center gap-3">

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              Attempt{" "}
                              {analyses.length -
                                index}
                            </span>

                            <span className="text-sm text-gray-500">
                              {formatDate(
                                item.created_at
                              )}
                            </span>

                          </div>

                          <h4 className="mt-4 text-lg font-bold text-gray-900">
                            {getLessonName(
                              item.lesson_id
                            )}
                          </h4>

                          <p className="mt-2 text-gray-600">
                            {item.transcript ||
                              "No transcript available."}
                          </p>

                        </div>

                        <div className="text-center">

                          <div className="text-4xl font-bold text-blue-600">
                            {Number(
                              item.overall_score ||
                                0
                            )}%
                          </div>

                          <p className="text-sm font-semibold text-gray-500">
                            Overall
                          </p>

                        </div>

                      </div>

                      {/* SCORES */}

                      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                        <MiniScore
                          title="Pronunciation"
                          score={
                            item.pronunciation_score
                          }
                        />

                        <MiniScore
                          title="Vocabulary"
                          score={
                            item.vocabulary_score
                          }
                        />

                        <MiniScore
                          title="Grammar"
                          score={
                            item.grammar_score
                          }
                        />

                        <MiniScore
                          title="Fluency"
                          score={
                            item.fluency_score
                          }
                        />

                      </div>

                      {/* CORRECT SENTENCE */}

                      {item.correct_sentence && (

                        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">

                          <p className="font-bold text-green-700">
                            ✅ Correct Sentence
                          </p>

                          <p className="mt-2 leading-7 text-green-900">
                            {
                              item.correct_sentence
                            }
                          </p>

                        </div>

                      )}

                      {/* GRAMMAR CORRECTION */}

                      {item.grammar_correction && (

                        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-5">

                          <p className="font-bold text-orange-700">
                            ✏️ Grammar Correction
                          </p>

                          <p className="mt-2 leading-7 text-orange-900">
                            {
                              item.grammar_correction
                            }
                          </p>

                        </div>

                      )}

                      {/* GRAMMAR EXPLANATION */}

                      {item.grammar_explanation && (

                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-5">

                          <p className="font-bold text-blue-700">
                            💡 Grammar Explanation
                          </p>

                          <p className="mt-2 leading-7 text-blue-900">
                            {
                              item.grammar_explanation
                            }
                          </p>

                        </div>

                      )}

                      {/* VOCABULARY */}

                      {item.vocabulary_suggestion && (

                        <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 p-5">

                          <p className="font-bold text-purple-700">
                            📚 Vocabulary Suggestion
                          </p>

                          <p className="mt-2 leading-7 text-purple-900">
                            {
                              item.vocabulary_suggestion
                            }
                          </p>

                        </div>

                      )}

                      {/* FEEDBACK */}

                      {item.feedback && (

                        <div className="mt-4 rounded-xl border border-blue-100 bg-white p-5">

                          <p className="font-bold text-blue-700">
                            🌟 AI Feedback
                          </p>

                          <p className="mt-2 leading-7 text-gray-700">
                            {
                              item.feedback
                            }
                          </p>

                        </div>

                      )}

                    </div>

                  )
                )}

              </div>

            </section>

            {/* ================================= */}
            {/* BOTTOM ACTIONS */}
            {/* ================================= */}

            <section className="mt-8 rounded-2xl bg-blue-50 p-8 text-center">

              <h3 className="text-xl font-bold text-gray-900">
                🚀 Keep Improving!
              </h3>

              <p className="mt-2 text-gray-600">
                Practice speaking regularly and
                watch your scores improve.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">

                <button
                  onClick={
                    goLessons
                  }
                  className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white hover:bg-blue-700"
                >
                  📚 Continue Lessons
                </button>

                <button
                  onClick={
                    goSpeaking
                  }
                  className="rounded-xl bg-green-600 px-7 py-3 font-bold text-white hover:bg-green-700"
                >
                  🎤 Practice Speaking
                </button>

              </div>

            </section>

          </>

        )}

      </section>

    </main>
  );
}

// =========================================
// SKILL CARD
// =========================================

function SkillCard({
  title,
  score,
  icon,
}: {
  title: string;
  score: number;
  icon: string;
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
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <span className="text-3xl">
            {icon}
          </span>

          <h3 className="font-bold text-gray-900">
            {title}
          </h3>

        </div>

        <span className="text-xl font-bold text-blue-600">
          {safeScore}%
        </span>

      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200">

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

// =========================================
// QUICK STAT
// =========================================

function QuickStat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-semibold text-gray-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {value}
          </p>

        </div>

        <span className="text-3xl">
          {icon}
        </span>

      </div>

    </div>
  );
}

// =========================================
// MINI SCORE
// =========================================

function MiniScore({
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
    <div className="rounded-xl bg-white p-4">

      <div className="flex items-center justify-between">

        <span className="text-sm font-semibold text-gray-600">
          {title}
        </span>

        <span className="font-bold text-blue-600">
          {safeScore}%
        </span>

      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">

        <div
          className="h-full rounded-full bg-blue-600"
          style={{
            width: `${safeScore}%`,
          }}
        />

      </div>

    </div>
  );
}