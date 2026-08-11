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

export default function StudentDashboard() {
  const [student, setStudent] =
    useState<Student | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [lessonCount, setLessonCount] =
    useState(0);

  const [completedLessons, setCompletedLessons] =
    useState(1);

  useEffect(() => {
    loadStudent();
  }, []);

  async function loadStudent() {
    setLoading(true);
    setErrorMessage("");

    // ==============================
    // GET LOGGED-IN USER
    // ==============================

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

    // ==============================
    // GET STUDENT
    // ==============================

    const {
      data,
      error,
    } = await supabase
      .from("students")
      .select(
        "id, name, student_id, grade, section"
      )
      .eq(
        "auth_user_id",
        authData.user.id
      )
      .single();

    if (error || !data) {
      console.error(
        "Student error:",
        error
      );

      setErrorMessage(
        "Student information could not be found."
      );

      setLoading(false);
      return;
    }

    setStudent(data);

    // ==============================
    // GET LESSON COUNT
    // ==============================

    const {
      count,
    } = await supabase
      .from("lessons")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "grade",
        data.grade
      );

    setLessonCount(
      count || 0
    );

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();

    window.location.href =
      "/login";
  }

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

          <div className="text-5xl">
            ⏳
          </div>

          <p className="mt-4 text-gray-500">
            Loading student dashboard...
          </p>

        </div>
      </main>
    );
  }

  // ==============================
  // ERROR
  // ==============================

  if (!student) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

          <div className="text-5xl">
            ⚠️
          </div>

          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Student information not found
          </h2>

          <p className="mt-3 text-gray-500">
            {errorMessage}
          </p>

          <button
            onClick={logout}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white"
          >
            Back to Login
          </button>

        </div>

      </main>
    );
  }

  // ==============================
  // PROGRESS
  // ==============================

  const progress =
    lessonCount > 0
      ? Math.round(
          (completedLessons /
            lessonCount) *
            100
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ============================== */}
      {/* HEADER */}
      {/* ============================== */}

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

      {/* ============================== */}
      {/* DASHBOARD */}
      {/* ============================== */}

      <section className="mx-auto max-w-7xl px-8 py-8">

        {/* WELCOME */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, {student.name} 👋
          </h2>

          <p className="mt-2 text-gray-500">
            Continue learning and improve
            your communication skills.
          </p>

        </div>

        {/* ============================== */}
        {/* STUDENT INFORMATION */}
        {/* ============================== */}

        <div className="grid gap-6 md:grid-cols-4">

          <InfoCard
            title="Student ID"
            value={
              student.student_id
            }
          />

          <InfoCard
            title="Grade"
            value={`Grade ${student.grade}`}
          />

          <InfoCard
            title="Section"
            value={
              student.section
            }
          />

          <InfoCard
            title="Lessons"
            value={`${completedLessons} / ${lessonCount}`}
          />

        </div>

        {/* ============================== */}
        {/* LEARNING PROGRESS */}
        {/* ============================== */}

        <div className="mt-10 rounded-2xl border bg-white p-8 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <h3 className="text-2xl font-bold text-gray-900">
                📊 My Learning Progress
              </h3>

              <p className="mt-1 text-gray-500">
                Grade {student.grade} progress
              </p>

            </div>

            <button
              onClick={() => {
                window.location.href =
                  "/student/progress";
              }}
              className="w-fit rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              View Progress
            </button>

          </div>

          <div className="mt-6">

            <div className="flex items-center justify-between text-sm">

              <span className="text-gray-600">
                {completedLessons} of{" "}
                {lessonCount} lessons completed
              </span>

              <span className="font-bold text-blue-600">
                {progress}%
              </span>

            </div>

            <div className="mt-3 h-4 overflow-hidden rounded-full bg-gray-200">

              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

        </div>

        {/* ============================== */}
        {/* COMMUNICATION SKILLS */}
        {/* ============================== */}

        <div className="mt-10">

          <h3 className="text-2xl font-bold text-gray-900">
            Communication Skills
          </h3>

          <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {/* LESSONS */}

            <LearningCard
              title="Lessons"
              description="Learn through real-life conversations."
              onClick={() => {
                window.location.href =
                  "/student/lessons";
              }}
            />

            {/* VOCABULARY */}

            <LearningCard
              title="Vocabulary"
              description="Learn new words and improve your vocabulary."
              onClick={() => {
                alert(
                  "Vocabulary section will be connected next."
                );
              }}
            />

            {/* ACTIVITIES */}

            <LearningCard
              title="Activities"
              description="Practice through interactive activities."
              onClick={() => {
                window.location.href =
                  "/student/activities";
              }}
            />

            {/* SPEAKING */}

            <LearningCard
              title="Speaking Practice"
              description="Speak and improve your communication skills."
              onClick={() => {
                window.location.href =
                  "/student/speaking";
              }}
            />

          </div>

        </div>

        {/* ============================== */}
        {/* AI SPEECH ANALYSIS */}
        {/* ============================== */}

        <div className="mt-10 rounded-2xl bg-blue-600 p-8 text-white">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>

              <h3 className="text-2xl font-bold">
                🤖 AI Speech Analysis
              </h3>

              <p className="mt-3 max-w-2xl text-blue-100">
                Practice speaking and receive
                AI feedback on pronunciation,
                vocabulary, grammar and fluency.
              </p>

            </div>

            <button
              onClick={() => {
                window.location.href =
                  "/student/speaking";
              }}
              className="w-fit rounded-xl bg-white px-7 py-4 font-bold text-blue-700 shadow-sm hover:bg-blue-50"
            >
              🎙 Start Speaking Practice
            </button>

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
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

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
/* LEARNING CARD */
/* ========================================= */

function LearningCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >

      <h4 className="text-xl font-bold text-gray-900">
        {title}
      </h4>

      <p className="mt-3 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <span className="mt-5 inline-block text-sm font-semibold text-blue-600">
        Open →
      </span>

    </button>
  );
}