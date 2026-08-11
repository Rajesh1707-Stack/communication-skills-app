"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Activity = {
  id: string;
  title: string | null;
  description: string | null;
  activity_type: string | null;
  lesson_id: string | null;
};

type Question = {
  id: string;
  activity_id: string;
  question_number: number | null;
  question_text: string | null;
  question_type: string | null;
};

type Lesson = {
  id: string;
  lesson_number: number | null;
  title: string | null;
  grade: number | null;
};

export default function TeacherActivityPage() {
  const [activity, setActivity] =
    useState<Activity | null>(null);

  const [lesson, setLesson] =
    useState<Lesson | null>(null);

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadActivity();
  }, []);

  async function loadActivity() {
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
          "You are not authorized to view this activity."
        );

        setLoading(false);
        return;
      }

      // =====================================
      // GET ACTIVITY ID
      // =====================================

      const pathParts =
        window.location.pathname
          .split("/")
          .filter(Boolean);

      const activityId =
        pathParts[
          pathParts.length - 1
        ];

      if (!activityId) {
        setErrorMessage(
          "Activity ID was not found."
        );

        setLoading(false);
        return;
      }

      // =====================================
      // GET ACTIVITY
      // =====================================

      const {
        data: activityData,
        error: activityError,
      } =
        await supabase
          .from("activities")
          .select(
            `
            id,
            title,
            description,
            activity_type,
            lesson_id
            `
          )
          .eq(
            "id",
            activityId
          )
          .single();

      if (
        activityError ||
        !activityData
      ) {
        console.error(
          "Activity loading error:",
          activityError
        );

        setErrorMessage(
          activityError?.message ||
            "Activity could not be found."
        );

        setLoading(false);
        return;
      }

      setActivity(
        activityData
      );

      // =====================================
      // GET LESSON
      // =====================================

      if (
        activityData.lesson_id
      ) {
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
              grade
              `
            )
            .eq(
              "id",
              activityData.lesson_id
            )
            .single();

        if (
          lessonError
        ) {
          console.warn(
            "Lesson loading error:",
            lessonError
          );
        } else {
          setLesson(
            lessonData
          );
        }
      }

      // =====================================
      // GET QUESTIONS
      // =====================================

      const {
        data: questionData,
        error: questionError,
      } =
        await supabase
          .from(
            "activity_questions"
          )
          .select(
            `
            id,
            activity_id,
            question_number,
            question_text,
            question_type
            `
          )
          .eq(
            "activity_id",
            activityId
          )
          .order(
            "question_number",
            {
              ascending: true,
            }
          );

      if (
        questionError
      ) {
        console.error(
          "Question loading error:",
          questionError
        );

        setQuestions([]);
      } else {
        setQuestions(
          questionData || []
        );
      }

      setLoading(false);

    } catch (error: any) {
      console.error(
        "Teacher activity error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load activity."
      );

      setLoading(false);
    }
  }

  // =====================================
  // NAVIGATION
  // =====================================

  function goToLesson() {
    if (lesson?.id) {
      window.location.href =
        `/teacher/lessons/${lesson.id}`;
      return;
    }

    window.location.href =
      "/teacher/lessons";
  }

  function goToDashboard() {
    window.location.href =
      "/teacher";
  }

  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-5xl px-6 py-16">

          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">

            <div className="text-5xl">
              🎯
            </div>

            <p className="mt-4 font-semibold text-gray-600">
              Loading activity...
            </p>

          </div>

        </div>

      </main>
    );
  }

  // =====================================
  // ERROR
  // =====================================

  if (!activity) {
    return (
      <main className="min-h-screen bg-slate-50">

        <header className="border-b bg-white">

          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

            <div>

              <h1 className="text-2xl font-bold text-blue-700">
                Communication Skills
              </h1>

              <p className="text-sm text-gray-500">
                Teacher Activity
              </p>

            </div>

            <button
              onClick={() =>
                (window.location.href =
                  "/teacher/lessons")
              }
              className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Lessons
            </button>

          </div>

        </header>

        <section className="mx-auto max-w-4xl px-6 py-12">

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">

            <h2 className="text-xl font-bold text-red-700">
              ⚠️ Unable to load activity
            </h2>

            <p className="mt-3 text-red-600">
              {errorMessage}
            </p>

            <div className="mt-6 flex gap-3">

              <button
                onClick={
                  loadActivity
                }
                className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
              >
                Try Again
              </button>

              <button
                onClick={() =>
                  (window.location.href =
                    "/teacher/lessons")
                }
                className="rounded-lg bg-white px-5 py-2 font-semibold text-gray-700 hover:bg-gray-100"
              >
                ← Back to Lessons
              </button>

            </div>

          </div>

        </section>

      </main>
    );
  }

  // =====================================
  // PAGE
  // =====================================

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
              Teacher Activity
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={
                goToLesson
              }
              className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Lesson
            </button>

            <button
              onClick={
                goToDashboard
              }
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Dashboard
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();

                window.location.href =
                  "/login";
              }}
              className="rounded-lg bg-red-500 px-5 py-2 font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-5xl px-6 py-10">

        {/* BREADCRUMB */}

        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">

          <button
            onClick={
              goToLesson
            }
            className="font-semibold text-blue-600 hover:underline"
          >
            Lessons
          </button>

          <span className="text-gray-400">
            /
          </span>

          {lesson && (
            <>
              <button
                onClick={
                  goToLesson
                }
                className="font-semibold text-blue-600 hover:underline"
              >
                Lesson{" "}
                {lesson.lesson_number ??
                  ""}
              </button>

              <span className="text-gray-400">
                /
              </span>
            </>
          )}

          <span className="text-gray-500">
            Activity
          </span>

        </div>

        {/* ACTIVITY HEADER */}

        <div className="rounded-2xl border bg-white p-8 shadow-sm">

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">

            <div className="flex gap-5">

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
                🎯
              </div>

              <div>

                <p className="text-sm font-semibold text-purple-600">
                  Activity
                </p>

                <h2 className="mt-1 text-3xl font-bold text-gray-900">
                  {activity.title ||
                    "Untitled Activity"}
                </h2>

                {lesson && (
                  <p className="mt-2 text-sm text-gray-500">
                    Lesson{" "}
                    {lesson.lesson_number ??
                      ""}

                    {lesson.title
                      ? ` • ${lesson.title}`
                      : ""}
                  </p>
                )}

              </div>

            </div>

            {activity.activity_type && (
              <span className="self-start rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                {activity.activity_type}
              </span>
            )}

          </div>

          {/* DESCRIPTION */}

          <div className="mt-8 rounded-xl bg-slate-50 p-6">

            <h3 className="font-bold text-gray-900">
              Instructions
            </h3>

            <p className="mt-3 whitespace-pre-wrap leading-7 text-gray-600">
              {activity.description ||
                "No instructions have been added for this activity."}
            </p>

          </div>

        </div>

        {/* SUMMARY */}

        <div className="mt-6 grid gap-5 md:grid-cols-2">

          <SummaryCard
            title="Questions"
            value={
              questions.length
            }
            icon="❓"
          />

          <SummaryCard
            title="Activity Type"
            value={
              activity.activity_type ||
              "General"
            }
            icon="🎯"
          />

        </div>

        {/* QUESTIONS */}

        <section className="mt-8">

          <div className="mb-5">

            <h3 className="text-2xl font-bold text-gray-900">
              📝 Questions
            </h3>

            <p className="mt-1 text-gray-500">
              Questions included in this activity.
            </p>

          </div>

          {questions.length ===
          0 ? (

            <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">

              <div className="text-5xl">
                📝
              </div>

              <h4 className="mt-4 text-xl font-bold text-gray-900">
                No questions found
              </h4>

              <p className="mt-2 text-gray-500">
                No questions have been added to this activity yet.
              </p>

            </div>

          ) : (

            <div className="space-y-5">

              {questions.map(
                (
                  question,
                  index
                ) => (

                  <div
                    key={
                      question.id
                    }
                    className="rounded-2xl border bg-white p-6 shadow-sm"
                  >

                    <div className="flex gap-4">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {question.question_number ??
                          index + 1}
                      </div>

                      <div className="flex-1">

                        <div className="flex flex-wrap items-center gap-3">

                          <h4 className="font-bold text-gray-900">
                            Question{" "}
                            {question.question_number ??
                              index + 1}
                          </h4>

                          {question.question_type && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                              {
                                question.question_type
                              }
                            </span>
                          )}

                        </div>

                        <p className="mt-4 whitespace-pre-wrap leading-7 text-gray-700">
                          {question.question_text ||
                            "Question text not available."}
                        </p>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* BOTTOM */}

        <div className="mt-10 flex flex-wrap gap-3">

          <button
            onClick={
              goToLesson
            }
            className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            ← Back to Lesson
          </button>

          <button
            onClick={
              goToDashboard
            }
            className="rounded-lg border bg-white px-6 py-3 font-bold text-gray-700 hover:bg-gray-50"
          >
            Teacher Dashboard
          </button>

        </div>

      </section>

    </main>
  );
}

// ========================================
// SUMMARY CARD
// ========================================

function SummaryCard({
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

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </p>

        </div>

        <div className="text-4xl">
          {icon}
        </div>

      </div>

    </div>
  );
}