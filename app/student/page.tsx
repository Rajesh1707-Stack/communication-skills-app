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

type Lesson = {
  id: string;
};

type Progress = {
  lesson_id: string;
  completed: boolean;
};

export default function StudentDashboard() {
  const [student, setStudent] =
    useState<Student | null>(null);

  const [totalLessons, setTotalLessons] =
    useState(0);

  const [completedLessons, setCompletedLessons] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =========================================
      // GET LOGGED-IN USER
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
        window.location.href = "/login";
        return;
      }

      // =========================================
      // GET STUDENT INFORMATION
      // =========================================

      const {
        data: studentData,
        error: studentError,
      } =
        await supabase
          .from("students")
          .select(
            "id, name, student_id, grade, section"
          )
          .eq(
            "auth_user_id",
            authData.user.id
          )
          .single();

      if (
        studentError ||
        !studentData
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

      setStudent(studentData);

      // =========================================
      // GET TOTAL LESSONS
      // =========================================

      const {
        data: lessonData,
        error: lessonError,
      } =
        await supabase
          .from("lessons")
          .select("id")
          .eq(
            "grade",
            studentData.grade
          );

      if (lessonError) {
        console.error(
          "Lesson error:",
          lessonError
        );

        setErrorMessage(
          "Unable to load lessons."
        );

        setLoading(false);
        return;
      }

      const lessons: Lesson[] =
        lessonData || [];

      setTotalLessons(
        lessons.length
      );

      // =========================================
      // GET COMPLETED LESSONS
      // =========================================

      const {
        data: progressData,
        error: progressError,
      } =
        await supabase
          .from("student_progress")
          .select(
            "lesson_id, completed"
          )
          .eq(
            "student_id",
            studentData.id
          )
          .eq(
            "completed",
            true
          );

      if (progressError) {
        console.error(
          "Progress error:",
          progressError
        );

        setErrorMessage(
          "Unable to load progress."
        );

        setLoading(false);
        return;
      }

      const progress: Progress[] =
        progressData || [];

      // Only count lessons belonging
      // to student's grade

      const lessonIds = new Set(
        lessons.map(
          (lesson) => lesson.id
        )
      );

      const completedCount =
        progress.filter(
          (item) =>
            lessonIds.has(
              item.lesson_id
            )
        ).length;

      setCompletedLessons(
        completedCount
      );

      setLoading(false);

    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      setErrorMessage(
        "Something went wrong while loading your dashboard."
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
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-5xl">
            ⏳
          </div>

          <p className="mt-4 text-gray-600">
            Loading student dashboard...
          </p>
        </div>
      </main>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (!student) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">

        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">

          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-5 text-xl font-bold text-red-600">
            Student information not found
          </h1>

          <p className="mt-3 text-gray-500">
            {errorMessage}
          </p>

          <button
            onClick={logout}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Login
          </button>

        </div>

      </main>
    );
  }

  // =========================================
  // PROGRESS
  // =========================================

  const progressPercentage =
    totalLessons > 0
      ? Math.round(
          (completedLessons /
            totalLessons) *
            100
        )
      : 0;

  // =========================================
  // MAIN DASHBOARD
  // =========================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">

          <div>

            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              Student Dashboard
            </p>

          </div>

          <div className="flex items-center gap-4">

            <span className="font-medium text-gray-700">
              {student.name}
            </span>

            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      {/* ================================= */}
      {/* DASHBOARD CONTENT */}
      {/* ================================= */}

      <section className="mx-auto max-w-7xl px-8 py-8">

        {/* ================================= */}
        {/* WELCOME */}
        {/* ================================= */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, {student.name} 👋
          </h2>

          <p className="mt-2 text-gray-500">
            Continue learning and improve your communication skills.
          </p>

        </div>

        {/* ================================= */}
        {/* INFORMATION CARDS */}
        {/* ================================= */}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">

          <InfoCard
            title="Student ID"
            value={student.student_id}
          />

          <InfoCard
            title="Grade"
            value={`Grade ${student.grade}`}
          />

          <InfoCard
            title="Section"
            value={student.section}
          />

          <InfoCard
            title="Lessons"
            value={`${completedLessons} / ${totalLessons}`}
          />

          <InfoCard
            title="Progress"
            value={`${progressPercentage}%`}
          />

        </div>

        {/* ================================= */}
        {/* LEARNING PROGRESS */}
        {/* ================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-7 shadow-sm">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <h3 className="text-xl font-bold text-gray-900">
                📊 My Learning Progress
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Grade {student.grade} progress
              </p>

            </div>

            <button
              onClick={() => {
                window.location.href =
                  "/student/progress";
              }}
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
            >
              View Progress
            </button>

          </div>

          <div className="mt-6">

            <div className="flex justify-between text-sm">

              <span className="font-medium text-gray-600">
                {completedLessons} of{" "}
                {totalLessons} lessons completed
              </span>

              <span className="font-bold text-blue-600">
                {progressPercentage}%
              </span>

            </div>

            <div className="mt-3 h-4 overflow-hidden rounded-full bg-gray-200">

              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />

            </div>

          </div>

        </section>

        {/* ================================= */}
        {/* MAIN LEARNING MODULES */}
        {/* ================================= */}

        <div className="mt-10">

          <h3 className="text-2xl font-bold text-gray-900">
            Communication Skills
          </h3>

          <p className="mt-1 text-gray-500">
            Choose what you want to do.
          </p>

          <div className="mt-5 grid gap-6 md:grid-cols-2">

            {/* ================================= */}
            {/* LESSONS */}
            {/* ================================= */}

            <DashboardCard
              icon="📚"
              title="Lessons"
              description="Learn communication skills through lessons, vocabulary, classroom activities and speaking practice."
              buttonText="Open Lessons →"
              onClick={() => {
                window.location.href =
                  "/student/lessons";
              }}
            />

            {/* ================================= */}
            {/* ATTENDANCE */}
            {/* ================================= */}

            <DashboardCard
              icon="📅"
              title="Attendance"
              description="View your class attendance and attendance history."
              buttonText="View Attendance →"
              onClick={() => {
                window.location.href =
                  "/student/attendance";
              }}
            />

          </div>

        </div>

        {/* ================================= */}
        {/* AI SPEAKING PERFORMANCE */}
        {/* ================================= */}

        <section className="mt-8 rounded-2xl bg-blue-600 p-8 text-white shadow-sm">

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div>

              <div className="text-4xl">
                🤖
              </div>

              <h3 className="mt-4 text-2xl font-bold">
                AI Speaking Performance
              </h3>

              <p className="mt-3 max-w-2xl leading-7 text-blue-100">
                Check your speaking performance,
                pronunciation, vocabulary, grammar
                and fluency results from your
                completed speaking practices.
              </p>

            </div>

            <button
              onClick={() => {
                window.location.href =
                  "/student/progress";
              }}
              className="shrink-0 rounded-xl bg-white px-7 py-4 font-bold text-blue-700 hover:bg-blue-50"
            >
              View Performance →
            </button>

          </div>

        </section>

        {/* ================================= */}
        {/* IMPORTANT NOTE */}
        {/* ================================= */}

        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">

          <div className="flex gap-4">

            <div className="text-3xl">
              💡
            </div>

            <div>

              <h4 className="font-bold text-gray-900">
                Your learning path
              </h4>

              <p className="mt-2 leading-7 text-gray-600">
                Open a lesson to learn the topic,
                practice new vocabulary, complete
                classroom activities and then try
                the speaking practice.
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}

/* ========================================= */
/* INFO CARD */
/* ========================================= */

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">

      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>

    </div>
  );
}

/* ========================================= */
/* DASHBOARD CARD */
/* ========================================= */

function DashboardCard({
  icon,
  title,
  description,
  buttonText,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >

      <div className="flex items-start justify-between">

        <div>

          <div className="text-5xl">
            {icon}
          </div>

          <h4 className="mt-5 text-2xl font-bold text-gray-900">
            {title}
          </h4>

          <p className="mt-3 leading-7 text-gray-500">
            {description}
          </p>

          <p className="mt-6 font-bold text-blue-600 group-hover:text-blue-700">
            {buttonText}
          </p>

        </div>

        <div className="rounded-xl bg-blue-50 px-4 py-3 text-2xl">
          {icon}
        </div>

      </div>

    </button>
  );
}