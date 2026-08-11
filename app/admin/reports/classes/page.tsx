"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type ClassRow = {
  id: string;
  name: string | null;
  grade: number | null;
  section: string | null;
};

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
  pronunciation_score: number | null;
  vocabulary_score: number | null;
  grammar_score: number | null;
  fluency_score: number | null;
  overall_score: number | null;
  created_at: string;
};

type ClassReport = {
  classData: ClassRow;
  students: Student[];
  attempts: number;
  pronunciation: number;
  vocabulary: number;
  grammar: number;
  fluency: number;
  overall: number;
};

export default function ClassReportsPage() {
  const [classes, setClasses] =
    useState<ClassRow[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [analyses, setAnalyses] =
    useState<Analysis[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadClassReports();
  }, []);

  // =========================================
  // LOAD DATA
  // =========================================

  async function loadClassReports() {
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
      // GET CLASSES
      // =========================================

      const {
        data: classData,
        error: classError,
      } = await supabase
        .from("classes")
        .select(
          "id, name, grade, section"
        )
        .order("grade", {
          ascending: true,
        });

      if (classError) {
        throw classError;
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
          section,
          class_id
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
          pronunciation_score,
          vocabulary_score,
          grammar_score,
          fluency_score,
          overall_score,
          created_at
          `
        );

      if (analysisError) {
        throw analysisError;
      }

      setClasses(
        classData || []
      );

      setStudents(
        studentData || []
      );

      setAnalyses(
        analysisData || []
      );

      setLoading(false);

    } catch (error: any) {
      console.error(
        "Class reports error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load class reports."
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
  // CREATE CLASS REPORTS
  // =========================================

  const classReports: ClassReport[] =
    classes.map(
      (classData) => {

        const classStudents =
          students.filter(
            (student) =>
              student.class_id ===
              classData.id
          );

        const studentIds =
          classStudents.map(
            (student) =>
              student.id
          );

        const classAnalyses =
          analyses.filter(
            (analysis) =>
              studentIds.includes(
                analysis.student_id
              )
          );

        return {
          classData,
          students:
            classStudents,

          attempts:
            classAnalyses.length,

          pronunciation:
            average(
              classAnalyses
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
              classAnalyses
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
              classAnalyses
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
              classAnalyses
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
              classAnalyses
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

  // =========================================
  // SEARCH
  // =========================================

  const filteredReports =
    classReports.filter(
      (report) => {

        const className =
          report.classData.name ||
          `Grade ${
            report.classData.grade ||
            "-"
          } - ${
            report.classData.section ||
            "-"
          }`;

        const searchText =
          `${className} ${
            report.classData.grade ||
            ""
          } ${
            report.classData.section ||
            ""
          }`.toLowerCase();

        return searchText.includes(
          search.toLowerCase()
        );
      }
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
            Loading class reports...
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
              Class Performance Reports
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                (window.location.href =
                  "/admin/reports")
              }
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Reports
            </button>

            <button
              onClick={() =>
                (window.location.href =
                  "/admin")
              }
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Dashboard
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
            🏫 Class Performance
          </h2>

          <p className="mt-2 text-gray-500">
            View communication skills performance
            by class.
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

        {/* STATISTICS */}

        <div className="grid gap-5 md:grid-cols-4">

          <StatCard
            title="Total Classes"
            value={classes.length}
            description="Available classes"
            icon="🏫"
          />

          <StatCard
            title="Students"
            value={students.length}
            description="All students"
            icon="👨‍🎓"
          />

          <StatCard
            title="Speaking Attempts"
            value={analyses.length}
            description="All speaking analyses"
            icon="🎤"
          />

          <StatCard
            title="Classes Showing"
            value={
              filteredReports.length
            }
            description="Matching search"
            icon="🔎"
          />

        </div>

        {/* SEARCH */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h3 className="text-xl font-bold text-gray-900">
                  Class Reports
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {
                    filteredReports.length
                  }{" "}
                  {filteredReports.length ===
                  1
                    ? "class"
                    : "classes"}{" "}
                  found
                </p>

              </div>

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
                  placeholder="Search classes..."
                  className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
                />

              </div>

            </div>

          </div>

          {/* EMPTY */}

          {filteredReports.length ===
          0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                🏫
              </div>

              <h4 className="mt-5 text-xl font-bold text-gray-900">
                No classes found
              </h4>

              <p className="mt-2 text-gray-500">
                No class information is available.
              </p>

            </div>

          ) : (

            /* TABLE */

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1100px]">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      Class
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Students
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

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {filteredReports.map(
                    (report) => {

                      const className =
                        report.classData
                          .name ||
                        `Grade ${
                          report.classData
                            .grade ||
                          "-"
                        } - ${
                          report.classData
                            .section ||
                          "-"
                        }`;

                      return (

                        <tr
                          key={
                            report
                              .classData
                              .id
                          }
                          className="hover:bg-slate-50"
                        >

                          {/* CLASS */}

                          <td className="px-5 py-5">

                            <div className="flex items-center gap-3">

                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                                🏫
                              </div>

                              <div>

                                <button
  onClick={() =>
    (window.location.href =
      `/admin/reports/classes/${report.classData.id}`)
  }
  className="font-bold text-blue-700 hover:underline"
>
  {className}
</button>

                                <p className="text-xs text-gray-500">
                                  Grade{" "}
                                  {
                                    report
                                      .classData
                                      .grade ||
                                    "-"
                                  }{" "}
                                  • Section{" "}
                                  {
                                    report
                                      .classData
                                      .section ||
                                    "-"
                                  }
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* STUDENTS */}

                          <td className="px-5 py-5 text-center">

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                              {
                                report
                                  .students
                                  .length
                              }
                            </span>

                          </td>

                          {/* ATTEMPTS */}

                          <td className="px-5 py-5 text-center">

                            <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-700">
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

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* REFRESH */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={
              loadClassReports
            }
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
  value: number;
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