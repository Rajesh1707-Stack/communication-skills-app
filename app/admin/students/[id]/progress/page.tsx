"use client";

import { use, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Student = {
  id: string;
  name: string;
  student_id: string;
  grade: number | null;
  section: string | null;
  class_id: string | null;
};

type Analysis = {
  id: string;
  student_id: string;
  lesson_id: string | null;
  transcript: string | null;
  pronunciation_score: number | null;
  vocabulary_score: number | null;

  // IMPORTANT:
  // Your database column is "gramar_score"
  gramar_score: number | null;

  fluency_score: number | null;
  overall_score: number | null;
  feedback: string | null;
  created_at: string;
};

export default function StudentProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [analyses, setAnalyses] =
    useState<Analysis[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadProgress();
  }, [id]);

  // =========================================
  // LOAD PROGRESS
  // =========================================

  async function loadProgress() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =========================================
      // CHECK LOGIN
      // =========================================

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

      // =========================================
      // CHECK ADMIN
      // =========================================

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select("role")
          .eq(
            "id",
            authData.user.id
          )
          .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        await supabase.auth.signOut();

        window.location.href =
          "/login";

        return;
      }

      // =========================================
      // GET STUDENT
      // =========================================

      const {
        data: studentData,
        error: studentError,
      } =
        await supabase
          .from("students")
          .select(
            `
            id,
            name,
            student_id,
            grade,
            section,
            class_id
            `
          )
          .eq("id", id)
          .single();

      if (studentError) {
        console.error(
          "Student error:",
          studentError
        );

        throw new Error(
          `Student error: ${studentError.message}`
        );
      }

      // =========================================
      // GET SPEECH ANALYSIS
      // =========================================

      const {
        data: analysisData,
        error: analysisError,
      } =
        await supabase
          .from("speech_analysis")
          .select(
            `
            id,
            student_id,
            lesson_id,
            transcript,
            pronunciation_score,
            vocabulary_score,
            gramar_score,
            fluency_score,
            overall_score,
            feedback,
            created_at
            `
          )
          .eq(
            "student_id",
            id
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

      if (analysisError) {
        console.error(
          "Speech analysis error:",
          analysisError
        );

        throw new Error(
          `Speech analysis error: ${analysisError.message}`
        );
      }

      setStudent(
        studentData
      );

      setAnalyses(
        analysisData || []
      );

      setLoading(false);

    } catch (error: any) {

      console.error(
        "Progress error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load student progress."
      );

      setLoading(false);
    }
  }

  // =========================================
  // LOGOUT
  // =========================================

  async function logout() {
    await supabase.auth.signOut();

    window.location.href =
      "/login";
  }

  // =========================================
  // AVERAGE
  // =========================================

  function average(
    values: number[]
  ) {
    const valid =
      values.filter(
        (value) =>
          Number.isFinite(value)
      );

    if (
      valid.length === 0
    ) {
      return 0;
    }

    const total =
      valid.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    return Math.round(
      total / valid.length
    );
  }

  // =========================================
  // PROGRESS DATA
  // =========================================

  const progressData =
    useMemo(() => {

      return analyses.map(
        (item, index) => ({
          attempt:
            index + 1,

          pronunciation:
            Number(
              item.pronunciation_score ||
                0
            ),

          vocabulary:
            Number(
              item.vocabulary_score ||
                0
            ),

          grammar:
            Number(
              item.gramar_score ||
                0
            ),

          fluency:
            Number(
              item.fluency_score ||
                0
            ),

          overall:
            Number(
              item.overall_score ||
                0
            ),

          date:
            new Date(
              item.created_at
            ).toLocaleDateString(
              "en-IN"
            ),
        })
      );

    }, [analyses]);

  // =========================================
  // AVERAGES
  // =========================================

  const overallAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.overall_score ||
                0
            )
        )
        .filter(
          (score) =>
            score > 0
        )
    );

  const pronunciationAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.pronunciation_score ||
                0
            )
        )
        .filter(
          (score) =>
            score > 0
        )
    );

  const vocabularyAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.vocabulary_score ||
                0
            )
        )
        .filter(
          (score) =>
            score > 0
        )
    );

  const grammarAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.gramar_score ||
                0
            )
        )
        .filter(
          (score) =>
            score > 0
        )
    );

  const fluencyAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.fluency_score ||
                0
            )
        )
        .filter(
          (score) =>
            score > 0
        )
    );

  // =========================================
  // FIRST / LATEST
  // =========================================

  const firstAttempt =
    analyses.length > 0
      ? analyses[0]
      : null;

  const latestAttempt =
    analyses.length > 0
      ? analyses[
          analyses.length - 1
        ]
      : null;

  const firstScore =
    Number(
      firstAttempt?.overall_score ||
        0
    );

  const latestScore =
    Number(
      latestAttempt?.overall_score ||
        0
    );

  const improvement =
    latestScore -
    firstScore;

  // =========================================
  // SCORE COLOR
  // =========================================

  function scoreClass(
    score: number
  ) {
    if (score >= 80) {
      return "bg-green-100 text-green-700";
    }

    if (score >= 60) {
      return "bg-yellow-100 text-yellow-700";
    }

    if (score > 0) {
      return "bg-red-100 text-red-700";
    }

    return "bg-gray-100 text-gray-500";
  }

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-7xl px-6 py-20 text-center">

          <div className="text-6xl">
            ⏳
          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Loading progress...
          </h2>

          <p className="mt-2 text-gray-500">
            Please wait.
          </p>

        </div>

      </main>
    );
  }

  // =========================================
  // ERROR / STUDENT NOT FOUND
  // =========================================

  if (!student) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-3xl px-6 py-20 text-center">

          <div className="text-6xl">
            ⚠️
          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Unable to load student
          </h2>

          <p className="mt-3 text-red-600">
            {errorMessage ||
              "Student not found."}
          </p>

          <button
            onClick={() =>
              (window.location.href =
                "/admin/reports")
            }
            className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            ← Back to Reports
          </button>

        </div>

      </main>
    );
  }

  // =========================================
  // PAGE
  // =========================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>

            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              Student Progress Analytics
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                (window.location.href =
                  `/admin/students/${student.id}`)
              }
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Student
            </button>

            <button
              onClick={() =>
                (window.location.href =
                  "/admin/reports")
              }
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Reports
            </button>

            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-8">

        {/* STUDENT HEADER */}

        <section className="rounded-2xl border bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-5">

              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-4xl">
                👨‍🎓
              </div>

              <div>

                <p className="text-sm font-medium text-blue-600">
                  Student Progress
                </p>

                <h2 className="mt-1 text-3xl font-bold text-gray-900">
                  {student.name}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  ID:{" "}
                  {student.student_id}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Grade{" "}
                  {student.grade ||
                    "-"}{" "}
                  • Section{" "}
                  {student.section ||
                    "-"}
                </p>

              </div>

            </div>

            <div className="rounded-xl bg-slate-50 p-5 text-center">

              <p className="text-sm text-gray-500">
                Speaking Attempts
              </p>

              <p className="mt-1 text-3xl font-bold text-blue-700">
                {analyses.length}
              </p>

            </div>

          </div>

        </section>

        {/* SUMMARY */}

        <div className="mt-6 grid gap-5 md:grid-cols-3">

          <StatCard
            title="Average Overall"
            value={`${overallAverage}%`}
            description="Average overall score"
            icon="🏆"
          />

          <StatCard
            title="First Score"
            value={`${firstScore}%`}
            description="First speaking attempt"
            icon="🚀"
          />

          <StatCard
            title="Latest Score"
            value={`${latestScore}%`}
            description="Most recent attempt"
            icon="📈"
          />

        </div>

        {/* IMPROVEMENT */}

        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <h3 className="text-xl font-bold text-gray-900">
                📈 Overall Progress
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                First attempt compared with the
                latest attempt.
              </p>

            </div>

            <div className="text-right">

              <p className="text-sm text-gray-500">
                Improvement
              </p>

              <p
                className={`mt-1 text-3xl font-bold ${
                  improvement > 0
                    ? "text-green-600"
                    : improvement < 0
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {improvement > 0
                  ? "+"
                  : ""}
                {improvement}%
              </p>

            </div>

          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">

            <ComparisonCard
              title="First Attempt"
              score={firstScore}
              icon="🚀"
            />

            <ComparisonCard
              title="Latest Attempt"
              score={latestScore}
              icon="🏆"
            />

          </div>

        </section>

        {/* SKILL AVERAGES */}

        <section className="mt-8">

          <h3 className="mb-4 text-xl font-bold text-gray-900">
            Skill Averages
          </h3>

          <div className="grid gap-5 md:grid-cols-4">

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

        </section>

        {/* PROGRESS CHART */}

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">

          <h3 className="text-xl font-bold text-gray-900">
            📊 Overall Score Progress
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Overall score across speaking attempts.
          </p>

          {progressData.length ===
          0 ? (

            <div className="py-12 text-center">

              <div className="text-5xl">
                📊
              </div>

              <p className="mt-4 font-semibold text-gray-700">
                No speaking attempts yet.
              </p>

            </div>

          ) : (

            <div className="mt-8 overflow-x-auto">

              <div
                className="relative"
                style={{
                  minWidth:
                    Math.max(
                      700,
                      progressData.length *
                        80
                    ),
                }}
              >

                {/* Y AXIS */}

                <div className="absolute bottom-10 left-0 top-0 flex w-8 flex-col justify-between">

                  {[100, 80, 60, 40, 20, 0].map(
                    (value) => (

                      <span
                        key={value}
                        className="text-right text-xs text-gray-400"
                      >
                        {value}
                      </span>

                    )
                  )}

                </div>

                {/* CHART */}

                <div className="ml-12 flex h-80 items-end gap-5 border-b border-gray-300">

                  {progressData.map(
                    (item) => (

                      <div
                        key={
                          item.attempt
                        }
                        className="group relative flex h-full w-12 flex-col justify-end"
                      >

                        <div
                          className="w-full rounded-t-lg bg-blue-500 transition hover:bg-blue-600"
                          style={{
                            height: `${Math.min(
                              Math.max(
                                item.overall,
                                0
                              ),
                              100
                            )}%`,
                          }}
                          title={`Attempt ${item.attempt}: ${item.overall}%`}
                        />

                        <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-500">
                          #{item.attempt}
                        </div>

                        <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                          {item.overall}%
                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

            </div>

          )}

        </section>

        {/* ATTEMPT HISTORY */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h3 className="text-xl font-bold text-gray-900">
              🎤 Speaking Attempt History
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Detailed performance for every attempt.
            </p>

          </div>

          {analyses.length ===
          0 ? (

            <div className="p-12 text-center">

              <div className="text-5xl">
                🎤
              </div>

              <p className="mt-4 font-semibold text-gray-700">
                No speaking attempts yet.
              </p>

            </div>

          ) : (

            <div className="divide-y">

              {[...analyses]
                .reverse()
                .map(
                  (
                    attempt,
                    index
                  ) => (

                    <div
                      key={
                        attempt.id
                      }
                      className="p-6 hover:bg-slate-50"
                    >

                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

                        <div className="flex-1">

                          <div className="flex items-center gap-3">

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              Attempt{" "}
                              {analyses.length -
                                index}
                            </span>

                            <span className="text-xs text-gray-400">
                              {new Date(
                                attempt.created_at
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </span>

                          </div>

                          {attempt.transcript && (

                            <div className="mt-4 max-w-3xl rounded-xl bg-slate-50 p-4">

                              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                Transcript
                              </p>

                              <p className="mt-2 text-sm leading-6 text-gray-700">
                                {
                                  attempt.transcript
                                }
                              </p>

                            </div>

                          )}

                          {attempt.feedback && (

                            <div className="mt-4 max-w-3xl">

                              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                Feedback
                              </p>

                              <p className="mt-2 text-sm leading-6 text-gray-600">
                                {
                                  attempt.feedback
                                }
                              </p>

                            </div>

                          )}

                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">

                          <MiniScore
                            title="Pronunciation"
                            score={Number(
                              attempt.pronunciation_score ||
                                0
                            )}
                          />

                          <MiniScore
                            title="Vocabulary"
                            score={Number(
                              attempt.vocabulary_score ||
                                0
                            )}
                          />

                          <MiniScore
                            title="Grammar"
                            score={Number(
                              attempt.gramar_score ||
                                0
                            )}
                          />

                          <MiniScore
                            title="Fluency"
                            score={Number(
                              attempt.fluency_score ||
                                0
                            )}
                          />

                          <MiniScore
                            title="Overall"
                            score={Number(
                              attempt.overall_score ||
                                0
                            )}
                          />

                        </div>

                      </div>

                    </div>

                  )
                )}

            </div>

          )}

        </section>

        {/* REFRESH */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={loadProgress}
            className="rounded-lg border bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ↻ Refresh Progress
          </button>

        </div>

      </section>

    </main>
  );
}

// =========================================
// STAT CARD
// =========================================

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            {description}
          </p>

        </div>

        <div className="text-3xl">
          {icon}
        </div>

      </div>

    </div>
  );
}

// =========================================
// COMPARISON CARD
// =========================================

function ComparisonCard({
  title,
  score,
  icon,
}: {
  title: string;
  score: number;
  icon: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p className="mt-1 text-3xl font-bold text-gray-900">
            {score}%
          </p>

        </div>

        <div className="text-3xl">
          {icon}
        </div>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">

        <div
          className="h-full rounded-full bg-blue-500"
          style={{
            width: `${Math.min(
              Math.max(score, 0),
              100
            )}%`,
          }}
        />

      </div>

    </div>
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
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {score}%
          </p>

        </div>

        <div className="text-3xl">
          {icon}
        </div>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">

        <div
          className="h-full rounded-full bg-blue-500"
          style={{
            width: `${Math.min(
              Math.max(score, 0),
              100
            )}%`,
          }}
        />

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
  return (
    <div className="min-w-[80px] rounded-xl bg-slate-50 p-3 text-center">

      <p className="text-[10px] font-semibold text-gray-400">
        {title}
      </p>

      <p className="mt-1 text-lg font-bold text-gray-900">
        {score}%
      </p>

    </div>
  );
}