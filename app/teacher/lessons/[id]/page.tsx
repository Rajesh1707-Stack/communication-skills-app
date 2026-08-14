"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

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
  grade: number | null;
  lesson_number: number | null;
  title: string | null;
  description: string | null;
  difficulty: string | null;
};

type Goal = {
  id?: string;
  goal: string;
  display_order: number;
};

type Vocabulary = {
  id?: string;
  word: string;
  meaning: string;
  example: string;
  pronunciation: string;
  display_order: number;
};

type Sentence = {
  id?: string;
  sentence: string;
  meaning: string;
  usage: string;
  display_order: number;
};

type Conversation = {
  id?: string;
  speaker: string;
  dialogue: string;
  display_order: number;
};

type Question = {
  id?: string;
  question_number: number;
  question_text: string;
  question_type: string;
  correct_answer: string;
};

type Activity = {
  id?: string;
  title: string;
  description: string;
  activity_type: string;
  content: string;
  questions: Question[];
};

// =====================================================
// ACTIVITY TYPES
// =====================================================

const ACTIVITY_TYPES = [
  {
    value: "listen",
    label: "🎧 Listen & Learn",
    description:
      "Students listen to English and understand the meaning.",
  },
  {
    value: "repeat",
    label: "🔁 Repeat & Practice",
    description:
      "Students listen and repeat useful English sentences.",
  },
  {
    value: "conversation",
    label: "💬 Conversation Practice",
    description:
      "Students practise a real-life conversation.",
  },
  {
    value: "challenge",
    label: "🌎 Real-Life Challenge",
    description:
      "Students use English in a realistic situation.",
  },
  {
    value: "review",
    label: "📝 Practice / Review",
    description:
      "Students answer questions to review the lesson.",
  },
];

// =====================================================
// DEFAULTS
// =====================================================

function createGoal(): Goal {
  return {
    goal: "",
    display_order: 0,
  };
}

function createVocabulary(): Vocabulary {
  return {
    word: "",
    meaning: "",
    example: "",
    pronunciation: "",
    display_order: 0,
  };
}

function createSentence(): Sentence {
  return {
    sentence: "",
    meaning: "",
    usage: "",
    display_order: 0,
  };
}

function createConversation(): Conversation {
  return {
    speaker: "Teacher",
    dialogue: "",
    display_order: 0,
  };
}

function createQuestion(): Question {
  return {
    question_number: 1,
    question_text: "",
    question_type: "multiple_choice",
    correct_answer: "",
  };
}

function createActivity(): Activity {
  return {
    title: "",
    description: "",
    activity_type: "listen",
    content: "",
    questions: [],
  };
}

// =====================================================
// PAGE
// =====================================================

