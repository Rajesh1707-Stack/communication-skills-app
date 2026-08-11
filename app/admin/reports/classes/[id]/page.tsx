"use client";

import { use, useEffect, useState } from "react";
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

type Attendance = {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string;
};

type StudentReport = {
  student: Student;
  attempts: number;
  pronunciation: number;
  vocabulary: number;
  grammar: number;
  fluency: number;
  overall: number;
  presentDays: number;
  absentDays: number;
  attendancePercentage: number;
};

export default function ClassDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [classData, setClassData] =
    useState<ClassRow | null>(null);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [analyses, setAnalyses] =
    useState<Analysis[]>([]);

  const [attendance, setAttendance] =
    useState<Attendance[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    loadClass();
  }, [id]);

  // =========================================
  // LOAD CLASS
  // =========================================

  async function loadClass() {
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
      // GET CLASS
      // =========================================

      const {
        data: classResult,
        error: classError,
      } = await supabase
        .from("classes")
        .select(
          "id, name, grade, section"
        )
        .eq("id", id)
        .single();

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
        .eq("class_id", id)
        .order("name", {
          ascending: true,
        });

      if (studentError) {
        throw studentError;
      }

      // =========================================
      // GET ANALYSIS
      // =========================================

      const studentIds =
        (studentData || []).map(
          (student) =>
            student.id
        );

      let analysisData: Analysis[] =
        [];

      if (
        studentIds.length > 0
      ) {
        const {
          data,
          error,
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
          )
          .in(
            "student_id",
            studentIds
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          throw error;
        }

        analysisData =
          data || [];
      }

      setClassData(
        classResult
      );

      setStudents(
        studentData || []
      );

      setAnalyses(
        analysisData
      );

      // =========================================
      // GET ATTENDANCE
      // =========================================

      let attendanceData: Attendance[] = [];

      if (studentIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("attendance")
          .select(`
            id,
            student_id,
            attendance_date,
            status
          `)
          .in(
            "student_id",
            studentIds
          );

        if (error) {
          console.warn(
            "Attendance could not be loaded:",
            error
          );
        } else {
          attendanceData =
            data || [];
        }
      }

      setAttendance(
        attendanceData
      );

      setLoading(false);

    } catch (error: any) {
      console.error(
        "Class details error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load class details."
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
  // CLASS ANALYSIS
  // =========================================

  const classAttempts =
    analyses.length;

  const classPronunciation =
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

  const classVocabulary =
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

  const classGrammar =
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

  const classFluency =
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

  const classOverall =
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

  const classPresentDays =
    attendance.filter(
      (record) =>
        record.status ===
        "present"
    ).length;

  const classAbsentDays =
    attendance.filter(
      (record) =>
        record.status ===
        "absent"
    ).length;

  const classAttendanceTotal =
    classPresentDays +
    classAbsentDays;

  const classAttendancePercentage =
    classAttendanceTotal > 0
      ? Math.round(
          (classPresentDays /
            classAttendanceTotal) *
            100
        )
      : 0;

  // =========================================
  // STUDENT REPORTS
  // =========================================

  const studentReports: StudentReport[] =
    students.map(
      (student) => {

        const studentAnalyses =
          analyses.filter(
            (analysis) =>
              analysis.student_id ===
              student.id
          );

        const studentAttendance =
          attendance.filter(
            (record) =>
              record.student_id ===
              student.id
          );

        const presentDays =
          studentAttendance.filter(
            (record) =>
              record.status ===
              "present"
          ).length;

        const absentDays =
          studentAttendance.filter(
            (record) =>
              record.status ===
              "absent"
          ).length;

        const totalAttendanceDays =
          studentAttendance.length;

        const attendancePercentage =
          totalAttendanceDays > 0
            ? Math.round(
                (presentDays /
                  totalAttendanceDays) *
                  100
              )
            : 0;

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

          presentDays,
          absentDays,
          attendancePercentage,
        };
      }
    );

  // =========================================
  // SEARCH
  // =========================================

  const filteredStudents =
    studentReports.filter(
      (report) => {

        const text =
          `${report.student.name} ${
            report.student.student_id
          }`.toLowerCase();

        return text.includes(
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
            Loading class details...
          </h2>

          <p className="mt-2 text-gray-500">
            Please wait.
          </p>

        </div>

      </main>
    );
  }

  // =========================================
  // CLASS NOT FOUND
  // =========================================

  if (!classData) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-3xl px-6 py-20 text-center">

          <div className="text-6xl">
            🏫
          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Class not found
          </h2>

          <button
            onClick={() =>
              (window.location.href =
                "/admin/reports/classes")
            }
            className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            ← Back to Classes
          </button>

        </div>

      </main>
    );
  }

  const className =
    classData.name ||
    `Grade ${
      classData.grade ||
      "-"
    } - ${
      classData.section ||
      "-"
    }`;

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
              Class Performance
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                (window.location.href =
                  "/admin/reports/classes")
              }
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Classes
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

          <p className="text-sm font-medium text-blue-600">
            Class Report
          </p>

          <h2 className="mt-1 text-3xl font-bold text-gray-900">
            🏫 {className}
          </h2>

          <p className="mt-2 text-gray-500">
            Grade{" "}
            {classData.grade ||
              "-"}{" "}
            • Section{" "}
            {classData.section ||
              "-"}
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
            CLASS SUMMARY
        ===================================== */}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">

          <StatCard
            title="Students"
            value={
              students.length
            }
            description="Students in this class"
            icon="👨‍🎓"
          />

          <StatCard
            title="Speaking Attempts"
            value={
              classAttempts
            }
            description="Total speaking attempts"
            icon="🎤"
          />

          <StatCard
            title="Overall Score"
            value={`${classOverall}%`}
            description="Class average"
            icon="🏆"
          />

          <StatCard
            title="Attendance"
            value={`${classAttendancePercentage}%`}
            description={`${classPresentDays} present • ${classAbsentDays} absent`}
            icon="📅"
          />

          <StatCard
            title="Latest Activity"
            value={
              analyses.length > 0
                ? new Date(
                    analyses[0].created_at
                  ).toLocaleDateString()
                : "-"
            }
            description="Latest speaking analysis"
            icon="📅"
          />

        </div>

        {/* =====================================
            SKILLS
        ===================================== */}

        <section className="mt-8">

          <h3 className="mb-4 text-xl font-bold text-gray-900">
            Class Skill Performance
          </h3>

          <div className="grid gap-5 md:grid-cols-4">

            <SkillCard
              title="Pronunciation"
              score={
                classPronunciation
              }
              icon="🗣️"
            />

            <SkillCard
              title="Vocabulary"
              score={
                classVocabulary
              }
              icon="📚"
            />

            <SkillCard
              title="Grammar"
              score={
                classGrammar
              }
              icon="✏️"
            />

            <SkillCard
              title="Fluency"
              score={
                classFluency
              }
              icon="💬"
            />

          </div>

        </section>

        {/* =====================================
            STUDENTS
        ===================================== */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h3 className="text-xl font-bold text-gray-900">
                  Student Performance
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {
                    filteredStudents.length
                  }{" "}
                  students shown
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
                  placeholder="Search students..."
                  className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
                />

              </div>

            </div>

          </div>

          {/* EMPTY */}

          {filteredStudents.length ===
          0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                👨‍🎓
              </div>

              <h4 className="mt-5 text-xl font-bold text-gray-900">
                No students found
              </h4>

              <p className="mt-2 text-gray-500">
                There are no students in this
                class.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1400px]">

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
                      Attendance
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Present
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Absent
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-gray-500">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {filteredStudents.map(
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
                                Grade{" "}
                                {
                                  report
                                    .student
                                    .grade ||
                                  "-"
                                }{" "}
                                • Section{" "}
                                {
                                  report
                                    .student
                                    .section ||
                                  "-"
                                }
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

                        {/* ATTENDANCE */}

                        <td className="px-5 py-5 text-center">

                          {report.attendancePercentage > 0 ? (
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-bold ${
                                report.attendancePercentage >= 80
                                  ? "bg-green-100 text-green-700"
                                  : report.attendancePercentage >= 60
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {report.attendancePercentage}%
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-500">
                              No data
                            </span>
                          )}

                        </td>

                        {/* PRESENT */}

                        <td className="px-5 py-5 text-center">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                            {report.presentDays}
                          </span>
                        </td>

                        {/* ABSENT */}

                        <td className="px-5 py-5 text-center">
                          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                            {report.absentDays}
                          </span>
                        </td>

                        {/* VIEW */}

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
            onClick={loadClass}
            className="rounded-lg border bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
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