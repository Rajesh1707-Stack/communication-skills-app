"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Lesson = {
  id: string;
  grade: number;
  lesson_number: number;
  title: string;
  description: string;
  difficulty: string;
};

export default function StudentLessonsPage() {
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

      // Get logged-in user
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      // Get student's grade
      const {
        data: student,
        error: studentError,
      } = await supabase
        .from("students")
        .select("grade")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (studentError || !student) {
        console.error("Student error:", studentError);

        setErrorMessage(
          "Student information could not be found."
        );

        setLoading(false);
        return;
      }

      // Get lessons for student's grade
      const {
        data,
        error,
      } = await supabase
        .from("lessons")
        .select(`
          id,
          grade,
          lesson_number,
          title,
          description,
          difficulty
        `)
        .eq("grade", student.grade)
        .order("lesson_number", {
          ascending: true,
        });

      if (error) {
        console.error("Lessons error:", error);

        setErrorMessage(
          "Unable to load lessons."
        );

        setLoading(false);
        return;
      }

      setLessons(data || []);
      setLoading(false);
    } catch (error) {
      console.error(
        "Unexpected error:",
        error
      );

      setErrorMessage(
        "Something went wrong while loading lessons."
      );

      setLoading(false);
    }
  }

  function openLesson(lessonId: string) {
    window.location.href =
      `/student/lessons/${lessonId}`;
  }

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
              Student Lessons
            </p>

          </div>

          <button
            onClick={() => {
              window.location.href =
                "/student";
            }}
            className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
          >
            ← Dashboard
          </button>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-6 py-10">

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            My Lessons
          </h2>

          <p className="mt-2 text-gray-500">
            Choose a lesson and start learning.
          </p>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              ⏳
            </div>

            <p className="mt-4 text-gray-500">
              Loading lessons...
            </p>

          </div>
        )}

        {/* ERROR */}

        {!loading && errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">

            <div className="text-5xl">
              ⚠️
            </div>

            <h3 className="mt-4 text-xl font-bold text-red-600">
              Unable to load lessons
            </h3>

            <p className="mt-2 text-red-500">
              {errorMessage}
            </p>

            <button
              onClick={loadLessons}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Try Again
            </button>

          </div>
        )}

        {/* NO LESSONS */}

        {!loading &&
          !errorMessage &&
          lessons.length === 0 && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                📚
              </div>

              <h3 className="mt-4 text-xl font-bold text-gray-900">
                No lessons available
              </h3>

              <p className="mt-2 text-gray-500">
                Your lessons will appear here
                when they are assigned.
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

                  {/* TOP */}

                  <div className="bg-blue-600 p-6 text-white">

                    <div className="flex items-center justify-between">

                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                        Lesson{" "}
                        {lesson.lesson_number}
                      </span>

                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold capitalize">
                        {lesson.difficulty}
                      </span>

                    </div>

                    <h3 className="mt-5 text-2xl font-bold">
                      {lesson.title}
                    </h3>

                  </div>

                  {/* BODY */}

                  <div className="p-6">

                    <p className="leading-7 text-gray-600">
                      {lesson.description}
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">

                      <span>
                        🎯 Grade {lesson.grade}
                      </span>

                      <span>
                        •
                      </span>

                      <span>
                        📖 Lesson{" "}
                        {lesson.lesson_number}
                      </span>

                    </div>

                    <button
                      onClick={() =>
                        openLesson(lesson.id)
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