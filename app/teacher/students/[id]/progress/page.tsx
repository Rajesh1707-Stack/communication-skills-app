"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Student = {
  id: string;
  name: string;
  student_id: string;
  grade: number;
  section: string;
};

type SpeechAnalysis = {
  id: string;
  pronunciation_score: number | null;
  vocabulary_score: number | null;
  grammar_score: number | null;
  fluency_score: number | null;
  overall_score: number | null;
  transcript: string | null;
  feedback: string | null;
  created_at: string;
};

type Lesson = {
  id: string;
  lesson_number: number | null;
  title: string | null;
  description: string | null;
  grade: number | null;
};

type Progress = {
  id: string;
  lesson_id: string;
  completed: boolean;
};

type Attendance = {
  attendance_date: string;
  status: string;
};

export default function TeacherStudentProgressPage() {
  const [student, setStudent] =
    useState<Student | null>(null);

  const [analyses, setAnalyses] =
    useState<SpeechAnalysis[]>([]);

  const [lessons, setLessons] =
    useState<Lesson[]>([]);

  const [progress, setProgress] =
    useState<Progress[]>([]);

  const [attendance, setAttendance] =
    useState<Attendance[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      setLoading(true);
      setErrorMessage("");

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
      // CHECK TEACHER
      // =====================================

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
        !profile
      ) {
        setErrorMessage(
          "Teacher profile could not be found."
        );

        setLoading(false);
        return;
      }

      if (
        profile.role !==
        "teacher"
      ) {
        setErrorMessage(
          "You are not authorized to view student progress."
        );

        setLoading(false);
        return;
      }

      // =====================================
      // GET STUDENT ID FROM URL
      // =====================================

      const pathParts =
        window.location.pathname
          .split("/")
          .filter(Boolean);

      const studentId =
        pathParts[
          pathParts.length - 2
        ];

      if (!studentId) {
        setErrorMessage(
          "Student ID could not be found."
        );

        setLoading(false);
        return;
      }

      // =====================================
      // GET STUDENT
      // =====================================

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
            section
            `
          )
          .eq(
            "id",
            studentId
          )
          .single();

      if (
        studentError ||
        !studentData
      ) {
        setErrorMessage(
          studentError?.message ||
            "Student could not be found."
        );

        setLoading(false);
        return;
      }

      setStudent(
        studentData
      );

      // =====================================
      // GET SPEAKING ANALYSIS
      // =====================================

      const {
        data: speechData,
        error: speechError,
      } =
        await supabase
          .from("speech_analysis")
          .select(
            `
            id,
            pronunciation_score,
            vocabulary_score,
            grammar_score,
            fluency_score,
            overall_score,
            transcript,
            feedback,
            created_at
            `
          )
          .eq(
            "student_id",
            studentId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (speechError) {
        console.error(
          "Speech analysis error:",
          speechError
        );
      }

      setAnalyses(
        speechData || []
      );

      // =====================================
      // GET LESSONS
      // =====================================

      const {
        data: lessonData,
        error: lessonError,
      } =
        await supabase
          .from("lessons")
          .select(
            `
            id,
            lesson_number,
            title,
            description,
            grade
            `
          )
          .eq(
            "grade",
            studentData.grade
          )
          .order(
            "lesson_number",
            {
              ascending: true,
            }
          );

      if (lessonError) {
        console.error(
          "Lessons error:",
          lessonError
        );
      }

      setLessons(
        lessonData || []
      );

      // =====================================
      // GET STUDENT PROGRESS
      // =====================================

      const {
        data: progressData,
        error: progressError,
      } =
        await supabase
          .from("student_progress")
          .select(
            `
            id,
            lesson_id,
            completed
            `
          )
          .eq(
            "student_id",
            studentId
          )
          .eq(
            "completed",
            true
          );

      if (progressError) {
        console.error(
          "Student progress error:",
          progressError
        );
      }

      setProgress(
        progressData || []
      );

      // =====================================
      // GET ATTENDANCE
      // =====================================

      const {
        data: attendanceData,
        error: attendanceError,
      } =
        await supabase
          .from("attendance")
          .select(
            `
            attendance_date,
            status
            `
          )
          .eq(
            "student_id",
            studentId
          )
          .order(
            "attendance_date",
            {
              ascending: false,
            }
          );

      if (attendanceError) {
        console.error(
          "Attendance error:",
          attendanceError
        );
      }

      setAttendance(
        attendanceData || []
      );

      setLoading(false);

    } catch (error: any) {
      console.error(
        "Teacher progress error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load student progress."
      );

      setLoading(false);
    }
  }

  // =====================================
  // AVERAGE
  // =====================================

  function average(
    values: (
      | number
      | null
    )[]
  ) {
    const valid =
      values
        .filter(
          (
            value
          ): value is number =>
            value !== null &&
            Number.isFinite(
              Number(value)
            )
        )
        .map(
          (value) =>
            Number(value)
        );

    if (
      valid.length === 0
    ) {
      return 0;
    }

    return Math.round(
      valid.reduce(
        (sum, value) =>
          sum + value,
        0
      ) / valid.length
    );
  }

  const overall =
    average(
      analyses.map(
        (item) =>
          item.overall_score
      )
    );

  const pronunciation =
    average(
      analyses.map(
        (item) =>
          item.pronunciation_score
      )
    );

  const vocabulary =
    average(
      analyses.map(
        (item) =>
          item.vocabulary_score
      )
    );

  const grammar =
    average(
      analyses.map(
        (item) =>
          item.grammar_score
      )
    );

  const fluency =
    average(
      analyses.map(
        (item) =>
          item.fluency_score
      )
    );

  // =====================================
  // LESSON PROGRESS
  // =====================================

  const completedLessons =
    progress.filter(
      (item) =>
        item.completed
    ).length;

  const totalLessons =
    lessons.length;

  const lessonPercentage =
    totalLessons > 0
      ? Math.round(
          (completedLessons /
            totalLessons) *
            100
        )
      : 0;

  // =====================================
  // ATTENDANCE
  // =====================================

  const presentCount =
    attendance.filter(
      (item) =>
        item.status
          ?.toLowerCase() ===
        "present"
    ).length;

  const absentCount =
    attendance.filter(
      (item) =>
        item.status
          ?.toLowerCase() ===
        "absent"
    ).length;

  const totalAttendance =
    presentCount +
    absentCount;

  const attendancePercentage =
    totalAttendance > 0
      ? Math.round(
          (presentCount /
            totalAttendance) *
            100
        )
      : 0;

  // =====================================
  // NAVIGATION
  // =====================================

  function goDashboard() {
    window.location.href =
      "/teacher";
  }

  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="flex min-h-screen items-center justify-center">

          <div className="text-center">

            <div className="text-6xl">
              📊
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              Loading student progress...
            </h2>

            <p className="mt-2 text-gray-500">
              Please wait.
            </p>

          </div>

        </div>

      </main>
    );
  }

  // =====================================
  // ERROR
  // =====================================

  if (!student) {
    return (
      <main className="min-h-screen bg-slate-50">

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

  // =====================================
  // MAIN PAGE
  // =====================================

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

          <div className="flex gap-3">

            <button
              onClick={
                goDashboard
              }
              className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Dashboard
            </button>

            <button
              onClick={
                loadProgress
              }
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ↻ Refresh
            </button>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* STUDENT HEADER */}

        <div className="rounded-2xl border bg-white p-7 shadow-sm">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-sm font-semibold text-blue-600">
                Student Progress
              </p>

              <h2 className="mt-1 text-3xl font-bold text-gray-900">
                {student.name}
              </h2>

              <p className="mt-2 text-gray-500">
                ID: {student.student_id}
                {" • "}
                Grade {student.grade}
                {" • "}
                Section {student.section}
              </p>

            </div>

            <div className="text-6xl">
              🎓
            </div>

          </div>

        </div>

        {/* TOP CARDS */}

        <div className="mt-6 grid gap-5 md:grid-cols-3">

          <MetricCard
            title="Overall Speaking"
            value={`${overall}%`}
            subtitle={`${analyses.length} speaking attempts`}
            icon="🎤"
          />

          <MetricCard
            title="Lesson Progress"
            value={`${lessonPercentage}%`}
            subtitle={`${completedLessons} / ${totalLessons} lessons`}
            icon="📚"
          />

          <MetricCard
            title="Attendance"
            value={`${attendancePercentage}%`}
            subtitle={`${presentCount} present • ${absentCount} absent`}
            icon="📅"
          />

        </div>

        {/* SKILLS */}

        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">

          <h3 className="text-xl font-bold text-gray-900">
            Communication Skills
          </h3>

          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">

            <SkillCard
              title="Pronunciation"
              score={pronunciation}
              icon="🗣️"
            />

            <SkillCard
              title="Vocabulary"
              score={vocabulary}
              icon="📚"
            />

            <SkillCard
              title="Grammar"
              score={grammar}
              icon="✏️"
            />

            <SkillCard
              title="Fluency"
              score={fluency}
              icon="💬"
            />

          </div>

        </section>

        {/* LESSON PROGRESS */}

        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-xl font-bold text-gray-900">
                📚 Lesson Progress
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Grade {student.grade} lessons
              </p>

            </div>

            <span className="text-2xl font-bold text-blue-600">
              {lessonPercentage}%
            </span>

          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200">

            <div
              className="h-full rounded-full bg-blue-600"
              style={{
                width: `${lessonPercentage}%`,
              }}
            />

          </div>

          <div className="mt-6 space-y-3">

            {lessons.length ===
            0 ? (

              <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                No lessons found for this grade.
              </p>

            ) : (

              lessons.map(
                (lesson) => {

                  const completed =
                    progress.some(
                      (item) =>
                        item.lesson_id ===
                          lesson.id &&
                        item.completed
                    );

                  return (
                    <div
                      key={
                        lesson.id
                      }
                      className="flex items-center justify-between rounded-xl border p-4"
                    >

                      <div>

                        <p className="font-semibold text-gray-900">
                          Lesson{" "}
                          {
                            lesson.lesson_number
                          }{" "}
                          —{" "}
                          {
                            lesson.title
                          }
                        </p>

                        {lesson.description && (
                          <p className="mt-1 text-xs text-gray-500">
                            {
                              lesson.description
                            }
                          </p>
                        )}

                      </div>

                      {completed ? (

                        <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                          ✓ Completed
                        </span>

                      ) : (

                        <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-500">
                          Not Completed
                        </span>

                      )}

                    </div>
                  );
                }
              )

            )}

          </div>

        </section>

        {/* ATTENDANCE */}

        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-xl font-bold text-gray-900">
                📅 Attendance
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Attendance records for this student
              </p>

            </div>

            <span className="text-2xl font-bold text-green-600">
              {attendancePercentage}%
            </span>

          </div>

          {attendance.length ===
          0 ? (

            <p className="mt-5 rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
              No attendance records found.
            </p>

          ) : (

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {attendance
                .slice(0, 12)
                .map(
                  (item) => {

                    const present =
                      item.status
                        ?.toLowerCase() ===
                      "present";

                    return (
                      <div
                        key={
                          item.attendance_date
                        }
                        className="rounded-xl border p-4"
                      >

                        <p className="text-sm font-semibold text-gray-700">
                          {
                            item.attendance_date
                          }
                        </p>

                        <p
                          className={`mt-2 font-bold ${
                            present
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {present
                            ? "✓ Present"
                            : "✕ Absent"}
                        </p>

                      </div>
                    );
                  }
                )}

            </div>

          )}

        </section>

        {/* SPEAKING HISTORY */}

        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">

          <h3 className="text-xl font-bold text-gray-900">
            🎤 Speaking History
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Recent speaking attempts
          </p>

          {analyses.length ===
          0 ? (

            <p className="mt-5 rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
              No speaking attempts found.
            </p>

          ) : (

            <div className="mt-5 space-y-3">

              {analyses
                .slice(0, 10)
                .map(
                  (
                    analysis,
                    index
                  ) => (

                    <div
                      key={
                        analysis.id
                      }
                      className="rounded-xl border p-5"
                    >

                      <div className="flex items-center justify-between">

                        <div>

                          <p className="font-bold text-gray-900">
                            Attempt{" "}
                            {analyses.length -
                              index}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(
                              analysis.created_at
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>

                        </div>

                        <ScoreBadge
                          score={
                            Number(
                              analysis.overall_score ||
                                0
                            )
                          }
                        />

                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

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

                      {analysis.feedback && (
                        <div className="mt-4 rounded-lg bg-blue-50 p-4">

                          <p className="text-xs font-bold text-blue-700">
                            Feedback
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            {
                              analysis.feedback
                            }
                          </p>

                        </div>
                      )}

                    </div>

                  )
                )}

            </div>

          )}

        </section>

        {/* BACK */}

        <div className="mt-8">

          <button
            onClick={
              goDashboard
            }
            className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            ← Back to Teacher Dashboard
          </button>

        </div>

      </section>

    </main>
  );
}

// =====================================
// METRIC CARD
// =====================================

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-semibold text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            {subtitle}
          </p>

        </div>

        <span className="text-3xl">
          {icon}
        </span>

      </div>

    </div>
  );
}

// =====================================
// SKILL CARD
// =====================================

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
    <div className="rounded-xl border p-5">

      <div className="flex items-center justify-between">

        <span className="font-semibold text-gray-700">
          {icon} {title}
        </span>

        <span className="font-bold text-blue-600">
          {score}%
        </span>

      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">

        <div
          className="h-full rounded-full bg-blue-600"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                score
              )
            )}%`,
          }}
        />

      </div>

    </div>
  );
}

// =====================================
// SCORE BADGE
// =====================================

function ScoreBadge({
  score,
}: {
  score: number;
}) {
  const safeScore =
    Math.max(
      0,
      Math.min(
        100,
        Number(score) || 0
      )
    );

  const className =
    safeScore >= 80
      ? "bg-green-100 text-green-700"
      : safeScore >= 60
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-bold ${className}`}
    >
      {safeScore}%
    </span>
  );
}

// =====================================
// MINI SCORE
// =====================================

function MiniScore({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">

      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-bold text-gray-900">
        {score}%
      </p>

    </div>
  );
}