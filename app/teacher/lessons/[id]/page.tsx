"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [grades, setGrades] = useState<number[]>([]);
  const [selectedGrade, setSelectedGrade] =
    useState<string>("all");

  const [search, setSearch] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [teacherName, setTeacherName] =
    useState("");

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons(
    isRefresh = false
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      // =========================================
      // CHECK LOGIN
      // =========================================

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {
        window.location.href = "/login";
        return;
      }

      // =========================================
      // GET LESSONS FROM TEACHER API
      // =========================================

      const response = await fetch(
        "/api/teacher/lessons",
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${sessionData.session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      // -----------------------------------------
      // IMPORTANT:
      // Prevent "<!DOCTYPE..." JSON error
      // -----------------------------------------

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.text();

        console.error(
          "Teacher lessons API returned non-JSON:",
          text.substring(0, 500)
        );

        throw new Error(
          "Teacher lessons API did not return JSON. Check /api/teacher/lessons/route.ts."
        );
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to load lessons."
        );
      }

      // =========================================
      // SET DATA
      // =========================================

      setTeacherName(
        result?.teacher?.name ||
          ""
      );

      setLessons(
        result?.lessons || []
      );

      setGrades(
        result?.grades || []
      );
    } catch (error: any) {
      console.error(
        "Teacher lessons page error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load lessons."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // =========================================
  // FILTER LESSONS
  // =========================================

  const filteredLessons =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return lessons.filter(
        (lesson) => {
          // Grade filter
          if (
            selectedGrade !== "all" &&
            String(lesson.grade) !==
              selectedGrade
          ) {
            return false;
          }

          // Search filter
          if (!query) {
            return true;
          }

          const title =
            lesson.title
              ?.toLowerCase() || "";

          const description =
            lesson.description
              ?.toLowerCase() || "";

          const difficulty =
            lesson.difficulty
              ?.toLowerCase() || "";

          return (
            title.includes(query) ||
            description.includes(
              query
            ) ||
            difficulty.includes(query)
          );
        }
      );
    }, [
      lessons,
      selectedGrade,
      search,
    ]);

  // =========================================
  // OPEN LESSON
  // =========================================

  function openLesson(
    lessonId: string
  ) {
    window.location.href =
      `/teacher/lessons/${lessonId}`;
  }

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              Teacher Lessons
            </p>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">
              ⏳
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-900">
              Loading lessons...
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Please wait.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ========================================= */}
      {/* HEADER */}
      {/* ========================================= */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              Teacher • Lessons
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                (window.location.href =
                  "/teacher")
              }
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Dashboard
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();

                window.location.href =
                  "/login";
              }}
              className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* ========================================= */}
      {/* CONTENT */}
      {/* ========================================= */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* TITLE */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            📚 My Lessons
          </h2>

          <p className="mt-2 text-gray-500">
            {teacherName
              ? `Lessons available for ${teacherName}.`
              : "Lessons available for your assigned grades."}
          </p>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">

            <div className="font-bold">
              ⚠️ Unable to load lessons
            </div>

            <p className="mt-1">
              {errorMessage}
            </p>

            <button
              onClick={() =>
                loadLessons()
              }
              className="mt-4 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>

          </div>
        )}

        {/* ========================================= */}
        {/* FILTERS */}
        {/* ========================================= */}

        {!errorMessage && (
          <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm">

            <div className="grid gap-4 md:grid-cols-3">

              {/* SEARCH */}

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Search Lessons
                </label>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search lesson title, description..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>

              {/* GRADE */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Grade
                </label>

                <select
                  value={selectedGrade}
                  onChange={(event) =>
                    setSelectedGrade(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
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
        )}

        {/* ========================================= */}
        {/* SUMMARY */}
        {/* ========================================= */}

        {!errorMessage && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-bold text-gray-900">
                  {filteredLessons.length}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-900">
                  {lessons.length}
                </span>{" "}
                lessons
              </p>
            </div>

            <button
              onClick={() =>
                loadLessons(true)
              }
              disabled={refreshing}
              className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

          </div>
        )}

        {/* ========================================= */}
        {/* NO LESSONS */}
        {/* ========================================= */}

        {!errorMessage &&
          lessons.length === 0 && (
            <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">

              <div className="text-6xl">
                📚
              </div>

              <h3 className="mt-5 text-xl font-bold text-gray-900">
                No lessons available
              </h3>

              <p className="mt-2 text-gray-500">
                There are currently no
                lessons available for
                your assigned grades.
              </p>

              <button
                onClick={() =>
                  loadLessons()
                }
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
              >
                Refresh Lessons
              </button>

            </div>
          )}

        {/* ========================================= */}
        {/* FILTERED NO RESULTS */}
        {/* ========================================= */}

        {!errorMessage &&
          lessons.length > 0 &&
          filteredLessons.length ===
            0 && (
            <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">

              <div className="text-5xl">
                🔎
              </div>

              <h3 className="mt-4 text-xl font-bold text-gray-900">
                No matching lessons
              </h3>

              <p className="mt-2 text-gray-500">
                Try changing the search
                or grade filter.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setSelectedGrade(
                    "all"
                  );
                }}
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Clear Filters
              </button>

            </div>
          )}

        {/* ========================================= */}
        {/* LESSON CARDS */}
        {/* ========================================= */}

        {!errorMessage &&
          filteredLessons.length >
            0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {filteredLessons.map(
                (lesson) => (
                  <div
                    key={lesson.id}
                    className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >

                    {/* TOP */}

                    <div className="bg-blue-600 p-6 text-white">

                      <div className="flex items-center justify-between gap-2">

                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                          Lesson{" "}
                          {lesson.lesson_number ??
                            ""}
                        </span>

                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                          Grade{" "}
                          {lesson.grade ??
                            ""}
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
                          {lesson.grade}
                        </span>

                        {lesson.difficulty && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                            {lesson.difficulty}
                          </span>
                        )}

                      </div>

                      <button
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
                )
              )}

            </div>
          )}

      </section>
    </main>
  );
}