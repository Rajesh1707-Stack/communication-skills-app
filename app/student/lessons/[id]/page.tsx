"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// =====================================================
// TYPES
// =====================================================

type Lesson = {
  id: string;
  grade: number;
  lesson_number: number;
  title: string;
  description: string;
  difficulty: string;
};

type Goal = {
  id: string;
  goal: string;
  display_order: number;
};

type VocabularyWord = {
  id: string;
  word: string;
  meaning: string;
  example: string;
  pronunciation: string;
  display_order: number;
};

type Sentence = {
  id: string;
  sentence: string;
  meaning: string;
  usage: string;
  display_order: number;
};

type Conversation = {
  id: string;
  speaker: string;
  dialogue: string;
  display_order: number;
};

type Question = {
  id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  correct_answer: string | null;
};

type Activity = {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  content: string | null;
  questions: Question[];
};

// =====================================================
// HELPERS
// =====================================================

function speakText(text: string) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const speech =
    new SpeechSynthesisUtterance(text);

  speech.lang = "en-US";
  speech.rate = 0.8;

  window.speechSynthesis.speak(speech);
}

function activityLabel(type: string) {
  const value = type.toLowerCase();

  if (
    value === "listen" ||
    value.includes("listen")
  ) {
    return "🎧 Listen & Learn";
  }

  if (
    value === "repeat" ||
    value.includes("repeat")
  ) {
    return "🔁 Repeat & Practice";
  }

  if (
    value === "conversation" ||
    value.includes("conversation")
  ) {
    return "💬 Conversation Practice";
  }

  if (
    value === "challenge" ||
    value.includes("challenge")
  ) {
    return "🌎 Real-Life Challenge";
  }

  if (
    value === "review" ||
    value.includes("review") ||
    value.includes("practice")
  ) {
    return "📝 Practice / Review";
  }

  return "🎯 Activity";
}

function activityIcon(type: string) {
  const value = type.toLowerCase();

  if (
    value === "listen" ||
    value.includes("listen")
  ) {
    return "🎧";
  }

  if (
    value === "repeat" ||
    value.includes("repeat")
  ) {
    return "🔁";
  }

  if (
    value === "conversation" ||
    value.includes("conversation")
  ) {
    return "💬";
  }

  if (
    value === "challenge" ||
    value.includes("challenge")
  ) {
    return "🌎";
  }

  if (
    value === "review" ||
    value.includes("review") ||
    value.includes("practice")
  ) {
    return "📝";
  }

  return "🎯";
}

// =====================================================
// PAGE
// =====================================================

