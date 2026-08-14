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

const ALL_GRADES = Array.from(
  { length: 10 },
  (_, index) => index + 1
);

export default function TeacherLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedGrade, setSelectedGrade] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const [newLesson, setNewLesson] = useState({
    grade: 1,
    lesson_number: 1,
    title: "",
    description: "",
    difficulty: "Beginner",
  });

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {
        window.location.href = "/login";
        return;
      }

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

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to load lessons."
        );
      }

      setLessons(
        Array.isArray(result?.lessons)
          ? result.lessons
          : []
      );
    } catch (error: any) {
      console.error(
        "Teacher lessons error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load lessons."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createLesson() {
    try {
      if (
        !newLesson.title.trim()
      ) {
        alert(
          "Please enter a lesson title."
        );
        return;
      }

      setCreating(true);
      setErrorMessage("");

      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href =
          "/login";
        return;
      }

      const response = await fetch(
        "/api/teacher/lessons",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(
            newLesson
          ),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to create lesson."
        );
      }

      if (result?.lesson?.id) {
        window.location.href =
          `/teacher/lessons/${result.lesson.id}`;
        return;
      }

      await loadLessons();
    } catch (error: any) {
      console.error(
        "Create lesson error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to create lesson."
      );
    } finally {
      setCreating(false);
    }
  }

  function openLesson(
    lessonId: string
  ) {
    window.location.href =
      `/teacher/lessons/${lessonId}`;
  }

  const gradeCounts = useMemo(() => {
    const counts: Record<
      number,
      number
    > = {};

    for (const grade of ALL_GRADES) {
      counts[grade] = lessons.filter(
        (lesson) =>
          Number(lesson.grade) ===
          grade
      ).length;
    }

    return counts;
  }, [lessons]);

  const filteredLessons =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return lessons.filter(
        (lesson) => {
          if (
            selectedGrade !== null &&
            Number(lesson.grade) !==
              selectedGrade
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            lesson.title
              ?.toLowerCase()
              .includes(query) ||
            lesson.description
              ?.toLowerCase()
              .includes(query) ||
            lesson.difficulty
              ?.toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      lessons,
      selectedGrade,
      search,
    ]);

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
              Teacher • Lesson Management
            </p>
          </div>

          <div className="flex gap-3">

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/teacher";
              }}
              className="rounded-xl bg-gray-100 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-200"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();

                window.location.href =
                  "/login";
              }}
              className="rounded-xl bg-red-500 px-5 py-2.5 font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-8">

        {/* TITLE */}

        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Lessons
            </h2>

            <p className="mt-1 text-gray-500">
              Create and manage Communication English lessons for Grades 1–10.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              document
                .getElementById(
                  "create-lesson"
                )
                ?.scrollIntoView({
                  behavior: "smooth",
                });
            }}
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-blue-700"
          >
            + Create Lesson
          </button>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {/* GRADE SELECTOR */}

        <div className="mb-7 rounded-2xl border bg-white p-6 shadow-sm">

          <h3 className="text-xl font-bold text-gray-900">
            Select Grade
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Teachers can create and manage lessons for every grade.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">

            <button
              type="button"
              onClick={() =>
                setSelectedGrade(null)
              }
              className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                selectedGrade === null
                  ? "bg-blue-600 text-white shadow"
                  : "border bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              All Grades
              <span className="ml-2 opacity-75">
                {lessons.length}
              </span>
            </button>

            {ALL_GRADES.map(
              (grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() =>
                    setSelectedGrade(
                      grade
                    )
                  }
                  className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                    selectedGrade ===
                    grade
                      ? "bg-blue-600 text-white shadow"
                      : "border bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Grade {grade}

                  <span className="ml-2 text-xs opacity-70">
                    {gradeCounts[
                      grade
                    ]}{" "}
                    lessons
                  </span>
                </button>
              )
            )}

          </div>
        </div>

        {/* CREATE LESSON */}

        <div
          id="create-lesson"
          className="mb-7 rounded-2xl border bg-white p-6 shadow-sm"
        >

          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Create New Lesson
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Create a lesson first. You can add the complete curriculum in the lesson editor.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {/* GRADE */}

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Grade
              </label>

              <select
                value={
                  newLesson.grade
                }
                onChange={(event) =>
                  setNewLesson({
                    ...newLesson,
                    grade: Number(
                      event.target
                        .value
                    ),
                  })
                }
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              >
                {ALL_GRADES.map(
                  (grade) => (
                    <option
                      key={grade}
                      value={grade}
                    >
                      Grade {grade}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* LESSON NUMBER */}

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Lesson Number
              </label>

              <input
                type="number"
                min="1"
                value={
                  newLesson.lesson_number
                }
                onChange={(event) =>
                  setNewLesson({
                    ...newLesson,
                    lesson_number:
                      Number(
                        event.target
                          .value
                      ),
                  })
                }
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* TITLE */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Lesson Title
              </label>

              <input
                type="text"
                placeholder="Example: Introducing Myself"
                value={
                  newLesson.title
                }
                onChange={(event) =>
                  setNewLesson({
                    ...newLesson,
                    title:
                      event.target
                        .value,
                  })
                }
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* DESCRIPTION */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Description
              </label>

              <textarea
                rows={3}
                placeholder="What will students learn in this lesson?"
                value={
                  newLesson.description
                }
                onChange={(event) =>
                  setNewLesson({
                    ...newLesson,
                    description:
                      event.target
                        .value,
                  })
                }
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* DIFFICULTY */}

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Difficulty
              </label>

              <select
                value={
                  newLesson.difficulty
                }
                onChange={(event) =>
                  setNewLesson({
                    ...newLesson,
                    difficulty:
                      event.target
                        .value,
                  })
                }
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>
                  Beginner
                </option>

                <option>
                  Elementary
                </option>

                <option>
                  Intermediate
                </option>

                <option>
                  Advanced
                </option>
              </select>
            </div>

          </div>

          <div className="mt-6 flex justify-end">

            <button
              type="button"
              disabled={creating}
              onClick={
                createLesson
              }
              className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Creating..."
                : "Create Lesson"}
            </button>

          </div>

        </div>

        {/* LESSON LIST */}

        <div className="rounded-2xl border bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b p-6 md:flex-row md:items-center md:justify-between">

            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {selectedGrade ===
                null
                  ? "All Lessons"
                  : `Grade ${selectedGrade} Lessons`}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {filteredLessons.length} lesson
                {filteredLessons.length ===
                1
                  ? ""
                  : "s"}
              </p>
            </div>

            <input
              type="search"
              placeholder="Search lessons..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500 md:w-72"
            />

          </div>

          {/* LOADING */}

          {loading && (
            <div className="p-16 text-center">
              <div className="text-3xl">
                Loading...
              </div>

              <p className="mt-2 text-gray-500">
                Loading lessons.
              </p>
            </div>
          )}

          {/* EMPTY */}

          {!loading &&
            filteredLessons.length ===
              0 && (
              <div className="p-16 text-center">

                <div className="text-5xl">
                  📚
                </div>

                <h4 className="mt-4 text-xl font-bold text-gray-900">
                  No lessons found
                </h4>

                <p className="mt-2 text-gray-500">
                  Create your first lesson for this grade.
                </p>

              </div>
            )}

          {/* LESSON CARDS */}

          {!loading &&
            filteredLessons.length >
              0 && (
              <div className="grid gap-5 p-6 md:grid-cols-2 lg:grid-cols-3">

                {filteredLessons.map(
                  (lesson) => (
                    <article
                      key={lesson.id}
                      className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >

                      <div className="bg-blue-600 p-5 text-white">

                        <div className="flex items-center justify-between">

                          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                            Lesson{" "}
                            {
                              lesson.lesson_number
                            }
                          </span>

                          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                            Grade{" "}
                            {
                              lesson.grade
                            }
                          </span>

                        </div>

                        <h4 className="mt-5 text-xl font-bold">
                          {lesson.title ||
                            "Untitled Lesson"}
                        </h4>

                      </div>

                      <div className="p-5">

                        <p className="min-h-[60px] text-sm leading-6 text-gray-600">
                          {lesson.description ||
                            "Communication English lesson."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            Grade{" "}
                            {
                              lesson.grade
                            }
                          </span>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            Lesson{" "}
                            {
                              lesson.lesson_number
                            }
                          </span>

                          {lesson.difficulty && (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              {
                                lesson.difficulty
                              }
                            </span>
                          )}

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openLesson(
                              lesson.id
                            )
                          }
                          className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                        >
                          Edit Lesson →
                        </button>

                      </div>

                    </article>
                  )
                )}

              </div>
            )}

        </div>

      </section>

    </main>
  );
}