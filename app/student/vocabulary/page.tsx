"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type VocabularyWord = {
  id: number;
  word: string;
  meaning: string;
  example: string;
  category: string;
};

const vocabularyWords: VocabularyWord[] = [
  {
    id: 1,
    word: "Happy",
    meaning: "Feeling good or pleased.",
    example: "I am happy today.",
    category: "Feelings",
  },
  {
    id: 2,
    word: "School",
    meaning: "A place where children learn.",
    example: "I go to school every day.",
    category: "School",
  },
  {
    id: 3,
    word: "Teacher",
    meaning: "A person who teaches students.",
    example: "My teacher helps me learn.",
    category: "School",
  },
  {
    id: 4,
    word: "Friend",
    meaning: "A person you like and enjoy spending time with.",
    example: "My friend plays with me.",
    category: "People",
  },
  {
    id: 5,
    word: "Family",
    meaning: "People who are related to you.",
    example: "I love my family.",
    category: "People",
  },
  {
    id: 6,
    word: "Kind",
    meaning: "Friendly and helpful to others.",
    example: "She is very kind.",
    category: "Feelings",
  },
  {
    id: 7,
    word: "Brave",
    meaning: "Not afraid to do something difficult.",
    example: "The brave boy helped his friend.",
    category: "Personality",
  },
  {
    id: 8,
    word: "Clean",
    meaning: "Not dirty.",
    example: "Keep your classroom clean.",
    category: "Daily Life",
  },
  {
    id: 9,
    word: "Beautiful",
    meaning: "Very nice to look at.",
    example: "The flower is beautiful.",
    category: "Describing",
  },
  {
    id: 10,
    word: "Strong",
    meaning: "Having a lot of physical power.",
    example: "The boy is strong.",
    category: "Describing",
  },
  {
    id: 11,
    word: "Read",
    meaning: "To look at and understand written words.",
    example: "I like to read books.",
    category: "Actions",
  },
  {
    id: 12,
    word: "Write",
    meaning: "To make letters or words on paper.",
    example: "I write my name.",
    category: "Actions",
  },
];

