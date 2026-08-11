"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Lesson = {
  id: string;
  title: string | null;
  description: string | null;
  grade: number | null;
  created_at: string;
};

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadLessons();
  }, []);

  // =========================================
  // LOAD LESSONS
  // =========================================

  async function loadLessons() {
    try {
      setLoading(true);
      setErrorMessage("");

      // CHECK LOGIN
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      // CHECK ADMIN
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", authData.user.id)
        .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      // GET LESSONS
      const {
        data,
        error,
      } = await supabase
        .from("lessons")
        .select(
          "id, title, description, grade, created_at"
        )
        .order("grade", {
          ascending: true,
        });

      if (error) {
        console.error("Lessons error:", error);
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setLessons(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Lessons page error:", error);

      setErrorMessage(
        "Unable to load lessons."
      );

      setLoading(false);
    }
  }

  // =========================================
  // LOGOUT
  // =========================================

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // =========================================
  // FILTER LESSONS
  // =========================================

  const filteredLessons = lessons.filter(
    (lesson) => {
      const searchText =
        `${lesson.title || ""} ${
          lesson.description || ""
        } ${lesson.grade || ""}`.toLowerCase();

      const matchesSearch =
        searchText.includes(
          search.toLowerCase()
        );

      const matchesGrade =
        gradeFilter === "all" ||
        String(lesson.grade) ===
          gradeFilter;

      return (
        matchesSearch &&
        matchesGrade
      );
    }
  );

  // =========================================
  // GET GRADES
  // =========================================

  const grades = Array.from(
    new Set(
      lessons
        .map((lesson) => lesson.grade)
        .filter(
          (grade) =>
            grade !== null &&
            grade !== undefined
        )
    )
  ).sort(
    (a, b) => Number(a) - Number(b)
  );

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
            Loading lessons...
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
              Lesson Management
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                (window.location.href =
                  "/admin")
              }
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
            📚 Lessons
          </h2>

          <p className="mt-2 text-gray-500">
            View and manage communication
            skills lessons.
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

        {/* STATISTICS */}

        <div className="grid gap-5 md:grid-cols-3">

          <StatCard
            title="Total Lessons"
            value={lessons.length}
            description="All available lessons"
            icon="📚"
          />

          <StatCard
            title="Grades Covered"
            value={grades.length}
            description="Different grades"
            icon="🎓"
          />

          <StatCard
            title="Showing"
            value={filteredLessons.length}
            description="Lessons matching filters"
            icon="🔎"
          />

        </div>

        {/* LESSON LIST */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          {/* LIST HEADER */}

          <div className="border-b p-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h3 className="text-xl font-bold text-gray-900">
                  Lesson List
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredLessons.length}{" "}
                  {filteredLessons.length === 1
                    ? "lesson"
                    : "lessons"}{" "}
                  found
                </p>

              </div>

              <div className="flex flex-col gap-3 sm:flex-row">

                {/* SEARCH */}

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
                    placeholder="Search lessons..."
                    className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
                  />

                </div>

                {/* GRADE FILTER */}

                <select
                  value={gradeFilter}
                  onChange={(event) =>
                    setGradeFilter(
                      event.target.value
                    )
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >

                  <option value="all">
                    All Grades
                  </option>

                  {grades.map((grade) => (
                    <option
                      key={grade}
                      value={String(grade)}
                    >
                      Grade {grade}
                    </option>
                  ))}

                </select>

              </div>

            </div>

          </div>

          {/* NO LESSONS */}

          {filteredLessons.length === 0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                📚
              </div>

              <h4 className="mt-5 text-xl font-bold text-gray-900">
                No lessons found
              </h4>

              <p className="mt-2 text-gray-500">
                Try changing your search or
                grade filter.
              </p>

            </div>

          ) : (

            /* LESSON CARDS */

            <div className="grid gap-5 p-6 md:grid-cols-2 lg:grid-cols-3">

              {filteredLessons.map(
                (lesson, index) => (

                  <div
                    key={lesson.id}
                    className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >

                    {/* TOP */}

                    <div className="flex items-start justify-between">

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                        📚
                      </div>

                      {lesson.grade !==
                        null && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                          Grade{" "}
                          {lesson.grade}
                        </span>
                      )}

                    </div>

                    {/* LESSON NUMBER */}

                    <p className="mt-5 text-xs font-medium text-gray-400">
                      Lesson {index + 1}
                    </p>

                    {/* TITLE */}

                    <h4 className="mt-1 text-lg font-bold text-gray-900">
                      {lesson.title ||
                        "Untitled Lesson"}
                    </h4>

                    {/* DESCRIPTION */}

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-500">
                      {lesson.description ||
                        "No description available."}
                    </p>

                    {/* VIEW BUTTON */}

                    <button
                      onClick={() => {
                        window.location.href =
                          `/admin/lessons/${lesson.id}`;
                      }}
                      className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      View Lesson →
                    </button>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* REFRESH */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={loadLessons}
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
  value: number;
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