export default function StudentLessonPage() {
  const [lesson, setLesson] =
    useState<Lesson | null>(null);

  const [goals, setGoals] =
    useState<Goal[]>([]);

  const [vocabulary, setVocabulary] =
    useState<VocabularyWord[]>([]);

  const [sentences, setSentences] =
    useState<Sentence[]>([]);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [openActivity, setOpenActivity] =
    useState<string | null>(null);

  useEffect(() => {
    loadLesson();
  }, []);

  // ===================================================
  // LOAD EVERYTHING
  // ===================================================

  async function loadLesson() {
    try {
      setLoading(true);
      setErrorMessage("");

      // -----------------------------------------------
      // GET LESSON ID
      // -----------------------------------------------

      const parts =
        window.location.pathname.split("/");

      const lessonId =
        parts[parts.length - 1];

      if (!lessonId) {
        setErrorMessage(
          "Lesson ID is missing."
        );

        setLoading(false);
        return;
      }

      console.log(
        "Loading student lesson:",
        lessonId
      );

      // -----------------------------------------------
      // GET LESSON
      // -----------------------------------------------

      const {
        data: lessonData,
        error: lessonError,
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
        .eq("id", lessonId)
        .single();

      if (
        lessonError ||
        !lessonData
      ) {
        console.error(
          "Lesson error:",
          lessonError
        );

        setErrorMessage(
          "Lesson could not be found."
        );

        setLoading(false);
        return;
      }

      setLesson(lessonData);

      // -----------------------------------------------
      // GET LEARNING GOALS
      // -----------------------------------------------

      const {
        data: goalData,
        error: goalError,
      } = await supabase
        .from("lesson_goals")
        .select(
          `
          id,
          goal,
          display_order
          `
        )
        .eq("lesson_id", lessonId)
        .order("display_order", {
          ascending: true,
        });

      if (goalError) {
        console.error(
          "Goals error:",
          goalError
        );
      }

      setGoals(goalData || []);

      // -----------------------------------------------
      // GET VOCABULARY
      // -----------------------------------------------

      const {
        data: vocabularyData,
        error: vocabularyError,
      } = await supabase
        .from("lesson_vocabulary")
        .select(
          `
          id,
          word,
          meaning,
          example,
          pronunciation,
          display_order
          `
        )
        .eq("lesson_id", lessonId)
        .order("display_order", {
          ascending: true,
        });

      if (vocabularyError) {
        console.error(
          "Vocabulary error:",
          vocabularyError
        );
      }

      setVocabulary(
        vocabularyData || []
      );

      // -----------------------------------------------
      // GET USEFUL SENTENCES
      // -----------------------------------------------

      const {
        data: sentenceData,
        error: sentenceError,
      } = await supabase
        .from("lesson_sentences")
        .select(
          `
          id,
          sentence,
          meaning,
          usage,
          display_order
          `
        )
        .eq("lesson_id", lessonId)
        .order("display_order", {
          ascending: true,
        });

      if (sentenceError) {
        console.error(
          "Sentences error:",
          sentenceError
        );
      }

      setSentences(
        sentenceData || []
      );

      // -----------------------------------------------
      // GET CONVERSATION
      // -----------------------------------------------

      const {
        data: conversationData,
        error: conversationError,
      } = await supabase
        .from("lesson_conversations")
        .select(
          `
          id,
          speaker,
          dialogue,
          display_order
          `
        )
        .eq("lesson_id", lessonId)
        .order("display_order", {
          ascending: true,
        });

      if (conversationError) {
        console.error(
          "Conversation error:",
          conversationError
        );
      }

      setConversations(
        conversationData || []
      );

      // -----------------------------------------------
      // GET ACTIVITIES
      // -----------------------------------------------

      const {
        data: activityData,
        error: activityError,
      } = await supabase
        .from("activities")
        .select(
          `
          id,
          title,
          description,
          activity_type,
          content
          `
        )
        .eq("lesson_id", lessonId)
        .order("created_at", {
          ascending: true,
        });

      if (activityError) {
        console.error(
          "Activity error:",
          activityError
        );

        setActivities([]);
      } else {
        const loadedActivities =
          activityData || [];

        // ---------------------------------------------
        // GET ACTIVITY QUESTIONS
        // ---------------------------------------------

        const activityIds =
          loadedActivities.map(
            (activity) =>
              activity.id
          );

        let questionData: any[] = [];

        if (
          activityIds.length > 0
        ) {
          const {
            data,
            error,
          } = await supabase
            .from(
              "activity_questions"
            )
            .select(
              `
              id,
              activity_id,
              question_number,
              question_text,
              question_type,
              correct_answer
              `
            )
            .in(
              "activity_id",
              activityIds
            )
            .order(
              "question_number",
              {
                ascending: true,
              }
            );

          if (error) {
            console.error(
              "Activity questions error:",
              error
            );
          } else {
            questionData =
              data || [];
          }
        }

        // ---------------------------------------------
        // COMBINE ACTIVITIES + QUESTIONS
        // ---------------------------------------------

        const combinedActivities =
          loadedActivities.map(
            (activity) => ({
              id: activity.id,
              title:
                activity.title ||
                "Activity",
              description:
                activity.description ||
                "",
              activity_type:
                activity.activity_type ||
                "activity",
              content:
                activity.content ||
                "",
              questions:
                questionData.filter(
                  (question) =>
                    question.activity_id ===
                    activity.id
                ),
            })
          );

        setActivities(
          combinedActivities
        );
      }

      console.log(
        "Student lesson loaded:",
        {
          lesson: lessonData,
          goals:
            goalData?.length || 0,
          vocabulary:
            vocabularyData?.length ||
            0,
          sentences:
            sentenceData?.length ||
            0,
          conversations:
            conversationData?.length ||
            0,
          activities:
            activityData?.length || 0,
        }
      );

      setLoading(false);
    } catch (error) {
      console.error(
        "Unexpected lesson error:",
        error
      );

      setErrorMessage(
        "Something went wrong while loading the lesson."
      );

      setLoading(false);
    }
  }

  // ===================================================
  // SPEAKING PRACTICE
  // ===================================================

  function startSpeaking() {
    if (!lesson) {
      return;
    }

    window.location.href =
      `/student/speaking?lessonId=${encodeURIComponent(
        lesson.id
      )}`;
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div
            className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"
            aria-hidden="true"
          />

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

  // ===================================================
  // ERROR
  // ===================================================

  if (
    errorMessage ||
    !lesson
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <div className="text-6xl">
              ⚠️
            </div>

            <h2 className="mt-5 text-2xl font-bold text-red-600">
              Lesson not found
            </h2>

            <p className="mt-3 text-gray-500">
              {errorMessage ||
                "Lesson could not be found."}
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/student/lessons";
              }}
              className="mt-6 rounded-xl bg-blue-600 px-7 py-3 font-bold text-white hover:bg-blue-700"
            >
              Back to Lessons
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              Student Lesson
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/student/lessons";
            }}
            className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
          >
            ← Back to Lessons
          </button>
        </div>
      </header>

      {/* ================================================= */}
      {/* CONTENT */}
      {/* ================================================= */}

      <section className="mx-auto max-w-5xl px-6 py-10">
        {/* ================================================= */}
        {/* LESSON HEADER */}
        {/* ================================================= */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="bg-blue-600 p-8 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                Grade {lesson.grade}
              </span>

              <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                Lesson{" "}
                {lesson.lesson_number}
              </span>

              <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold capitalize">
                {lesson.difficulty}
              </span>
            </div>

            <h2 className="mt-6 text-4xl font-bold">
              {lesson.title}
            </h2>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-blue-100">
              {lesson.description}
            </p>
          </div>
        </div>

        {/* ================================================= */}
        {/* LEARNING GOALS */}
        {/* ================================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl">
              🎯
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Learning Goals
              </h3>

              <p className="mt-1 text-gray-500">
                What you will learn in this lesson.
              </p>
            </div>
          </div>

          {goals.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-gray-500">
              Learning goals will be added soon.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {goals.map(
                (goal, index) => (
                  <div
                    key={goal.id}
                    className="flex items-start gap-4 rounded-xl border bg-slate-50 p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {index + 1}
                    </span>

                    <p className="pt-1 leading-7 text-gray-700">
                      {goal.goal}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* LEARN */}
        {/* ================================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl">
              📖
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Learn
              </h3>

              <p className="mt-1 text-gray-500">
                Read and understand the lesson.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-6">
            <h4 className="text-xl font-bold text-blue-700">
              About this lesson
            </h4>

            <p className="mt-4 text-base leading-8 text-gray-700">
              {lesson.description ||
                "Read the lesson carefully and practise the examples."}
            </p>
          </div>
        </section>

        {/* ================================================= */}
        {/* VOCABULARY */}
        {/* ================================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-xl">
                📚
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Vocabulary
                </h3>

                <p className="mt-1 text-gray-500">
                  Important words from this lesson.
                </p>
              </div>
            </div>

            <span className="rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700">
              {vocabulary.length}{" "}
              words
            </span>
          </div>

          {vocabulary.length ===
          0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
              <p className="text-gray-500">
                Vocabulary for this lesson will be added soon.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {vocabulary.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border bg-slate-50 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">
                          {item.word}
                        </h4>

                        {item.pronunciation && (
                          <p className="mt-1 text-sm font-medium text-purple-600">
                            /{" "}
                            {
                              item.pronunciation
                            }{" "}
                            /
                          </p>
                        )}

                        <p className="mt-2 text-gray-600">
                          {item.meaning}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          speakText(
                            item.word
                          )
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg hover:bg-blue-200"
                        title={`Listen to ${item.word}`}
                      >
                        🔊
                      </button>
                    </div>

                    {item.example && (
                      <div className="mt-4 rounded-lg bg-white p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                          Example
                        </p>

                        <p className="mt-1 text-gray-700">
                          “
                          {
                            item.example
                          }
                          ”
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            speakText(
                              item.example
                            )
                          }
                          className="mt-3 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          🔊 Listen to Example
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* USEFUL SENTENCES */}
        {/* ================================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl">
              💬
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Useful Sentences
              </h3>

              <p className="mt-1 text-gray-500">
                English sentences you can use in real life.
              </p>
            </div>
          </div>

          {sentences.length ===
          0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-gray-500">
              Useful sentences will be added soon.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {sentences.map(
                (item, index) => (
                  <div
                    key={item.id}
                    className="rounded-xl border bg-slate-50 p-5"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white">
                        {index + 1}
                      </span>

                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <p className="text-lg font-bold leading-7 text-gray-900">
                            “
                            {
                              item.sentence
                            }
                            ”
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              speakText(
                                item.sentence
                              )
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm hover:bg-orange-50"
                            title="Listen"
                          >
                            🔊
                          </button>
                        </div>

                        {item.meaning && (
                          <p className="mt-3 text-gray-600">
                            <strong>
                              Meaning:
                            </strong>{" "}
                            {
                              item.meaning
                            }
                          </p>
                        )}

                        {item.usage && (
                          <p className="mt-2 text-gray-600">
                            <strong>
                              When to use:
                            </strong>{" "}
                            {
                              item.usage
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* REAL-LIFE CONVERSATION */}
        {/* ================================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-xl">
              🗣
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Real-Life Conversation
              </h3>

              <p className="mt-1 text-gray-500">
                Read and practise the conversation with a partner.
              </p>
            </div>
          </div>

          {conversations.length ===
          0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-gray-500">
              Conversation content will be added soon.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {conversations.map(
                (item, index) => {
                  const isStudent =
                    item.speaker
                      .toLowerCase()
                      .includes(
                        "student"
                      ) ||
                    item.speaker
                      .toLowerCase()
                      .includes(
                        "child"
                      );

                  return (
                    <div
                      key={item.id}
                      className={`flex ${
                        isStudent
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-2xl rounded-2xl p-5 ${
                          isStudent
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-gray-900"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <span
                            className={`text-sm font-bold ${
                              isStudent
                                ? "text-blue-100"
                                : "text-gray-500"
                            }`}
                          >
                            {item.speaker ||
                              `Speaker ${
                                index +
                                1
                              }`}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              speakText(
                                item.dialogue
                              )
                            }
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              isStudent
                                ? "bg-white/20 hover:bg-white/30"
                                : "bg-white hover:bg-gray-200"
                            }`}
                            title="Listen"
                          >
                            🔊
                          </button>
                        </div>

                        <p className="text-lg leading-8">
                          {item.dialogue}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* ACTIVITIES */}
        {/* ================================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-xl">
              🎯
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Activities
              </h3>

              <p className="mt-1 text-gray-500">
                Practise what you learned.
              </p>
            </div>
          </div>

          {activities.length ===
          0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-gray-500">
              Activities for this lesson will be added soon.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {activities.map(
                (
                  activity,
                  index
                ) => {
                  const isOpen =
                    openActivity ===
                    activity.id;

                  return (
                    <div
                      key={
                        activity.id
                      }
                      className="overflow-hidden rounded-2xl border bg-slate-50"
                    >
                      {/* ACTIVITY HEADER */}

                      <button
                        type="button"
                        onClick={() =>
                          setOpenActivity(
                            isOpen
                              ? null
                              : activity.id
                          )
                        }
                        className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-white"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-2xl">
                            {activityIcon(
                              activity.activity_type
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-bold text-green-700">
                              Activity{" "}
                              {index +
                                1}
                            </p>

                            <h4 className="text-xl font-bold text-gray-900">
                              {
                                activity.title
                              }
                            </h4>

                            <p className="mt-1 text-sm font-semibold text-gray-500">
                              {activityLabel(
                                activity.activity_type
                              )}
                            </p>
                          </div>
                        </div>

                        <span className="text-2xl text-gray-400">
                          {isOpen
                            ? "−"
                            : "+"}
                        </span>
                      </button>

                      {/* ACTIVITY CONTENT */}

                      {isOpen && (
                        <div className="border-t bg-white p-6">
                          {activity.description && (
                            <div className="rounded-xl bg-green-50 p-5">
                              <p className="font-semibold leading-7 text-green-900">
                                {
                                  activity.description
                                }
                              </p>
                            </div>
                          )}

                          {activity.content && (
                            <div className="mt-5">
                              <h5 className="mb-3 text-lg font-bold text-gray-900">
                                Activity
                                Content
                              </h5>

                              <div className="rounded-xl border bg-slate-50 p-5">
                                {activity.content
                                  .split(
                                    "\n"
                                  )
                                  .map(
                                    (
                                      line,
                                      lineIndex
                                    ) => (
                                      <p
                                        key={`${activity.id}-content-${lineIndex}`}
                                        className="leading-8 text-gray-700"
                                      >
                                        {line ||
                                          "\u00A0"}
                                      </p>
                                    )
                                  )}
                              </div>
                            </div>
                          )}

                          {/* QUESTIONS */}

                          {activity
                            .questions
                            .length >
                            0 && (
                            <div className="mt-6">
                              <h5 className="mb-4 text-lg font-bold text-gray-900">
                                📝 Practice
                              </h5>

                              <div className="space-y-4">
                                {activity.questions.map(
                                  (
                                    question,
                                    questionIndex
                                  ) => (
                                    <div
                                      key={
                                        question.id
                                      }
                                      className="rounded-xl border bg-slate-50 p-5"
                                    >
                                      <div className="flex items-start gap-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                                          {questionIndex +
                                            1}
                                        </span>

                                        <div className="flex-1">
                                          <p className="font-semibold leading-7 text-gray-900">
                                            {
                                              question.question_text
                                            }
                                          </p>

                                          {question.question_type && (
                                            <span className="mt-3 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-500">
                                              {question.question_type.replace(
                                                /_/g,
                                                " "
                                              )}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* SPEAKING PRACTICE */}
        {/* ================================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl">
              🎙️
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Speaking Practice
              </h3>

              <p className="mt-1 text-gray-500">
                Practise speaking about this lesson.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-6">
            <h4 className="text-lg font-bold text-blue-700">
              Practise Speaking
            </h4>

            <p className="mt-2 leading-7 text-gray-600">
              Speak about the topic you learned in
              this lesson. Try to use the new
              vocabulary and useful sentences.
            </p>

            <button
              type="button"
              onClick={
                startSpeaking
              }
              className="mt-5 rounded-xl bg-blue-600 px-7 py-3 font-bold text-white hover:bg-blue-700"
            >
              🎙️ Start Speaking
            </button>
          </div>
        </section>

        {/* ================================================= */}
        {/* COMPLETE */}
        {/* ================================================= */}

        <section className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="text-5xl">
            🎉
          </div>

          <h3 className="mt-4 text-2xl font-bold text-green-800">
            Great Job!
          </h3>

          <p className="mx-auto mt-2 max-w-2xl leading-7 text-green-700">
            Read the lesson, learn the vocabulary,
            practise the sentences, try the
            conversation and complete the activities.
          </p>
        </section>
      </section>
    </main>
  );
}