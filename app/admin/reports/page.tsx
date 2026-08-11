"use client";

import { useEffect, useMemo, useState } from "react";
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
};

type Analysis = {
  id: string;
  student_id: string;
  lesson_id: string | null;
  transcript: string | null;
  pronunciation_score: number | null;
  vocabulary_score: number | null;
  grammar_score: number | null;
  fluency_score: number | null;
  overall_score: number | null;
  feedback: string | null;
  created_at: string;
};

type StudentReport = {
  student: Student;
  attempts: number;
  pronunciation: number;
  vocabulary: number;
  grammar: number;
  fluency: number;
  overall: number;
};

export default function ReportsPage() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [analyses, setAnalyses] =
    useState<Analysis[]>([]);

  const [search, setSearch] =
    useState("");

  const [gradeFilter, setGradeFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadReports();
  }, []);

  // =========================================
  // LOAD REPORT DATA
  // =========================================

  async function loadReports() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =========================================
      // CHECK LOGIN
      // =========================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        window.location.href = "/login";
        return;
      }

      // =========================================
      // CHECK ADMIN
      // =========================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name, role")
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
      // GET STUDENTS
      // =========================================

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          `
          id,
          name,
          student_id,
          grade,
          section
          `
        )
        .order("name", {
          ascending: true,
        });

      if (studentError) {
        throw studentError;
      }

      // =========================================
      // GET SPEECH ANALYSIS
      // =========================================

      const {
        data: analysisData,
        error: analysisError,
      } = await supabase
        .from("speech_analysis")
        .select(
          `
          id,
          student_id,
          lesson_id,
          transcript,
          pronunciation_score,
          vocabulary_score,
          grammar_score,
          fluency_score,
          overall_score,
          feedback,
          created_at
          `
        )
        .order("created_at", {
          ascending: false,
        });

      if (analysisError) {
        throw analysisError;
      }

      setStudents(
        studentData || []
      );

      setAnalyses(
        analysisData || []
      );

      setLoading(false);

    } catch (error: any) {
      console.error(
        "Reports error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load reports."
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

    if (valid.length === 0) {
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
  // GLOBAL STATS
  // =========================================

  const totalAttempts =
    analyses.length;

  const overallAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.overall_score
            )
        )
        .filter(
          (value) =>
            value > 0
        )
    );

  const pronunciationAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.pronunciation_score
            )
        )
        .filter(
          (value) =>
            value > 0
        )
    );

  const vocabularyAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.vocabulary_score
            )
        )
        .filter(
          (value) =>
            value > 0
        )
    );

  const grammarAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.grammar_score
            )
        )
        .filter(
          (value) =>
            value > 0
        )
    );

  const fluencyAverage =
    average(
      analyses
        .map(
          (item) =>
            Number(
              item.fluency_score
            )
        )
        .filter(
          (value) =>
            value > 0
        )
    );

  // =========================================
  // STUDENT REPORTS
  // =========================================

  const studentReports =
    useMemo(() => {

      return students.map(
        (student) => {

          const studentAnalyses =
            analyses.filter(
              (analysis) =>
                analysis.student_id ===
                student.id
            );

          return {
            student,
            attempts:
              studentAnalyses.length,

            pronunciation:
              average(
                studentAnalyses
                  .map(
                    (item) =>
                      Number(
                        item.pronunciation_score
                      )
                  )
                  .filter(
                    (value) =>
                      value > 0
                  )
              ),

            vocabulary:
              average(
                studentAnalyses
                  .map(
                    (item) =>
                      Number(
                        item.vocabulary_score
                      )
                  )
                  .filter(
                    (value) =>
                      value > 0
                  )
              ),

            grammar:
              average(
                studentAnalyses
                  .map(
                    (item) =>
                      Number(
                        item.grammar_score
                      )
                  )
                  .filter(
                    (value) =>
                      value > 0
                  )
              ),

            fluency:
              average(
                studentAnalyses
                  .map(
                    (item) =>
                      Number(
                        item.fluency_score
                      )
                  )
                  .filter(
                    (value) =>
                      value > 0
                  )
              ),

            overall:
              average(
                studentAnalyses
                  .map(
                    (item) =>
                      Number(
                        item.overall_score
                      )
                  )
                  .filter(
                    (value) =>
                      value > 0
                  )
              ),
          };
        }
      );

    }, [
      students,
      analyses,
    ]);

  // =========================================
  // FILTER REPORTS
  // =========================================

  const filteredReports =
    studentReports.filter(
      (report) => {

        const searchText =
          `${report.student.name} ${
            report.student.student_id
          } ${
            report.student.grade || ""
          } ${
            report.student.section || ""
          }`.toLowerCase();

        const matchesSearch =
          searchText.includes(
            search.toLowerCase()
          );

        const matchesGrade =
          gradeFilter === "all" ||
          String(
            report.student.grade
          ) === gradeFilter;

        return (
          matchesSearch &&
          matchesGrade
        );
      }
    );

  // =========================================
  // GRADES
  // =========================================

  const grades =
    Array.from(
      new Set(
        students
          .map(
            (student) =>
              student.grade
          )
          .filter(
            (grade) =>
              grade !== null &&
              grade !== undefined
          )
      )
    ).sort(
      (a, b) =>
        Number(a) -
        Number(b)
    );

  // =========================================
  // SCORE CLASS
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
            Loading reports...
          </h2>

          <p className="mt-2 text-gray-500">
            Please wait.
          </p>

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
              Reports & Performance
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                (window.location.href =
                  "/admin")
              }
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Dashboard
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

        {/* TITLE */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            📊 Performance Reports
          </h2>

          <p className="mt-2 text-gray-500">
            Monitor student communication skills
            performance.
          </p>

        </div>

        {/* ERROR */}

        {errorMessage && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">

            <p className="font-medium text-red-700">
              ⚠️ {errorMessage}
            </p>

          </div>

        )}

        {/* =====================================
            MAIN STATISTICS
        ===================================== */}

        <div className="grid gap-5 md:grid-cols-3">

          <StatCard
            title="Total Students"
            value={students.length}
            description="Registered students"
            icon="👨‍🎓"
          />

          <StatCard
            title="Speaking Attempts"
            value={totalAttempts}
            description="Total analyses"
            icon="🎤"
          />

          <StatCard
            title="Average Score"
            value={`${overallAverage}%`}
            description="Overall performance"
            icon="🏆"
          />

        </div>

        {/* =====================================
            SKILL SCORES
        ===================================== */}

        <section className="mt-6">

          <h3 className="mb-4 text-xl font-bold text-gray-900">
            Skill Performance
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

        {/* =====================================
            STUDENT REPORTS
        ===================================== */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          {/* HEADER */}

          <div className="border-b p-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h3 className="text-xl font-bold text-gray-900">
                  Student Performance
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredReports.length}{" "}
                  students shown
                </p>

              </div>

              <div className="flex flex-col gap-3 sm:flex-row">

                {/* SEARCH */}

                <div className="relative">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    🔍
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search students..."
                    className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
                  />

                </div>

                {/* GRADE */}

                <select
                  value={gradeFilter}
                  onChange={(event) =>
                    setGradeFilter(
                      event.target.value
                    )
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >

                  <option value="all">
                    All Grades
                  </option>

                  {grades.map(
                    (grade) => (
                      <option
                        key={grade}
                        value={String(
                          grade
                        )}
                      >
                        Grade {grade}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>

          </div>

          {/* EMPTY */}

          {filteredReports.length ===
          0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                📊
              </div>

              <h4 className="mt-5 text-xl font-bold text-gray-900">
                No student reports found
              </h4>

              <p className="mt-2 text-gray-500">
                Try changing your search or
                grade filter.
              </p>

            </div>

          ) : (

            /* TABLE */

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px]">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      Student
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Attempts
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Pronunciation
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Vocabulary
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Grammar
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Fluency
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Overall
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {filteredReports.map(
                    (report) => (

                      <tr
                        key={
                          report.student.id
                        }
                        className="hover:bg-slate-50"
                      >

                        {/* STUDENT */}

                        <td className="px-5 py-5">

                          <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl">
                              👨‍🎓
                            </div>

                            <div>

                              <p className="font-bold text-gray-900">
                                {
                                  report
                                    .student
                                    .name
                                }
                              </p>

                              <p className="text-xs text-gray-500">
                                ID:{" "}
                                {
                                  report
                                    .student
                                    .student_id
                                }
                              </p>

                              <p className="text-xs text-gray-500">
                                {report.student.grade
                                  ? `Grade ${report.student.grade}`
                                  : "Grade -"}
                                {" • "}
                                Section{" "}
                                {report.student.section ||
                                  "-"}
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* ATTEMPTS */}

                        <td className="px-5 py-5 text-center">

                          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                            {
                              report.attempts
                            }
                          </span>

                        </td>

                        {/* PRONUNCIATION */}

                        <td className="px-5 py-5 text-center">

                          <ScoreBadge
                            score={
                              report.pronunciation
                            }
                          />

                        </td>

                        {/* VOCABULARY */}

                        <td className="px-5 py-5 text-center">

                          <ScoreBadge
                            score={
                              report.vocabulary
                            }
                          />

                        </td>

                        {/* GRAMMAR */}

                        <td className="px-5 py-5 text-center">

                          <ScoreBadge
                            score={
                              report.grammar
                            }
                          />

                        </td>

                        {/* FLUENCY */}

                        <td className="px-5 py-5 text-center">

                          <ScoreBadge
                            score={
                              report.fluency
                            }
                          />

                        </td>

                        {/* OVERALL */}

                        <td className="px-5 py-5 text-center">

                          <span
                            className={`rounded-full px-3 py-1 text-sm font-bold ${scoreClass(
                              report.overall
                            )}`}
                          >
                            {
                              report.overall
                            }%
                          </span>

                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-5 text-center">

                          <button
                            onClick={() =>
                              (window.location.href =
                                `/admin/students/${report.student.id}`)
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            View
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* REFRESH */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={loadReports}
            className="rounded-lg border bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ↻ Refresh Reports
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
  value: number | string;
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
// SCORE BADGE
// =========================================

function ScoreBadge({
  score,
}: {
  score: number;
}) {
  let className =
    "bg-gray-100 text-gray-500";

  if (score >= 80) {
    className =
      "bg-green-100 text-green-700";
  } else if (score >= 60) {
    className =
      "bg-yellow-100 text-yellow-700";
  } else if (score > 0) {
    className =
      "bg-red-100 text-red-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-bold ${className}`}
    >
      {score}%
    </span>
  );
}