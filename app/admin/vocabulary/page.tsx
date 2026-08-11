"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Vocabulary = {
  id: string;
  lesson_id: string;
  word: string;
  meaning: string;
  example_sentence: string;
  created_at: string;
};

type Lesson = {
  id: string;
  title: string | null;
  grade: number | null;
};

export default function VocabularyPage() {
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [search, setSearch] = useState("");
  const [lessonFilter, setLessonFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingItem, setEditingItem] =
    useState<Vocabulary | null>(null);

  const [selectedItem, setSelectedItem] =
    useState<Vocabulary | null>(null);

  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [exampleSentence, setExampleSentence] =
    useState("");
  const [selectedLesson, setSelectedLesson] =
    useState("");

  useEffect(() => {
    loadVocabulary();
  }, []);

  // =========================================
  // LOAD VOCABULARY
  // =========================================

  async function loadVocabulary() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

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

      const {
        data: vocabularyData,
        error: vocabularyError,
      } = await supabase
        .from("vocabulary")
        .select(
          `
          id,
          lesson_id,
          word,
          meaning,
          example_sentence,
          created_at
          `
        )
        .order("created_at", {
          ascending: false,
        });

      if (vocabularyError) {
        setErrorMessage(
          vocabularyError.message
        );

        setLoading(false);
        return;
      }

      setVocabulary(
        vocabularyData || []
      );

      const {
        data: lessonData,
        error: lessonError,
      } = await supabase
        .from("lessons")
        .select(
          "id, title, grade"
        )
        .order("grade", {
          ascending: true,
        });

      if (lessonError) {
        console.error(
          "Lesson error:",
          lessonError
        );
      }

      setLessons(
        lessonData || []
      );

      setLoading(false);
    } catch (error) {
      console.error(
        "Vocabulary error:",
        error
      );

      setErrorMessage(
        "Unable to load vocabulary."
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
  // GET LESSON
  // =========================================

  function getLesson(
    lessonId: string
  ) {
    return lessons.find(
      (lesson) =>
        lesson.id === lessonId
    );
  }

  // =========================================
  // OPEN ADD
  // =========================================

  function openAddModal() {
    setEditingItem(null);

    setWord("");
    setMeaning("");
    setExampleSentence("");

    setSelectedLesson(
      lessons.length > 0
        ? lessons[0].id
        : ""
    );

    setErrorMessage("");
    setSuccessMessage("");

    setShowModal(true);
  }

  // =========================================
  // OPEN EDIT
  // =========================================

  function openEditModal(
    item: Vocabulary
  ) {
    setEditingItem(item);

    setWord(item.word || "");
    setMeaning(item.meaning || "");
    setExampleSentence(
      item.example_sentence || ""
    );

    setSelectedLesson(
      item.lesson_id
    );

    setErrorMessage("");
    setSuccessMessage("");

    setShowModal(true);
  }

  // =========================================
  // CLOSE MODAL
  // =========================================

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingItem(null);
  }

  // =========================================
  // SAVE VOCABULARY
  // =========================================

  async function saveVocabulary() {
    if (!word.trim()) {
      setErrorMessage(
        "Please enter a word."
      );
      return;
    }

    if (!meaning.trim()) {
      setErrorMessage(
        "Please enter the meaning."
      );
      return;
    }

    if (!selectedLesson) {
      setErrorMessage(
        "Please select a lesson."
      );
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (editingItem) {
        // =====================================
        // UPDATE
        // =====================================

        const {
          error,
        } = await supabase
          .from("vocabulary")
          .update({
            lesson_id:
              selectedLesson,
            word: word.trim(),
            meaning: meaning.trim(),
            example_sentence:
              exampleSentence.trim(),
          })
          .eq(
            "id",
            editingItem.id
          );

        if (error) {
          throw error;
        }

        setSuccessMessage(
          "Vocabulary updated successfully."
        );
      } else {
        // =====================================
        // INSERT
        // =====================================

        const {
          error,
        } = await supabase
          .from("vocabulary")
          .insert({
            lesson_id:
              selectedLesson,
            word: word.trim(),
            meaning: meaning.trim(),
            example_sentence:
              exampleSentence.trim(),
          });

        if (error) {
          throw error;
        }

        setSuccessMessage(
          "Vocabulary added successfully."
        );
      }

      setShowModal(false);
      setEditingItem(null);

      await loadVocabulary();

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

    } catch (error: any) {
      console.error(
        "Save vocabulary error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to save vocabulary."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================
  // DELETE VOCABULARY
  // =========================================

  async function deleteVocabulary(
    item: Vocabulary
  ) {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${item.word}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const {
        error,
      } = await supabase
        .from("vocabulary")
        .delete()
        .eq(
          "id",
          item.id
        );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Vocabulary deleted successfully."
      );

      await loadVocabulary();

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

    } catch (error: any) {
      console.error(
        "Delete vocabulary error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to delete vocabulary."
      );
    }
  }

  // =========================================
  // VIEW DETAILS
  // =========================================

  function openDetails(
    item: Vocabulary
  ) {
    setSelectedItem(item);
    setShowDetails(true);
  }

  // =========================================
  // FILTER
  // =========================================

  const filteredVocabulary =
    vocabulary.filter(
      (item) => {
        const searchText =
          `${item.word} ${
            item.meaning
          } ${
            item.example_sentence
          }`.toLowerCase();

        const matchesSearch =
          searchText.includes(
            search.toLowerCase()
          );

        const matchesLesson =
          lessonFilter === "all" ||
          item.lesson_id ===
            lessonFilter;

        return (
          matchesSearch &&
          matchesLesson
        );
      }
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
            Loading vocabulary...
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
              Vocabulary Management
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

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-3xl font-bold text-gray-900">
              📚 Vocabulary
            </h2>

            <p className="mt-2 text-gray-500">
              Add, edit and manage lesson
              vocabulary.
            </p>

          </div>

          <button
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            + Add Vocabulary
          </button>

        </div>

        {/* SUCCESS */}

        {successMessage && (

          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">

            <p className="font-medium text-green-700">
              ✅ {successMessage}
            </p>

          </div>

        )}

        {/* ERROR */}

        {errorMessage && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="font-medium text-red-700">
              ⚠️ {errorMessage}
            </p>

          </div>

        )}

        {/* STATISTICS */}

        <div className="grid gap-5 md:grid-cols-3">

          <StatCard
            title="Total Vocabulary"
            value={vocabulary.length}
            description="All vocabulary words"
            icon="📚"
          />

          <StatCard
            title="Lessons"
            value={lessons.length}
            description="Available lessons"
            icon="📖"
          />

          <StatCard
            title="Showing"
            value={
              filteredVocabulary.length
            }
            description="Matching vocabulary"
            icon="🔎"
          />

        </div>

        {/* LIST */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h3 className="text-xl font-bold text-gray-900">
                  Vocabulary List
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {
                    filteredVocabulary.length
                  }{" "}
                  {filteredVocabulary.length ===
                  1
                    ? "word"
                    : "words"}{" "}
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
                    placeholder="Search vocabulary..."
                    className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
                  />

                </div>

                {/* LESSON FILTER */}

                <select
                  value={lessonFilter}
                  onChange={(event) =>
                    setLessonFilter(
                      event.target.value
                    )
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >

                  <option value="all">
                    All Lessons
                  </option>

                  {lessons.map(
                    (lesson) => (

                      <option
                        key={lesson.id}
                        value={lesson.id}
                      >
                        {lesson.title ||
                          `Grade ${
                            lesson.grade ||
                            "-"
                          }`}
                      </option>

                    )
                  )}

                </select>

              </div>

            </div>

          </div>

          {/* EMPTY */}

          {filteredVocabulary.length ===
          0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                📚
              </div>

              <h4 className="mt-5 text-xl font-bold text-gray-900">
                No vocabulary found
              </h4>

              <p className="mt-2 text-gray-500">
                Add vocabulary or change your
                search/filter.
              </p>

              <button
                onClick={openAddModal}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Add Vocabulary
              </button>

            </div>

          ) : (

            <div className="grid gap-5 p-6 md:grid-cols-2 lg:grid-cols-3">

              {filteredVocabulary.map(
                (item) => {

                  const lesson =
                    getLesson(
                      item.lesson_id
                    );

                  return (

                    <div
                      key={item.id}
                      className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >

                      {/* TOP */}

                      <div className="flex items-start justify-between">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl">
                          📖
                        </div>

                        {lesson && (

                          <span className="max-w-[180px] truncate rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                            {lesson.title ||
                              `Grade ${
                                lesson.grade ||
                                "-"
                              }`}
                          </span>

                        )}

                      </div>

                      {/* WORD */}

                      <h4 className="mt-5 text-2xl font-bold text-gray-900">
                        {item.word}
                      </h4>

                      {/* MEANING */}

                      <div className="mt-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Meaning
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-700">
                          {item.meaning ||
                            "No meaning available."}
                        </p>

                      </div>

                      {/* EXAMPLE */}

                      <div className="mt-4 rounded-xl bg-slate-50 p-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Example Sentence
                        </p>

                        <p className="mt-2 line-clamp-3 text-sm italic leading-6 text-gray-600">
                          "{item.example_sentence ||
                            "No example sentence available."}"
                        </p>

                      </div>

                      {/* ACTIONS */}

                      <div className="mt-5 grid grid-cols-3 gap-2">

                        <button
                          onClick={() =>
                            openDetails(
                              item
                            )
                          }
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          👁 View
                        </button>

                        <button
                          onClick={() =>
                            openEditModal(
                              item
                            )
                          }
                          className="rounded-lg bg-yellow-50 px-3 py-2 text-xs font-bold text-yellow-700 hover:bg-yellow-100"
                        >
                          ✏ Edit
                        </button>

                        <button
                          onClick={() =>
                            deleteVocabulary(
                              item
                            )
                          }
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          🗑 Delete
                        </button>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </section>

        {/* REFRESH */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={loadVocabulary}
            className="rounded-lg border bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ↻ Refresh
          </button>

        </div>

      </section>

      {/* ===================================== */}
      {/* ADD / EDIT MODAL */}
      {/* ===================================== */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b p-6">

              <div>

                <h3 className="text-xl font-bold text-gray-900">

                  {editingItem
                    ? "✏️ Edit Vocabulary"
                    : "➕ Add Vocabulary"}

                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {editingItem
                    ? "Update this vocabulary word."
                    : "Add a new vocabulary word to a lesson."}
                </p>

              </div>

              <button
                onClick={closeModal}
                className="rounded-lg bg-gray-100 px-3 py-2 text-gray-600 hover:bg-gray-200"
              >
                ✕
              </button>

            </div>

            {/* FORM */}

            <div className="space-y-5 p-6">

              {/* LESSON */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Lesson
                </label>

                <select
                  value={selectedLesson}
                  onChange={(event) =>
                    setSelectedLesson(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >

                  <option value="">
                    Select a lesson
                  </option>

                  {lessons.map(
                    (lesson) => (

                      <option
                        key={lesson.id}
                        value={lesson.id}
                      >
                        {lesson.title ||
                          `Grade ${
                            lesson.grade ||
                            "-"
                          }`}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* WORD */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Word
                </label>

                <input
                  type="text"
                  value={word}
                  onChange={(event) =>
                    setWord(
                      event.target.value
                    )
                  }
                  placeholder="Enter vocabulary word"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              {/* MEANING */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Meaning
                </label>

                <textarea
                  value={meaning}
                  onChange={(event) =>
                    setMeaning(
                      event.target.value
                    )
                  }
                  placeholder="Enter the meaning"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              {/* EXAMPLE */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Example Sentence
                </label>

                <textarea
                  value={
                    exampleSentence
                  }
                  onChange={(event) =>
                    setExampleSentence(
                      event.target.value
                    )
                  }
                  placeholder="Enter an example sentence"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

            </div>

            {/* FOOTER */}

            <div className="flex justify-end gap-3 border-t bg-gray-50 p-6">

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveVocabulary}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingItem
                  ? "Update Vocabulary"
                  : "Add Vocabulary"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ===================================== */}
      {/* DETAILS MODAL */}
      {/* ===================================== */}

      {showDetails &&
        selectedItem && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

              {/* HEADER */}

              <div className="flex items-center justify-between border-b p-6">

                <div>

                  <p className="text-sm font-medium text-blue-600">
                    Vocabulary Details
                  </p>

                  <h3 className="mt-1 text-3xl font-bold text-gray-900">
                    {selectedItem.word}
                  </h3>

                </div>

                <button
                  onClick={() =>
                    setShowDetails(
                      false
                    )
                  }
                  className="rounded-lg bg-gray-100 px-3 py-2 text-gray-600 hover:bg-gray-200"
                >
                  ✕
                </button>

              </div>

              {/* DETAILS */}

              <div className="space-y-5 p-6">

                <div className="rounded-xl bg-blue-50 p-5">

                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Lesson
                  </p>

                  <p className="mt-2 font-semibold text-blue-900">
                    {getLesson(
                      selectedItem.lesson_id
                    )?.title ||
                      "Lesson"}
                  </p>

                </div>

                <div>

                  <p className="text-sm font-bold text-gray-500">
                    Meaning
                  </p>

                  <p className="mt-2 leading-7 text-gray-800">
                    {selectedItem.meaning ||
                      "No meaning available."}
                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-5">

                  <p className="text-sm font-bold text-gray-500">
                    Example Sentence
                  </p>

                  <p className="mt-2 italic leading-7 text-gray-700">
                    "{selectedItem.example_sentence ||
                      "No example sentence available."}"
                  </p>

                </div>

                <div>

                  <p className="text-xs text-gray-400">
                    Added on{" "}
                    {new Date(
                      selectedItem.created_at
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </p>

                </div>

              </div>

              {/* FOOTER */}

              <div className="flex justify-end gap-3 border-t bg-gray-50 p-6">

                <button
                  onClick={() => {
                    setShowDetails(
                      false
                    );

                    openEditModal(
                      selectedItem
                    );
                  }}
                  className="rounded-lg bg-yellow-500 px-5 py-2 text-sm font-bold text-white hover:bg-yellow-600"
                >
                  ✏ Edit
                </button>

                <button
                  onClick={() =>
                    setShowDetails(
                      false
                    )
                  }
                  className="rounded-lg bg-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

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