export default function TeacherLessonEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [lesson, setLesson] =
    useState<Lesson | null>(null);

  const [goals, setGoals] =
    useState<Goal[]>([]);

  const [vocabulary, setVocabulary] =
    useState<Vocabulary[]>([]);

  const [sentences, setSentences] =
    useState<Sentence[]>([]);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  // ===================================================
  // LOAD LESSON
  // ===================================================

  useEffect(() => {
    if (id) {
      loadLesson(id);
    }
  }, [id]);

  async function loadLesson(
    lessonId: string
  ) {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      // -----------------------------
      // Lesson
      // -----------------------------

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

      if (lessonError) {
        throw lessonError;
      }

      if (!lessonData) {
        throw new Error(
          "Lesson was not found."
        );
      }

      setLesson(lessonData);

      // -----------------------------
      // Goals
      // -----------------------------

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
        throw goalError;
      }

      setGoals(goalData || []);

      // -----------------------------
      // Vocabulary
      // -----------------------------

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
        throw vocabularyError;
      }

      setVocabulary(
        vocabularyData || []
      );

      // -----------------------------
      // Sentences
      // -----------------------------

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
        throw sentenceError;
      }

      setSentences(
        sentenceData || []
      );

      // -----------------------------
      // Conversations
      // -----------------------------

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
        throw conversationError;
      }

      setConversations(
        conversationData || []
      );

      // -----------------------------
      // Activities
      // -----------------------------

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
        throw activityError;
      }

      const loadedActivities =
        activityData || [];

      // -----------------------------
      // Questions
      // -----------------------------

      const activityIds =
        loadedActivities
          .map(
            (activity) =>
              activity.id
          )
          .filter(Boolean) as string[];

      let questionData: any[] = [];

      if (activityIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("activity_questions")
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
          throw error;
        }

        questionData = data || [];
      }

      const finalActivities: Activity[] =
        loadedActivities.map(
          (activity) => ({
            id: activity.id,
            title:
              activity.title || "",
            description:
              activity.description ||
              "",
            activity_type:
              activity.activity_type ||
              "listen",
            content:
              activity.content || "",
            questions:
              questionData
                .filter(
                  (question) =>
                    question.activity_id ===
                    activity.id
                )
                .map(
                  (question) => ({
                    id: question.id,
                    question_number:
                      question.question_number,
                    question_text:
                      question.question_text ||
                      "",
                    question_type:
                      question.question_type ||
                      "multiple_choice",
                    correct_answer:
                      question.correct_answer ||
                      "",
                  })
                ),
          })
        );

      setActivities(
        finalActivities
      );
    } catch (error: any) {
      console.error(
        "Load lesson error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load lesson."
      );
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // SAVE LESSON
  // ===================================================

  async function saveLesson() {
    if (!lesson) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      // -----------------------------------------------
      // Update main lesson
      // -----------------------------------------------

      const {
        error: lessonError,
      } = await supabase
        .from("lessons")
        .update({
          title:
            lesson.title || "",
          description:
            lesson.description || "",
          difficulty:
            lesson.difficulty ||
            "beginner",
        })
        .eq("id", lesson.id);

      if (lessonError) {
        throw lessonError;
      }

      // -----------------------------------------------
      // Delete old goals
      // -----------------------------------------------

      const {
        error: deleteGoalsError,
      } = await supabase
        .from("lesson_goals")
        .delete()
        .eq("lesson_id", lesson.id);

      if (deleteGoalsError) {
        throw deleteGoalsError;
      }

      // -----------------------------------------------
      // Insert goals
      // -----------------------------------------------

      const validGoals =
        goals.filter(
          (goal) =>
            goal.goal.trim()
              .length > 0
        );

      if (validGoals.length > 0) {
        const {
          error,
        } = await supabase
          .from("lesson_goals")
          .insert(
            validGoals.map(
              (goal, index) => ({
                lesson_id:
                  lesson.id,
                goal:
                  goal.goal.trim(),
                display_order:
                  index,
              })
            )
          );

        if (error) {
          throw error;
        }
      }

      // -----------------------------------------------
      // Delete old vocabulary
      // -----------------------------------------------

      const {
        error: deleteVocabularyError,
      } = await supabase
        .from("lesson_vocabulary")
        .delete()
        .eq("lesson_id", lesson.id);

      if (deleteVocabularyError) {
        throw deleteVocabularyError;
      }

      // -----------------------------------------------
      // Insert vocabulary
      // -----------------------------------------------

      const validVocabulary =
        vocabulary.filter(
          (item) =>
            item.word.trim()
              .length > 0
        );

      if (
        validVocabulary.length > 0
      ) {
        const {
          error,
        } = await supabase
          .from("lesson_vocabulary")
          .insert(
            validVocabulary.map(
              (item, index) => ({
                lesson_id:
                  lesson.id,
                word:
                  item.word.trim(),
                meaning:
                  item.meaning.trim(),
                example:
                  item.example.trim(),
                pronunciation:
                  item.pronunciation.trim(),
                display_order:
                  index,
              })
            )
          );

        if (error) {
          throw error;
        }
      }

      // -----------------------------------------------
      // Delete old sentences
      // -----------------------------------------------

      const {
        error: deleteSentencesError,
      } = await supabase
        .from("lesson_sentences")
        .delete()
        .eq("lesson_id", lesson.id);

      if (deleteSentencesError) {
        throw deleteSentencesError;
      }

      // -----------------------------------------------
      // Insert sentences
      // -----------------------------------------------

      const validSentences =
        sentences.filter(
          (item) =>
            item.sentence.trim()
              .length > 0
        );

      if (
        validSentences.length > 0
      ) {
        const {
          error,
        } = await supabase
          .from("lesson_sentences")
          .insert(
            validSentences.map(
              (item, index) => ({
                lesson_id:
                  lesson.id,
                sentence:
                  item.sentence.trim(),
                meaning:
                  item.meaning.trim(),
                usage:
                  item.usage.trim(),
                display_order:
                  index,
              })
            )
          );

        if (error) {
          throw error;
        }
      }

      // -----------------------------------------------
      // Delete old conversations
      // -----------------------------------------------

      const {
        error: deleteConversationError,
      } = await supabase
        .from(
          "lesson_conversations"
        )
        .delete()
        .eq("lesson_id", lesson.id);

      if (deleteConversationError) {
        throw deleteConversationError;
      }

      // -----------------------------------------------
      // Insert conversations
      // -----------------------------------------------

      const validConversations =
        conversations.filter(
          (item) =>
            item.dialogue.trim()
              .length > 0
        );

      if (
        validConversations.length > 0
      ) {
        const {
          error,
        } = await supabase
          .from(
            "lesson_conversations"
          )
          .insert(
            validConversations.map(
              (item, index) => ({
                lesson_id:
                  lesson.id,
                speaker:
                  item.speaker.trim(),
                dialogue:
                  item.dialogue.trim(),
                display_order:
                  index,
              })
            )
          );

        if (error) {
          throw error;
        }
      }

      // -----------------------------------------------
      // Delete old activity questions
      // -----------------------------------------------

      const existingActivityIds =
        activities
          .map(
            (activity) =>
              activity.id
          )
          .filter(Boolean) as string[];

      if (
        existingActivityIds.length >
        0
      ) {
        const {
          error,
        } = await supabase
          .from(
            "activity_questions"
          )
          .delete()
          .in(
            "activity_id",
            existingActivityIds
          );

        if (error) {
          throw error;
        }
      }

      // -----------------------------------------------
      // Delete old activities
      // -----------------------------------------------

      const {
        error: deleteActivitiesError,
      } = await supabase
        .from("activities")
        .delete()
        .eq(
          "lesson_id",
          lesson.id
        );

      if (deleteActivitiesError) {
        throw deleteActivitiesError;
      }

      // -----------------------------------------------
      // Insert activities one by one
      // -----------------------------------------------

      for (
        let activityIndex = 0;
        activityIndex <
        activities.length;
        activityIndex++
      ) {
        const activity =
          activities[
            activityIndex
          ];

        if (
          !activity.title.trim()
        ) {
          continue;
        }

        const {
          data: insertedActivity,
          error:
            activityInsertError,
        } = await supabase
          .from("activities")
          .insert({
            lesson_id:
              lesson.id,
            title:
              activity.title.trim(),
            description:
              activity.description.trim(),
            activity_type:
              activity.activity_type,
            content:
              activity.content.trim(),
          })
          .select(
            "id"
          )
          .single();

        if (activityInsertError) {
          throw activityInsertError;
        }

        if (
          !insertedActivity?.id
        ) {
          continue;
        }

        // ---------------------------------------------
        // Insert questions
        // ---------------------------------------------

        const validQuestions =
          activity.questions.filter(
            (question) =>
              question.question_text.trim()
                .length > 0
          );

        if (
          validQuestions.length >
          0
        ) {
          const {
            error:
              questionInsertError,
          } = await supabase
            .from(
              "activity_questions"
            )
            .insert(
              validQuestions.map(
                (
                  question,
                  questionIndex
                ) => ({
                  activity_id:
                    insertedActivity.id,
                  question_number:
                    questionIndex +
                    1,
                  question_text:
                    question.question_text.trim(),
                  question_type:
                    question.question_type,
                  correct_answer:
                    question.correct_answer.trim(),
                })
              )
            );

          if (questionInsertError) {
            throw questionInsertError;
          }
        }
      }

      setSuccessMessage(
        "Lesson saved successfully."
      );

      // Reload so database IDs and ordering
      // are synchronized with the editor.
      await loadLesson(
        lesson.id
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: any) {
      console.error(
        "Save lesson error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to save lesson."
      );
    } finally {
      setSaving(false);
    }
  }

  // ===================================================
  // GOALS
  // ===================================================

  function addGoal() {
    setGoals((current) => [
      ...current,
      createGoal(),
    ]);
  }

  function updateGoal(
    index: number,
    value: string
  ) {
    setGoals((current) =>
      current.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                goal: value,
              }
            : item
      )
    );
  }

  function deleteGoal(
    index: number
  ) {
    setGoals((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  // ===================================================
  // VOCABULARY
  // ===================================================

  function addVocabulary() {
    setVocabulary((current) => [
      ...current,
      createVocabulary(),
    ]);
  }

  function updateVocabulary(
    index: number,
    field:
      | "word"
      | "meaning"
      | "example"
      | "pronunciation",
    value: string
  ) {
    setVocabulary((current) =>
      current.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item
      )
    );
  }

  function deleteVocabulary(
    index: number
  ) {
    setVocabulary((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  // ===================================================
  // SENTENCES
  // ===================================================

  function addSentence() {
    setSentences((current) => [
      ...current,
      createSentence(),
    ]);
  }

  function updateSentence(
    index: number,
    field:
      | "sentence"
      | "meaning"
      | "usage",
    value: string
  ) {
    setSentences((current) =>
      current.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item
      )
    );
  }

  function deleteSentence(
    index: number
  ) {
    setSentences((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  // ===================================================
  // CONVERSATION
  // ===================================================

  function addConversation() {
    setConversations(
      (current) => [
        ...current,
        createConversation(),
      ]
    );
  }

  function updateConversation(
    index: number,
    field:
      | "speaker"
      | "dialogue",
    value: string
  ) {
    setConversations(
      (current) =>
        current.map(
          (
            item,
            itemIndex
          ) =>
            itemIndex === index
              ? {
                  ...item,
                  [field]:
                    value,
                }
              : item
        )
    );
  }

  function deleteConversation(
    index: number
  ) {
    setConversations(
      (current) =>
        current.filter(
          (
            _,
            itemIndex
          ) =>
            itemIndex !== index
        )
    );
  }

  // ===================================================
  // ACTIVITIES
  // ===================================================

  function addActivity() {
    setActivities(
      (current) => [
        ...current,
        createActivity(),
      ]
    );
  }

  function updateActivity(
    index: number,
    field:
      | "title"
      | "description"
      | "activity_type"
      | "content",
    value: string
  ) {
    setActivities(
      (current) =>
        current.map(
          (
            activity,
            activityIndex
          ) =>
            activityIndex ===
            index
              ? {
                  ...activity,
                  [field]:
                    value,
                }
              : activity
        )
    );
  }

  function deleteActivity(
    index: number
  ) {
    setActivities(
      (current) =>
        current.filter(
          (
            _,
            activityIndex
          ) =>
            activityIndex !==
            index
        )
    );
  }

  // ===================================================
  // QUESTIONS
  // ===================================================

  function addQuestion(
    activityIndex: number
  ) {
    setActivities(
      (current) =>
        current.map(
          (
            activity,
            index
          ) => {
            if (
              index !==
              activityIndex
            ) {
              return activity;
            }

            return {
              ...activity,
              questions: [
                ...activity.questions,
                {
                  ...createQuestion(),
                  question_number:
                    activity
                      .questions
                      .length +
                    1,
                },
              ],
            };
          }
        )
    );
  }

  function updateQuestion(
    activityIndex: number,
    questionIndex: number,
    field:
      | "question_text"
      | "question_type"
      | "correct_answer",
    value: string
  ) {
    setActivities(
      (current) =>
        current.map(
          (
            activity,
            index
          ) => {
            if (
              index !==
              activityIndex
            ) {
              return activity;
            }

            return {
              ...activity,
              questions:
                activity.questions.map(
                  (
                    question,
                    qIndex
                  ) =>
                    qIndex ===
                    questionIndex
                      ? {
                          ...question,
                          [field]:
                            value,
                        }
                      : question
                ),
            };
          }
        )
    );
  }

  function deleteQuestion(
    activityIndex: number,
    questionIndex: number
  ) {
    setActivities(
      (current) =>
        current.map(
          (
            activity,
            index
          ) => {
            if (
              index !==
              activityIndex
            ) {
              return activity;
            }

            const remaining =
              activity.questions.filter(
                (
                  _,
                  qIndex
                ) =>
                  qIndex !==
                  questionIndex
              );

            return {
              ...activity,
              questions:
                remaining.map(
                  (
                    question,
                    qIndex
                  ) => ({
                    ...question,
                    question_number:
                      qIndex +
                      1,
                  })
                ),
            };
          }
        )
    );
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">
              ⏳
            </div>

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Loading lesson...
            </h2>

            <p className="mt-2 text-gray-500">
              Please wait.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // ERROR WITHOUT LESSON
  // ===================================================

  if (!lesson) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10">
            <div className="text-5xl">
              ⚠️
            </div>

            <h2 className="mt-4 text-2xl font-bold text-red-700">
              Unable to load lesson
            </h2>

            <p className="mt-3 text-red-600">
              {errorMessage ||
                "Lesson not found."}
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/teacher/lessons";
              }}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
            >
              ← Back to Lessons
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              Teacher • Lesson Editor
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  "/teacher/lessons";
              }}
              className="rounded-xl bg-gray-100 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Lessons
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

      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* PAGE TITLE */}

        <div className="mb-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Grade {lesson.grade} • Lesson{" "}
                {lesson.lesson_number}
              </p>

              <h2 className="mt-1 text-4xl font-bold text-gray-900">
                Lesson Editor
              </h2>

              <p className="mt-2 max-w-3xl text-gray-500">
                Build a complete real-life English
                communication lesson for students.
              </p>
            </div>

            <button
              type="button"
              onClick={saveLesson}
              disabled={saving}
              className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "💾 Save Lesson"}
            </button>
          </div>
        </div>

        {/* MESSAGES */}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">
              ⚠️ {errorMessage}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="font-semibold text-green-700">
              ✅ {successMessage}
            </p>
          </div>
        )}

        {/* ================================================= */}
        {/* LESSON INFORMATION */}
        {/* ================================================= */}

        <section className="rounded-2xl border bg-white p-7 shadow-sm">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Lesson Information
            </h3>

            <p className="mt-1 text-gray-500">
              Basic information students will see.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Lesson Title
              </label>

              <input
                value={
                  lesson.title || ""
                }
                onChange={(e) =>
                  setLesson({
                    ...lesson,
                    title:
                      e.target.value,
                  })
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Example: Introducing Myself"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Difficulty
              </label>

              <select
                value={
                  lesson.difficulty ||
                  "beginner"
                }
                onChange={(e) =>
                  setLesson({
                    ...lesson,
                    difficulty:
                      e.target.value,
                  })
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="beginner">
                  Beginner
                </option>

                <option value="elementary">
                  Elementary
                </option>

                <option value="intermediate">
                  Intermediate
                </option>

                <option value="advanced">
                  Advanced
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              Description
            </label>

            <textarea
              rows={4}
              value={
                lesson.description ||
                ""
              }
              onChange={(e) =>
                setLesson({
                  ...lesson,
                  description:
                    e.target.value,
                })
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Describe what students will learn in this lesson."
            />
          </div>
        </section>

        {/* ================================================= */}
        {/* LEARNING GOALS */}
        {/* ================================================= */}

        <section className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-7">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                🎯 Learning Goals
              </h3>

              <p className="mt-1 text-gray-500">
                What should the student be able to do?
              </p>
            </div>

            <button
              type="button"
              onClick={addGoal}
              className="rounded-xl bg-blue-50 px-5 py-3 font-bold text-blue-700 hover:bg-blue-100"
            >
              + Add Goal
            </button>
          </div>

          <div className="space-y-4 p-7">
            {goals.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-gray-500">
                No learning goals yet.
                <br />
                Add the first goal above.
              </div>
            )}

            {goals.map(
              (goal, index) => (
                <div
                  key={
                    goal.id ||
                    `goal-${index}`
                  }
                  className="flex gap-4 rounded-xl border bg-slate-50 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                    {index + 1}
                  </div>

                  <input
                    value={
                      goal.goal
                    }
                    onChange={(e) =>
                      updateGoal(
                        index,
                        e.target
                          .value
                      )
                    }
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Example: Introduce yourself using simple English."
                  />

                  <button
                    type="button"
                    onClick={() =>
                      deleteGoal(
                        index
                      )
                    }
                    className="px-3 font-bold text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              )
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* VOCABULARY */}
        {/* ================================================= */}

        <section className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-7">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                📚 Vocabulary
              </h3>

              <p className="mt-1 text-gray-500">
                Words students should learn and use.
              </p>
            </div>

            <button
              type="button"
              onClick={addVocabulary}
              className="rounded-xl bg-blue-50 px-5 py-3 font-bold text-blue-700 hover:bg-blue-100"
            >
              + Add Word
            </button>
          </div>

          <div className="space-y-5 p-7">
            {vocabulary.length ===
              0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-gray-500">
                No vocabulary added yet.
              </div>
            )}

            {vocabulary.map(
              (item, index) => (
                <div
                  key={
                    item.id ||
                    `vocabulary-${index}`
                  }
                  className="rounded-2xl border bg-slate-50 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-bold text-gray-900">
                      Word {index + 1}
                    </h4>

                    <button
                      type="button"
                      onClick={() =>
                        deleteVocabulary(
                          index
                        )
                      }
                      className="font-bold text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={
                        item.word
                      }
                      onChange={(e) =>
                        updateVocabulary(
                          index,
                          "word",
                          e.target
                            .value
                        )
                      }
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                      placeholder="Word"
                    />

                    <input
                      value={
                        item.pronunciation
                      }
                      onChange={(e) =>
                        updateVocabulary(
                          index,
                          "pronunciation",
                          e.target
                            .value
                        )
                      }
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                      placeholder="Pronunciation"
                    />

                    <input
                      value={
                        item.meaning
                      }
                      onChange={(e) =>
                        updateVocabulary(
                          index,
                          "meaning",
                          e.target
                            .value
                        )
                      }
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                      placeholder="Meaning"
                    />

                    <input
                      value={
                        item.example
                      }
                      onChange={(e) =>
                        updateVocabulary(
                          index,
                          "example",
                          e.target
                            .value
                        )
                      }
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                      placeholder="Example sentence"
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* USEFUL SENTENCES */}
        {/* ================================================= */}

        <section className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-7">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                💬 Useful Sentences
              </h3>

              <p className="mt-1 text-gray-500">
                Practical English students can use in real situations.
              </p>
            </div>

            <button
              type="button"
              onClick={addSentence}
              className="rounded-xl bg-blue-50 px-5 py-3 font-bold text-blue-700 hover:bg-blue-100"
            >
              + Add Sentence
            </button>
          </div>

          <div className="space-y-5 p-7">
            {sentences.length ===
              0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-gray-500">
                No useful sentences added yet.
              </div>
            )}

            {sentences.map(
              (item, index) => (
                <div
                  key={
                    item.id ||
                    `sentence-${index}`
                  }
                  className="rounded-2xl border bg-slate-50 p-6"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h4 className="text-xl font-bold text-gray-900">
                      Sentence{" "}
                      {index + 1}
                    </h4>

                    <button
                      type="button"
                      onClick={() =>
                        deleteSentence(
                          index
                        )
                      }
                      className="font-bold text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={
                      item.sentence
                    }
                    onChange={(e) =>
                      updateSentence(
                        index,
                        "sentence",
                        e.target
                          .value
                      )
                    }
                    placeholder={
                      "Example: What's your name?"
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                  />

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <input
                      value={
                        item.meaning
                      }
                      onChange={(e) =>
                        updateSentence(
                          index,
                          "meaning",
                          e.target
                            .value
                        )
                      }
                      placeholder="Meaning"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                    />

                    <input
                      value={
                        item.usage
                      }
                      onChange={(e) =>
                        updateSentence(
                          index,
                          "usage",
                          e.target
                            .value
                        )
                      }
                      placeholder="When/how to use it"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* REAL-LIFE CONVERSATION */}
        {/* ================================================= */}

        <section className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-7">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                🗣 Real-Life Conversation
              </h3>

              <p className="mt-1 text-gray-500">
                Build the conversation line by line.
              </p>
            </div>

            <button
              type="button"
              onClick={
                addConversation
              }
              className="rounded-xl bg-blue-50 px-5 py-3 font-bold text-blue-700 hover:bg-blue-100"
            >
              + Add Conversation Line
            </button>
          </div>

          <div className="space-y-4 p-7">
            {conversations.length ===
              0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-gray-500">
                No conversation lines yet.
              </div>
            )}

            {conversations.map(
              (item, index) => (
                <div
                  key={
                    item.id ||
                    `conversation-${index}`
                  }
                  className="rounded-2xl border bg-slate-50 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                        {index + 1}
                      </span>

                      <span className="font-bold text-gray-900">
                        Conversation Line
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteConversation(
                          index
                        )
                      }
                      className="font-bold text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <select
                      value={
                        item.speaker
                      }
                      onChange={(e) =>
                        updateConversation(
                          index,
                          "speaker",
                          e.target
                            .value
                        )
                      }
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                    >
                      <option>
                        Teacher
                      </option>

                      <option>
                        Student
                      </option>

                      <option>
                        Friend
                      </option>

                      <option>
                        Child A
                      </option>

                      <option>
                        Child B
                      </option>

                      <option>
                        Customer
                      </option>

                      <option>
                        Shopkeeper
                      </option>
                    </select>

                    <textarea
                      rows={2}
                      value={
                        item.dialogue
                      }
                      onChange={(e) =>
                        updateConversation(
                          index,
                          "dialogue",
                          e.target
                            .value
                        )
                      }
                      placeholder="What does this person say?"
                      className="md:col-span-3 rounded-xl border border-gray-300 bg-white px-4 py-3"
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* ACTIVITIES */}
        {/* ================================================= */}

        <section className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-7">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                🎯 Activities
              </h3>

              <p className="mt-1 text-gray-500">
                Create different activities for different learning purposes.
              </p>
            </div>

            <button
              type="button"
              onClick={addActivity}
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
            >
              + Add Activity
            </button>
          </div>

          <div className="space-y-7 p-7">
            {activities.length ===
              0 && (
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <div className="text-4xl">
                  🎯
                </div>

                <h4 className="mt-3 text-lg font-bold text-gray-900">
                  No activities yet
                </h4>

                <p className="mt-1 text-gray-500">
                  Add activities to make the lesson interactive.
                </p>
              </div>
            )}

            {activities.map(
              (
                activity,
                activityIndex
              ) => (
                <ActivityEditor
                  key={
                    activity.id ||
                    `activity-${activityIndex}`
                  }
                  activity={
                    activity
                  }
                  index={
                    activityIndex
                  }
                  updateActivity={
                    updateActivity
                  }
                  deleteActivity={
                    deleteActivity
                  }
                  addQuestion={
                    addQuestion
                  }
                  updateQuestion={
                    updateQuestion
                  }
                  deleteQuestion={
                    deleteQuestion
                  }
                />
              )
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* BOTTOM SAVE */}
        {/* ================================================= */}

        <div className="sticky bottom-4 z-20 mt-8 flex justify-end">
          <button
            type="button"
            onClick={saveLesson}
            disabled={saving}
            className="rounded-2xl bg-blue-600 px-10 py-4 text-lg font-bold text-white shadow-xl hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving Lesson..."
              : "💾 Save Lesson"}
          </button>
        </div>
      </section>
    </main>
  );
}

// =====================================================
// ACTIVITY EDITOR COMPONENT
// =====================================================

function ActivityEditor({
  activity,
  index,
  updateActivity,
  deleteActivity,
  addQuestion,
  updateQuestion,
  deleteQuestion,
}: {
  activity: Activity;
  index: number;

  updateActivity: (
    index: number,
    field:
      | "title"
      | "description"
      | "activity_type"
      | "content",
    value: string
  ) => void;

  deleteActivity: (
    index: number
  ) => void;

  addQuestion: (
    activityIndex: number
  ) => void;

  updateQuestion: (
    activityIndex: number,
    questionIndex: number,
    field:
      | "question_text"
      | "question_type"
      | "correct_answer",
    value: string
  ) => void;

  deleteQuestion: (
    activityIndex: number,
    questionIndex: number
  ) => void;
}) {
  const activityInfo =
    ACTIVITY_TYPES.find(
      (item) =>
        item.value ===
        activity.activity_type
    );

  const isReview =
    activity.activity_type ===
    "review";

  const isConversation =
    activity.activity_type ===
    "conversation";

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-blue-100 bg-slate-50">
      {/* ACTIVITY HEADER */}

      <div className="flex items-center justify-between bg-blue-600 px-6 py-5 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
            {index + 1}
          </div>

          <div>
            <h4 className="text-xl font-bold">
              Activity {index + 1}
            </h4>

            <p className="text-sm text-blue-100">
              {activityInfo?.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            deleteActivity(index)
          }
          className="rounded-lg bg-white/10 px-4 py-2 font-bold text-white hover:bg-red-500"
        >
          Delete
        </button>
      </div>

      <div className="space-y-5 p-6">
        {/* ACTIVITY TYPE */}

        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Activity Type
          </label>

          <select
            value={
              activity.activity_type
            }
            onChange={(e) =>
              updateActivity(
                index,
                "activity_type",
                e.target.value
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500"
          >
            {ACTIVITY_TYPES.map(
              (type) => (
                <option
                  key={type.value}
                  value={
                    type.value
                  }
                >
                  {type.label}
                </option>
              )
            )}
          </select>
        </div>

        {/* TITLE */}

        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Activity Title
          </label>

          <input
            value={
              activity.title
            }
            onChange={(e) =>
              updateActivity(
                index,
                "title",
                e.target.value
              )
            }
            placeholder="Example: Listen and Learn Greetings"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {/* INSTRUCTIONS */}

        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Instructions for Students
          </label>

          <textarea
            rows={4}
            value={
              activity.description
            }
            onChange={(e) =>
              updateActivity(
                index,
                "description",
                e.target.value
              )
            }
            placeholder="Tell students what they need to do."
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
          />
        </div>

        {/* ================================================= */}
        {/* LISTEN */}
        {/* ================================================= */}

        {activity.activity_type ===
          "listen" && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <div className="mb-3">
              <h5 className="font-bold text-purple-900">
                🎧 Listening Content
              </h5>

              <p className="text-sm text-purple-700">
                Add the English text students should listen to.
              </p>
            </div>

            <textarea
              rows={8}
              value={
                activity.content
              }
              onChange={(e) =>
                updateActivity(
                  index,
                  "content",
                  e.target.value
                )
              }
              placeholder={`Example:

Hello!
Good morning!
How are you?
Nice to meet you.
Goodbye!`}
              className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3"
            />
          </div>
        )}

        {/* ================================================= */}
        {/* REPEAT */}
        {/* ================================================= */}

        {activity.activity_type ===
          "repeat" && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="mb-3">
              <h5 className="font-bold text-green-900">
                🔁 Repeat Practice
              </h5>

              <p className="text-sm text-green-700">
                Add the sentences students should listen to and repeat.
              </p>
            </div>

            <textarea
              rows={10}
              value={
                activity.content
              }
              onChange={(e) =>
                updateActivity(
                  index,
                  "content",
                  e.target.value
                )
              }
              placeholder={`Example:

My name is Rahul.
I am six years old.
I live in Kakinada.
I study at ABC School.
Nice to meet you.`}
              className="w-full rounded-xl border border-green-200 bg-white px-4 py-3"
            />

            <p className="mt-2 text-xs text-green-700">
              Tip: Put one sentence on each line.
            </p>
          </div>
        )}

        {/* ================================================= */}
        {/* CONVERSATION */}
        {/* ================================================= */}

        {isConversation && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="mb-4">
              <h5 className="font-bold text-blue-900">
                💬 Conversation Practice
              </h5>

              <p className="text-sm text-blue-700">
                The conversation lines are managed in the Real-Life Conversation section above.
              </p>
            </div>

            <textarea
              rows={6}
              value={
                activity.content
              }
              onChange={(e) =>
                updateActivity(
                  index,
                  "content",
                  e.target.value
                )
              }
              placeholder={`Optional teacher instructions or conversation scenario.

Example:
Practice this conversation with a partner.`}
              className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
            />
          </div>
        )}

        {/* ================================================= */}
        {/* CHALLENGE */}
        {/* ================================================= */}

        {activity.activity_type ===
          "challenge" && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <div className="mb-3">
              <h5 className="font-bold text-orange-900">
                🌎 Real-Life Challenge
              </h5>

              <p className="text-sm text-orange-700">
                Create a realistic situation where students must use English.
              </p>
            </div>

            <textarea
              rows={10}
              value={
                activity.content
              }
              onChange={(e) =>
                updateActivity(
                  index,
                  "content",
                  e.target.value
                )
              }
              placeholder={`Example:

Imagine you are meeting a new friend at school.

Tell your friend:
1. Your name
2. Your age
3. Where you live
4. Your school
5. Say "Nice to meet you."`}
              className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3"
            />
          </div>
        )}

        {/* ================================================= */}
        {/* REVIEW */}
        {/* ================================================= */}

        {isReview && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-indigo-900">
                  📝 Practice / Review
                </h5>

                <p className="text-sm text-indigo-700">
                  Create questions to check what students learned.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  addQuestion(index)
                }
                className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
              >
                + Add Question
              </button>
            </div>

            <div className="space-y-5">
              {activity.questions
                .length === 0 && (
                <div className="rounded-xl bg-white p-6 text-center text-gray-500">
                  No questions yet.
                </div>
              )}

              {activity.questions.map(
                (
                  question,
                  questionIndex
                ) => (
                  <div
                    key={
                      question.id ||
                      `question-${questionIndex}`
                    }
                    className="rounded-2xl border bg-white p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h6 className="font-bold text-gray-900">
                        Question{" "}
                        {questionIndex +
                          1}
                      </h6>

                      <button
                        type="button"
                        onClick={() =>
                          deleteQuestion(
                            index,
                            questionIndex
                          )
                        }
                        className="font-bold text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={
                        question.question_text
                      }
                      onChange={(e) =>
                        updateQuestion(
                          index,
                          questionIndex,
                          "question_text",
                          e.target
                            .value
                        )
                      }
                      placeholder="Enter the question."
                      className="w-full rounded-xl border border-gray-300 px-4 py-3"
                    />

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <select
                        value={
                          question.question_type
                        }
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            questionIndex,
                            "question_type",
                            e.target
                              .value
                          )
                        }
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                      >
                        <option value="multiple_choice">
                          Multiple Choice
                        </option>

                        <option value="text">
                          Text Answer
                        </option>

                        <option value="fill_blank">
                          Fill in the Blank
                        </option>

                        <option value="true_false">
                          True / False
                        </option>
                      </select>

                      <input
                        value={
                          question.correct_answer
                        }
                        onChange={(e) =>
                          updateQuestion(
                            index,
                            questionIndex,
                            "correct_answer",
                            e.target
                              .value
                          )
                        }
                        placeholder="Correct answer"
                        className="rounded-xl border border-gray-300 px-4 py-3"
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}