export default function StudentVocabularyPage() {
  const [search, setSearch] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [learnedWords, setLearnedWords] =
    useState<number[]>([]);

  const [studentId, setStudentId] =
    useState<string | null>(null);

  const [loadingProgress, setLoadingProgress] =
    useState(true);

  useEffect(() => {
    loadVocabularyProgress();
  }, []);

  async function loadVocabularyProgress() {
    try {
      setLoadingProgress(true);

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

      const {
        data: student,
        error: studentError,
      } = await supabase
        .from("students")
        .select("id")
        .eq(
          "auth_user_id",
          authData.user.id
        )
        .single();

      if (
        studentError ||
        !student
      ) {
        console.error(
          "Student lookup error:",
          studentError
        );
        setLoadingProgress(false);
        return;
      }

      setStudentId(student.id);

      const {
        data: progress,
        error: progressError,
      } = await supabase
        .from("student_vocabulary_progress")
        .select(
          "vocabulary_id, learned"
        )
        .eq(
          "student_id",
          student.id
        )
        .eq(
          "learned",
          true
        );

      if (progressError) {
        console.error(
          "Vocabulary progress error:",
          progressError
        );
        setLoadingProgress(false);
        return;
      }

      setLearnedWords(
        (progress || []).map(
          (item) =>
            Number(item.vocabulary_id)
        )
      );

      setLoadingProgress(false);
    } catch (error) {
      console.error(
        "Load vocabulary progress error:",
        error
      );
      setLoadingProgress(false);
    }
  }

  async function toggleLearned(
    id: number
  ) {
    if (!studentId) {
      alert(
        "Student information is not available. Please refresh the page."
      );
      return;
    }

    const alreadyLearned =
      learnedWords.includes(id);

    try {
      if (alreadyLearned) {
        const {
          error,
        } = await supabase
          .from(
            "student_vocabulary_progress"
          )
          .update({
            learned: false,
          })
          .eq(
            "student_id",
            studentId
          )
          .eq(
            "vocabulary_id",
            id
          );

        if (error) {
          console.error(
            "Remove learned word error:",
            error
          );
          alert(
            `Unable to update vocabulary progress: ${error.message}`
          );
          return;
        }

        setLearnedWords(
          learnedWords.filter(
            (wordId) =>
              wordId !== id
          )
        );
        return;
      }

      // Check whether a row already exists.
      // This avoids relying on Supabase upsert conflict handling.
      const {
        data: existing,
        error: findError,
      } = await supabase
        .from(
          "student_vocabulary_progress"
        )
        .select(
          "id, learned"
        )
        .eq(
          "student_id",
          studentId
        )
        .eq(
          "vocabulary_id",
          id
        )
        .maybeSingle();

      if (findError) {
        console.error(
          "Find vocabulary progress error:",
          findError
        );
        alert(
          `Unable to check vocabulary progress: ${findError.message}`
        );
        return;
      }

      if (existing) {
        const {
          error: updateError,
        } = await supabase
          .from(
            "student_vocabulary_progress"
          )
          .update({
            learned: true,
          })
          .eq(
            "id",
            existing.id
          );

        if (updateError) {
          console.error(
            "Update learned word error:",
            updateError
          );
          alert(
            `Unable to save vocabulary progress: ${updateError.message}`
          );
          return;
        }
      } else {
        const {
          error: insertError,
        } = await supabase
          .from(
            "student_vocabulary_progress"
          )
          .insert({
            student_id: studentId,
            vocabulary_id: id,
            learned: true,
          });

        if (insertError) {
          console.error(
            "Insert learned word error:",
            insertError
          );
          alert(
            `Unable to save vocabulary progress: ${insertError.message}`
          );
          return;
        }
      }

      setLearnedWords((previous) =>
        previous.includes(id)
          ? previous
          : [...previous, id]
      );
    } catch (error: any) {
      console.error(
        "Vocabulary progress error:",
        error
      );
      alert(
        `Something went wrong while saving progress: ${error?.message || "Unknown error"}`
      );
    }
  }

  function speakWord(
    word: string
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    if (
      !("speechSynthesis" in window)
    ) {
      alert(
        "Speech is not supported in this browser."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const speech =
      new SpeechSynthesisUtterance(
        word
      );

    speech.lang = "en-US";
    speech.rate = 0.8;
    speech.pitch = 1;

    window.speechSynthesis.speak(
      speech
    );
  }

  const categories = [
    "All",
    ...Array.from(
      new Set(
        vocabularyWords.map(
          (item) =>
            item.category
        )
      )
    ),
  ];

  const filteredWords =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return vocabularyWords.filter(
        (item) => {
          const matchesSearch =
            !searchText ||
            item.word
              .toLowerCase()
              .includes(
                searchText
              ) ||
            item.meaning
              .toLowerCase()
              .includes(
                searchText
              );

          const matchesCategory =
            selectedCategory ===
              "All" ||
            item.category ===
              selectedCategory;

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      search,
      selectedCategory,
    ]);

  const progress = Math.round(
    (learnedWords.length /
      vocabularyWords.length) *
      100
  );

  if (loadingProgress) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-5xl">📚</div>
            <p className="mt-4 font-semibold text-gray-600">
              Loading vocabulary progress...
            </p>
          </div>
        </div>
      </main>
    );
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
              Student Vocabulary
            </p>
          </div>

          <div className="flex gap-3">

            <button
              onClick={() =>
                (window.location.href =
                  "/student")
              }
              className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Dashboard
            </button>

            <button
              onClick={() =>
                window.location.reload()
              }
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ↻ Refresh
            </button>

          </div>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-6 py-10">

        {/* TITLE */}

        <div className="rounded-2xl bg-blue-600 p-8 text-white shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold opacity-90">
                📚 Grade 1 Vocabulary
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                Build Your Vocabulary
              </h2>

              <p className="mt-3 max-w-2xl text-blue-100">
                Learn new English words,
                understand their meanings,
                and practice using them
                in sentences.
              </p>

            </div>

            <div className="hidden text-7xl md:block">
              📖
            </div>

          </div>

        </div>

        {/* PROGRESS */}

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold text-gray-500">
                Vocabulary Progress
              </p>

              <h3 className="mt-1 text-2xl font-bold text-gray-900">
                {learnedWords.length} /{" "}
                {vocabularyWords.length} words learned
              </h3>

            </div>

            <div className="text-3xl font-bold text-blue-600">
              {progress}%
            </div>

          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">

            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </div>

        {/* SEARCH */}

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Search vocabulary
              </label>

              <div className="relative">

                <span className="absolute left-4 top-1/2 -translate-y-1/2">
                  🔎
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search a word..."
                  className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Category
              </label>

              <select
                value={
                  selectedCategory
                }
                onChange={(event) =>
                  setSelectedCategory(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>

            </div>

          </div>

        </div>

        {/* WORD COUNT */}

        <div className="mt-8 flex items-center justify-between">

          <div>

            <h3 className="text-2xl font-bold text-gray-900">
              Vocabulary Words
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {filteredWords.length}{" "}
              words found
            </p>

          </div>

          {learnedWords.length >
            0 && (
            <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
              ✓ {learnedWords.length}{" "}
              learned
            </div>
          )}

        </div>

        {/* WORDS */}

        {filteredWords.length ===
        0 ? (

          <div className="mt-5 rounded-2xl border bg-white p-12 text-center shadow-sm">

            <div className="text-5xl">
              🔎
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-900">
              No words found
            </h3>

            <p className="mt-2 text-gray-500">
              Try a different search
              or category.
            </p>

          </div>

        ) : (

          <div className="mt-5 grid gap-5 md:grid-cols-2">

            {filteredWords.map(
              (item) => {

                const learned =
                  learnedWords.includes(
                    item.id
                  );

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                      learned
                        ? "border-green-200"
                        : "border-gray-200"
                    }`}
                  >

                    {/* TOP */}

                    <div className="flex items-start justify-between">

                      <div className="flex items-center gap-4">

                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-3xl">
                          📖
                        </div>

                        <div>

                          <div className="flex items-center gap-2">

                            <h4 className="text-2xl font-bold text-gray-900">
                              {item.word}
                            </h4>

                            {learned && (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                                Learned
                              </span>
                            )}

                          </div>

                          <span className="mt-1 inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                            {item.category}
                          </span>

                        </div>

                      </div>

                      <button
                        onClick={() =>
                          speakWord(
                            item.word
                          )
                        }
                        title="Listen"
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl hover:bg-blue-200"
                      >
                        🔊
                      </button>

                    </div>

                    {/* MEANING */}

                    <div className="mt-5 rounded-xl bg-gray-50 p-4">

                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Meaning
                      </p>

                      <p className="mt-1 text-gray-800">
                        {item.meaning}
                      </p>

                    </div>

                    {/* EXAMPLE */}

                    <div className="mt-4">

                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Example Sentence
                      </p>

                      <p className="mt-1 text-gray-700">
                        “{item.example}”
                      </p>

                    </div>

                    {/* ACTIONS */}

                    <div className="mt-5 flex gap-3">

                      <button
                        onClick={() =>
                          speakWord(
                            item.example
                          )
                        }
                        className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        🔊 Listen
                      </button>

                      <button
                        onClick={() =>
                          toggleLearned(
                            item.id
                          )
                        }
                        className={`flex-1 rounded-lg px-4 py-2 font-semibold ${
                          learned
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {learned
                          ? "✓ Learned"
                          : "Mark Learned"}
                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

        {/* BACK BUTTON */}

        <div className="mt-8">

          <button
            onClick={() =>
              (window.location.href =
                "/student")
            }
            className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            ← Back to Student Dashboard
          </button>

        </div>

      </section>

    </main>
  );
}