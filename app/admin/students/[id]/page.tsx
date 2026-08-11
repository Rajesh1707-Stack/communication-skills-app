"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  school_id: string | null;
  created_at: string;
};

type ClassData = {
  id: string;
  name: string;
  grade: number | null;
  section: string | null;
};

type Analysis = {
  id: string;
  student_id: string;
  transcript: string | null;
  pronunciation_score: number | null;
  vocabulary_score: number | null;
  grammar_score: number | null;
  fluency_score: number | null;
  overall_score: number | null;
  corrected_sentence: string | null;
  grammar_correction: string | null;
  grammar_explanation: string | null;
  vocabulary_suggestion: string | null;
  feedback: string | null;
  created_at: string;
};

export default function StudentDetailsPage() {
  const params = useParams();

  const id = String(params?.id || "");

  const [student, setStudent] =
    useState<Student | null>(null);

  const [classData, setClassData] =
    useState<ClassData | null>(null);

  const [analyses, setAnalyses] =
    useState<Analysis[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    if (id) {
      loadStudent();
    }
  }, [id]);

  // =========================================
  // LOAD STUDENT
  // =========================================

  async function loadStudent() {
    try {
      setLoading(true);
      setErrorMessage("");

      if (!id) {
        setErrorMessage(
          "Student ID was not found."
        );

        setLoading(false);
        return;
      }

      // =======================================
      // CHECK LOGIN
      // =======================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      // =======================================
      // CHECK ADMIN
      // =======================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", authData.user.id)
        .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        await supabase.auth.signOut();

        window.location.href = "/login";
        return;
      }

      // =======================================
      // GET STUDENT
      // =======================================

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(`
          id,
          name,
          student_id,
          grade,
          section,
          class_id,
          school_id,
          created_at
        `)
        .eq("id", id)
        .single();

      if (studentError) {
        console.error(
          "Student error:",
          studentError
        );

        setErrorMessage(
          studentError.message
        );

        setLoading(false);
        return;
      }

      if (!studentData) {
        setErrorMessage(
          "Student was not found."
        );

        setLoading(false);
        return;
      }

      setStudent(studentData);

      // =======================================
      // GET CLASS
      // =======================================

      if (studentData.class_id) {
        const {
          data: classInfo,
          error: classError,
        } = await supabase
          .from("classes")
          .select(`
            id,
            name,
            grade,
            section
          `)
          .eq(
            "id",
            studentData.class_id
          )
          .single();

        if (classError) {
          console.error(
            "Class error:",
            classError
          );

          setClassData(null);
        } else {
          setClassData(
            classInfo || null
          );
        }
      } else {
        setClassData(null);
      }

      // =======================================
      // GET SPEECH ANALYSIS
      // =======================================

      const {
        data: analysisData,
        error: analysisError,
      } = await supabase
        .from("speech_analysis")
        .select(`
          id,
          student_id,
          transcript,
          pronunciation_score,
          vocabulary_score,
          grammar_score,
          fluency_score,
          overall_score,
          corrected_sentence,
          grammar_correction,
          grammar_explanation,
          vocabulary_suggestion,
          feedback,
          created_at
        `)
        .eq(
          "student_id",
          studentData.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (analysisError) {
        console.error(
          "Speech analysis error:",
          analysisError
        );

        setErrorMessage(
          analysisError.message
        );

        setLoading(false);
        return;
      }

      setAnalyses(
        analysisData || []
      );

      setLoading(false);
    } catch (error) {
      console.error(
        "Student details error:",
        error
      );

      setErrorMessage(
        "Unable to load student details."
      );

      setLoading(false);
    }
  }

  // =========================================
  // LOGOUT
  // =========================================

  async function logout() {
    await supabase.auth.signOut();

    window.location.href = "/login";
  }

  // =========================================
  // BACK TO CLASS
  // =========================================

  function goBack() {
    if (student?.class_id) {
      window.location.href =
        `/admin/classes/${student.class_id}`;
    } else {
      window.location.href =
        "/admin/classes";
    }
  }

  // =========================================
  // SCORE
  // =========================================

  function getAverageScore(
    field:
      | "pronunciation_score"
      | "vocabulary_score"
      | "grammar_score"
      | "fluency_score"
      | "overall_score"
  ) {
    if (analyses.length === 0) {
      return 0;
    }

    const validScores =
      analyses.filter(
        (item) =>
          item[field] !== null &&
          item[field] !== undefined
      );

    if (validScores.length === 0) {
      return 0;
    }

    const total =
      validScores.reduce(
        (sum, item) =>
          sum +
          Number(item[field] || 0),
        0
      );

    return Math.round(
      total / validScores.length
    );
  }

  // =========================================
  // SCORE STYLE
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
            Loading student...
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

  if (
    errorMessage ||
    !student
  ) {
    return (
      <main className="min-h-screen bg-slate-50">

        <header className="border-b bg-white">

          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

            <div>
              <h1 className="text-2xl font-bold text-blue-700">
                Communication Skills
              </h1>

              <p className="text-sm text-gray-500">
                Student Details
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </header>

        <section className="mx-auto max-w-6xl px-6 py-10">

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">

            <h2 className="text-xl font-bold text-red-700">
              Student not found
            </h2>

            <p className="mt-2 text-red-600">
              {errorMessage ||
                "The requested student could not be found."}
            </p>

            <button
              onClick={goBack}
              className="mt-6 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ← Back
            </button>

          </div>

        </section>

      </main>
    );
  }

  const overall =
    getAverageScore("overall_score");

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
              Student Performance
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={goBack}
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Back
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

        <section className="rounded-2xl border bg-white p-8 shadow-sm">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-5">

              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-5xl">
                👨‍🎓
              </div>

              <div>

                <p className="text-sm font-medium text-blue-600">
                  Student
                </p>

                <h2 className="mt-1 text-3xl font-bold text-gray-900">
                  {student.name}
                </h2>

                <p className="mt-2 text-gray-500">
                  Student ID:{" "}
                  {student.student_id}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                    {student.grade
                      ? `Grade ${student.grade}`
                      : "Grade -"}
                  </span>

                  <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-700">
                    Section{" "}
                    {student.section ||
                      "-"}
                  </span>

                  {classData && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                      {classData.name}
                    </span>
                  )}

                </div>

              </div>

            </div>

            <div className="rounded-xl bg-slate-50 p-5 text-center">

              <p className="text-xs text-gray-500">
                Overall Score
              </p>

              <p
                className={`mt-2 text-4xl font-bold ${
                  overall >= 80
                    ? "text-green-600"
                    : overall >= 60
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {overall}%
              </p>

            </div>

          </div>

        </section>

        {/* PERFORMANCE SUMMARY */}

        <section className="mt-6 grid gap-5 md:grid-cols-5">

          <ScoreCard
            title="Pronunciation"
            score={getAverageScore(
              "pronunciation_score"
            )}
            icon="🗣️"
          />

          <ScoreCard
            title="Vocabulary"
            score={getAverageScore(
              "vocabulary_score"
            )}
            icon="📚"
          />

          <ScoreCard
            title="Grammar"
            score={getAverageScore(
              "grammar_score"
            )}
            icon="✏️"
          />

          <ScoreCard
            title="Fluency"
            score={getAverageScore(
              "fluency_score"
            )}
            icon="💬"
          />

          <ScoreCard
            title="Overall"
            score={overall}
            icon="🏆"
          />

        </section>

        {/* ACTIVITY SUMMARY */}

        <section className="mt-6 grid gap-5 md:grid-cols-3">

          <SummaryCard
            title="Speaking Attempts"
            value={analyses.length}
            icon="🎤"
          />

          <SummaryCard
            title="Class"
            value={
              classData?.name ||
              "Not assigned"
            }
            icon="🏫"
          />

          <SummaryCard
            title="Latest Score"
            value={
              analyses.length > 0
                ? `${Number(
                    analyses[0]
                      .overall_score || 0
                  )}%`
                : "No score"
            }
            icon="📊"
          />

        </section>

        {/* SPEAKING HISTORY */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h3 className="text-xl font-bold text-gray-900">
              🎤 Speaking Analysis History
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Previous speaking practice results.
            </p>

          </div>

          {analyses.length === 0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                🎤
              </div>

              <h4 className="mt-5 text-xl font-bold text-gray-900">
                No speaking attempts yet
              </h4>

              <p className="mt-2 text-gray-500">
                This student has not completed
                any speaking analysis.
              </p>

            </div>

          ) : (

            <div className="divide-y">

              {analyses.map(
                (analysis, index) => {

                  const score =
                    Number(
                      analysis.overall_score ||
                        0
                    );

                  return (
                    <div
                      key={analysis.id}
                      className="p-6"
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        {/* LEFT */}

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center gap-3">

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              Attempt{" "}
                              {analyses.length -
                                index}
                            </span>

                            <span className="text-xs text-gray-500">
                              {new Date(
                                analysis.created_at
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </span>

                          </div>

                          <div className="mt-4 rounded-xl bg-slate-50 p-5">

                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Student said
                            </p>

                            <p className="mt-2 leading-7 text-gray-800">
                              {analysis.transcript ||
                                "No transcript available."}
                            </p>

                          </div>

                          {analysis.corrected_sentence && (
                            <div className="mt-4 rounded-xl bg-green-50 p-5">

                              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                                Corrected sentence
                              </p>

                              <p className="mt-2 leading-7 text-green-800">
                                {
                                  analysis.corrected_sentence
                                }
                              </p>

                            </div>
                          )}

                          {analysis.feedback && (
                            <div className="mt-4 rounded-xl bg-blue-50 p-5">

                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                Feedback
                              </p>

                              <p className="mt-2 leading-7 text-blue-800">
                                {analysis.feedback}
                              </p>

                            </div>
                          )}

                        </div>

                        {/* SCORES */}

                        <div className="w-full lg:w-72">

                          <div className="rounded-xl border bg-white p-5">

                            <div className="flex items-center justify-between">

                              <span className="font-bold text-gray-900">
                                Overall
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-sm font-bold ${scoreClass(
                                  score
                                )}`}
                              >
                                {score}%
                              </span>

                            </div>

                            <div className="mt-5 space-y-4">

                              <MiniScore
                                label="Pronunciation"
                                score={
                                  Number(
                                    analysis.pronunciation_score ||
                                      0
                                  )
                                }
                              />

                              <MiniScore
                                label="Vocabulary"
                                score={
                                  Number(
                                    analysis.vocabulary_score ||
                                      0
                                  )
                                }
                              />

                              <MiniScore
                                label="Grammar"
                                score={
                                  Number(
                                    analysis.grammar_score ||
                                      0
                                  )
                                }
                              />

                              <MiniScore
                                label="Fluency"
                                score={
                                  Number(
                                    analysis.fluency_score ||
                                      0
                                  )
                                }
                              />

                            </div>

                          </div>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* BACK */}

        <div className="mt-6">

          <button
            onClick={goBack}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            ← Back to Class
          </button>

        </div>

      </section>

    </main>
  );
}

// =========================================
// SCORE CARD
// =========================================

function ScoreCard({
  title,
  score,
  icon,
}: {
  title: string;
  score: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">

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
// SUMMARY CARD
// =========================================

function SummaryCard({
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

          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {value}
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
// MINI SCORE
// =========================================

function MiniScore({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div>

      <div className="flex items-center justify-between">

        <span className="text-xs font-medium text-gray-600">
          {label}
        </span>

        <span className="text-xs font-bold text-gray-900">
          {score}%
        </span>

      </div>

      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">

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