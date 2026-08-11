"use client";

import { use, useEffect, useState } from "react";
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
  [key: string]: unknown;
};

export default function LessonDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [lesson, setLesson] =
    useState<Lesson | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadLesson();
  }, [id]);

  // =========================================
  // LOAD LESSON
  // =========================================

  async function loadLesson() {
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

      // GET LESSON

      const {
        data,
        error,
      } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(
          "Lesson error:",
          error
        );

        setErrorMessage(
          error.message
        );

        setLoading(false);
        return;
      }

      setLesson(data);
      setLoading(false);

    } catch (error) {
      console.error(
        "Lesson details error:",
        error
      );

      setErrorMessage(
        "Unable to load lesson."
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
  // BACK
  // =========================================

  function goBack() {
    window.location.href =
      "/admin/lessons";
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
            Loading lesson...
          </h2>

          <p className="mt-2 text-gray-500">
            Please wait.
          </p>

        </div>

      </main>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (!lesson) {
    return (
      <main className="min-h-screen bg-slate-50">

        <header className="border-b bg-white">

          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

            <div>

              <h1 className="text-2xl font-bold text-blue-700">
                Communication Skills
              </h1>

              <p className="text-sm text-gray-500">
                Lesson Details
              </p>

            </div>

            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </header>

        <section className="mx-auto max-w-6xl px-6 py-10">

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">

            <h2 className="text-xl font-bold text-red-700">
              Lesson not found
            </h2>

            <p className="mt-2 text-red-600">
              {errorMessage ||
                "The requested lesson could not be found."}
            </p>

            <button
              onClick={goBack}
              className="mt-6 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ← Back to Lessons
            </button>

          </div>

        </section>

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
              Lesson Details
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={goBack}
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Lessons
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

      <section className="mx-auto max-w-6xl px-6 py-8">

        {/* LESSON HEADER */}

        <section className="rounded-2xl border bg-white p-8 shadow-sm">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-5">

              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-5xl">
                📚
              </div>

              <div>

                <p className="text-sm font-medium text-blue-600">
                  Lesson
                </p>

                <h2 className="mt-1 text-3xl font-bold text-gray-900">
                  {lesson.title ||
                    "Untitled Lesson"}
                </h2>

                <div className="mt-3">

                  {lesson.grade !==
                    null && (
                    <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                      Grade{" "}
                      {lesson.grade}
                    </span>
                  )}

                </div>

              </div>

            </div>

            <div className="rounded-xl bg-slate-50 p-5">

              <p className="text-xs text-gray-500">
                Lesson ID
              </p>

              <p className="mt-1 max-w-xs break-all text-xs font-medium text-gray-700">
                {lesson.id}
              </p>

            </div>

          </div>

        </section>

        {/* DESCRIPTION */}

        <section className="mt-6 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h3 className="text-xl font-bold text-gray-900">
              📖 Lesson Description
            </h3>

          </div>

          <div className="p-6">

            <div className="rounded-xl bg-slate-50 p-6">

              <p className="leading-7 text-gray-700">
                {lesson.description ||
                  "No description available for this lesson."}
              </p>

            </div>

          </div>

        </section>

        {/* LESSON INFORMATION */}

        <section className="mt-6 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h3 className="text-xl font-bold text-gray-900">
              ℹ️ Lesson Information
            </h3>

          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">

            <InfoCard
              label="Lesson Title"
              value={
                lesson.title ||
                "Not available"
              }
              icon="📚"
            />

            <InfoCard
              label="Grade"
              value={
                lesson.grade !==
                null
                  ? `Grade ${lesson.grade}`
                  : "Not assigned"
              }
              icon="🎓"
            />

            <InfoCard
              label="Created"
              value={
                lesson.created_at
                  ? new Date(
                      lesson.created_at
                    ).toLocaleString(
                      "en-IN"
                    )
                  : "Not available"
              }
              icon="📅"
            />

            <InfoCard
              label="Lesson ID"
              value={lesson.id}
              icon="🆔"
            />

          </div>

        </section>

        {/* DATABASE DATA */}

        <section className="mt-6 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h3 className="text-xl font-bold text-gray-900">
              🗂️ Lesson Data
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Additional lesson information stored
              in the database.
            </p>

          </div>

          <div className="p-6">

            <div className="overflow-x-auto">

              <table className="w-full">

                <tbody className="divide-y">

                  {Object.entries(
                    lesson
                  ).map(
                    ([key, value]) => {

                      if (
                        key === "id" ||
                        key === "title" ||
                        key ===
                          "description" ||
                        key === "grade" ||
                        key ===
                          "created_at"
                      ) {
                        return null;
                      }

                      return (
                        <tr
                          key={key}
                        >

                          <td className="w-1/3 px-4 py-4 text-sm font-semibold text-gray-700">
                            {formatLabel(
                              key
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-600">
                            {formatValue(
                              value
                            )}
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </section>

        {/* BUTTONS */}

        <div className="mt-6 flex justify-between">

          <button
            onClick={goBack}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            ← Back to Lessons
          </button>

          <button
            onClick={loadLesson}
            className="rounded-lg border bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ↻ Refresh
          </button>

        </div>

      </section>

    </main>
  );
}

// =========================================
// INFO CARD
// =========================================

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-5">

      <div className="flex items-start gap-4">

        <div className="text-2xl">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-sm text-gray-500">
            {label}
          </p>

          <p className="mt-1 break-all font-semibold text-gray-900">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}

// =========================================
// FORMAT LABEL
// =========================================

function formatLabel(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

// =========================================
// FORMAT VALUE
// =========================================

function formatValue(
  value: unknown
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  if (
    typeof value === "object"
  ) {
    return JSON.stringify(
      value
    );
  }

  return String(value);
}