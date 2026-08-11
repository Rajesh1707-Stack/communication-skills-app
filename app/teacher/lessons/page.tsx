"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Lesson = {
  id: string;
  grade: number | null;
  lesson_number: number | null;
  title: string | null;
  description: string | null;
  difficulty: string | null;
};

export default function TeacherLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    try {
      setLoading(true);
      setErrorMessage("");

      // Check teacher login
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      // Get all lessons
      const {
        data,
        error,
      } = await supabase
        .from("lessons")
        .select(
          `
          id,
          grade,
          lesson_number,
          title,
          description,
          difficulty
          `
        )
        .order("grade", {
          ascending: true,
        })
        .order("lesson_number", {
          ascending: true,
        });

      if (error) {
        console.error("Lessons error:", error);

        setErrorMessage(
          error.message ||
            "Unable to load lessons."
        );

        return;
      }

      setLessons(data || []);
    } catch (error: any) {
      console.error(
        "Teacher lessons error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Something went wrong while loading lessons."
      );
    } finally {
      setLoading(false);
    }
  }

  function openLesson(
    lessonId: string
  ) {
    window.location.href =
      `/teacher/lessons/${lessonId}`;
  }

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
              Teacher • All Lessons
            </p>
          </div>

          <div className="flex gap-3">

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/teacher";
              }}
              className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Dashboard
            </button>

            <button
              type="button"
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

      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            📚 All Lessons
          </h2>

          <p className="mt-2 text-gray-500">
            Lessons available for your students.
          </p>

        </div>

        {/* LOADING */}

        {loading && (

          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">

            <div className="text-5xl">
              ⏳
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-900">
              Loading lessons...
            </h3>

            <p className="mt-2 text-gray-500">
              Please wait.
            </p>

          </div>

        )}

        {/* ERROR */}

        {!loading && errorMessage && (

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">

            <div className="text-5xl">
              ⚠️
            </div>

            <h3 className="mt-4 text-xl font-bold text-red-700">
              Unable to load lessons
            </h3>

            <p className="mt-2 text-red-600">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={loadLessons}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
            >
              Try Again
            </button>

          </div>

        )}

        {/* NO LESSONS */}

        {!loading &&
          !errorMessage &&
          lessons.length === 0 && (

            <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">

              <div className="text-5xl">
                📚
              </div>

              <h3 className="mt-4 text-xl font-bold text-gray-900">
                No lessons available
              </h3>

              <p className="mt-2 text-gray-500">
                No lessons were found.
              </p>

            </div>

          )}

        {/* LESSONS */}

        {!loading &&
          !errorMessage &&
          lessons.length > 0 && (

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {lessons.map((lesson) => (

                <div
                  key={lesson.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >

                  {/* BLUE HEADER */}

                  <div className="bg-blue-600 p-6 text-white">

                    <div className="flex items-center justify-between gap-2">

                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                        Lesson{" "}
                        {lesson.lesson_number ?? ""}
                      </span>

                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                        Grade{" "}
                        {lesson.grade ?? ""}
                      </span>

                    </div>

                    <h3 className="mt-5 min-h-[56px] text-2xl font-bold">
                      {lesson.title ||
                        "Untitled Lesson"}
                    </h3>

                  </div>

                  {/* BODY */}

                  <div className="p-6">

                    <p className="min-h-[72px] leading-7 text-gray-600">
                      {lesson.description ||
                        "Communication skills lesson."}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        🎯 Grade{" "}
                        {lesson.grade ?? ""}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        📖 Lesson{" "}
                        {lesson.lesson_number ?? ""}
                      </span>

                      {lesson.difficulty && (

                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700">
                          {lesson.difficulty}
                        </span>

                      )}

                    </div>

                    {/* OPEN LESSON */}

                    <button
                      type="button"
                      onClick={() =>
                        openLesson(
                          lesson.id
                        )
                      }
                      className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
                    >
                      Open Lesson →
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

      </section>

    </main>
  );
}