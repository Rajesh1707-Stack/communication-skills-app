"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Student = {
  id: string;
  auth_user_id: string | null;
  student_id: string;
  name: string;
  grade: number | null;
  section: string | null;
  class_id: string | null;
  school_id: string | null;
  created_at: string;
};

type Analysis = {
  student_id: string;
  overall_score: number;
};

export default function AdminStudentsPage() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [analyses, setAnalyses] =
    useState<Analysis[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  // =========================================
  // LOAD STUDENTS
  // =========================================

  async function loadStudents() {
    try {
      setLoading(true);
      setErrorMessage("");

      // CHECK LOGIN

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

      // CHECK ADMIN

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "full_name, role"
          )
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

      // GET STUDENTS

      const {
        data: studentData,
        error: studentError,
      } =
        await supabase
          .from("students")
          .select(`
            id,
            auth_user_id,
            student_id,
            name,
            grade,
            section,
            class_id,
            school_id,
            created_at
          `)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

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

      // GET SPEECH ANALYSIS

      const {
        data: analysisData,
        error: analysisError,
      } =
        await supabase
          .from("speech_analysis")
          .select(`
            student_id,
            overall_score
          `);

      if (analysisError) {
        console.error(
          "Analysis error:",
          analysisError
        );
      }

      setStudents(
        studentData || []
      );

      setAnalyses(
        analysisData || []
      );

      setLoading(false);

    } catch (error) {
      console.error(
        "Admin students error:",
        error
      );

      setErrorMessage(
        "Unable to load students."
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
  // GET ATTEMPTS
  // =========================================

  function getAttempts(
    studentId: string
  ) {
    return analyses.filter(
      (item) =>
        item.student_id ===
        studentId
    ).length;
  }

  // =========================================
  // GET SCORE
  // =========================================

  function getStudentScore(
    studentId: string
  ) {
    const studentAnalyses =
      analyses.filter(
        (item) =>
          item.student_id ===
          studentId
      );

    if (
      studentAnalyses.length ===
      0
    ) {
      return 0;
    }

    const total =
      studentAnalyses.reduce(
        (sum, item) =>
          sum +
          Number(
            item.overall_score ||
              0
          ),
        0
      );

    return Math.round(
      total /
        studentAnalyses.length
    );
  }

  // =========================================
  // SEARCH
  // =========================================

  const filteredStudents =
    students.filter(
      (student) => {
        const text =
          search
            .toLowerCase()
            .trim();

        if (!text) {
          return true;
        }

        return (
          student.name
            ?.toLowerCase()
            .includes(text) ||

          student.student_id
            ?.toLowerCase()
            .includes(text) ||

          String(
            student.grade || ""
          )
            .toLowerCase()
            .includes(text) ||

          student.section
            ?.toLowerCase()
            .includes(text)
        );
      }
    );

  // =========================================
  // VIEW STUDENT
  // =========================================

  function viewStudent(
    student: Student
  ) {
    window.location.href =
      `/admin/students/${student.id}`;
  }

  // =========================================
  // VIEW PROGRESS
  // =========================================

  function viewProgress(
    student: Student
  ) {
    window.location.href =
      `/admin/students/${student.id}/progress`;
  }

  // =========================================
  // BACK TO ADMIN
  // =========================================

  function goAdmin() {
    window.location.href =
      "/admin";
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
            Loading students...
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
              Student Management
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={goAdmin}
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
            👨‍🎓 Students
          </h2>

          <p className="mt-2 text-gray-500">
            View and manage students on the
            communication skills platform.
          </p>

        </div>

        {/* ERROR */}

        {errorMessage && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-600">
            ⚠️ {errorMessage}
          </div>

        )}

        {/* STATISTICS */}

        <div className="grid gap-5 md:grid-cols-3">

          <StatCard
            title="Total Students"
            value={
              students.length
            }
            icon="👨‍🎓"
          />

          <StatCard
            title="Students Practicing"
            value={
              students.filter(
                (student) =>
                  getAttempts(
                    student.id
                  ) > 0
              ).length
            }
            icon="🎤"
          />

          <StatCard
            title="Average Score"
            value={
              students.length > 0
                ? `${Math.round(
                    students.reduce(
                      (
                        sum,
                        student
                      ) =>
                        sum +
                        getStudentScore(
                          student.id
                        ),
                      0
                    ) /
                      students.length
                  )}%`
                : "0%"
            }
            icon="📊"
          />

        </div>

        {/* STUDENT LIST */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          {/* TOP */}

          <div className="border-b p-6">

            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

              <div>

                <h3 className="text-xl font-bold text-gray-900">
                  Student List
                </h3>

                <p className="mt-1 text-sm text-gray-500">

                  {
                    filteredStudents.length
                  }{" "}

                  student
                  {
                    filteredStudents.length ===
                    1
                      ? ""
                      : "s"
                  }{" "}
                  found

                </p>

              </div>

              {/* SEARCH */}

              <div className="w-full md:w-80">

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="🔎 Search students..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

            </div>

          </div>

          {/* NO STUDENTS */}

          {filteredStudents.length ===
          0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                👨‍🎓
              </div>

              <h3 className="mt-4 text-xl font-bold text-gray-900">
                No students found
              </h3>

              <p className="mt-2 text-gray-500">
                Try a different search.
              </p>

            </div>

          ) : (

            /* TABLE */

            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px]">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600">
                      Student
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600">
                      Student ID
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600">
                      Grade
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600">
                      Section
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600">
                      Attempts
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600">
                      Score
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-600">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredStudents.map(
                    (student) => {

                      const score =
                        getStudentScore(
                          student.id
                        );

                      const attempts =
                        getAttempts(
                          student.id
                        );

                      return (

                        <tr
                          key={
                            student.id
                          }
                          className="border-t hover:bg-slate-50"
                        >

                          {/* STUDENT */}

                          <td className="px-6 py-5">

                            <div className="flex items-center gap-3">

                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl">
                                👨‍🎓
                              </div>

                              <div>

                                <p className="font-bold text-gray-900">
                                  {
                                    student.name
                                  }
                                </p>

                                <p className="text-xs text-gray-500">
                                  Student
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* STUDENT ID */}

                          <td className="px-6 py-5 text-sm font-medium text-gray-600">
                            {
                              student.student_id
                            }
                          </td>

                          {/* GRADE */}

                          <td className="px-6 py-5">

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              {student.grade
                                ? `Grade ${student.grade}`
                                : "-"}
                            </span>

                          </td>

                          {/* SECTION */}

                          <td className="px-6 py-5 text-sm text-gray-600">
                            {
                              student.section ||
                              "-"
                            }
                          </td>

                          {/* ATTEMPTS */}

                          <td className="px-6 py-5">

                            <span className="font-bold text-gray-900">
                              {
                                attempts
                              }
                            </span>

                          </td>

                          {/* SCORE */}

                          <td className="px-6 py-5">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                score >= 80
                                  ? "bg-green-100 text-green-700"
                                  : score >= 60
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {
                                score
                              }%
                            </span>

                          </td>

                          {/* ACTION */}

                          <td className="px-6 py-5">

                            <div className="flex flex-wrap gap-2">

                              {/* VIEW */}

                              <button
                                onClick={() =>
                                  viewStudent(
                                    student
                                  )
                                }
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                              >
                                View
                              </button>

                              {/* PROGRESS */}

                              <button
                                onClick={() =>
                                  viewProgress(
                                    student
                                  )
                                }
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                              >
                                📈 Progress
                              </button>

                            </div>

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

        <div className="mt-5 text-right">

          <button
            onClick={
              loadStudents
            }
            className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            ↻ Refresh
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
  icon,
}: {
  title: string;
  value: number | string;
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