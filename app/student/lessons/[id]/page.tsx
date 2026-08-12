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

type Activity = {
  id: string;
  title: string;
  description: string;
  activity_type: string;
};

type VocabularyWord = {
  word: string;
  meaning: string;
  example: string;
};

type LearningContent = {
  introduction: string;
  examples: string[];
};

function getLessonVocabulary(
  lesson: Lesson
): VocabularyWord[] {
  const title = lesson.title.toLowerCase();

  // "Introducing Myself" should match "introduc" as well as "introduce".
  if (
    title.includes("introduc") ||
    title.includes("myself")
  ) {
    return [
      {
        word: "Hello",
        meaning: "A friendly word we use when we meet someone.",
        example: "Hello! My name is Rahul.",
      },
      {
        word: "Name",
        meaning: "The word used to identify a person.",
        example: "My name is Rahul.",
      },
      {
        word: "Age",
        meaning: "The number of years a person has lived.",
        example: "I am 10 years old.",
      },
      {
        word: "Live",
        meaning: "To have your home in a particular place.",
        example: "I live in Hyderabad.",
      },
      {
        word: "School",
        meaning: "A place where children go to learn.",
        example: "I go to school every day.",
      },
      {
        word: "Student",
        meaning: "A child or person who learns at a school.",
        example: "I am a student.",
      },
      {
        word: "Study",
        meaning: "To learn about a subject.",
        example: "I study in Grade 1.",
      },
      {
        word: "Friend",
        meaning: "A person you like and spend time with.",
        example: "My friend plays with me.",
      },
      {
        word: "Like",
        meaning: "To enjoy something.",
        example: "I like playing cricket.",
      },
      {
        word: "Introduce",
        meaning: "To tell someone who you are.",
        example: "I will introduce myself to the class.",
      },
    ];
  }

  if (title.includes("family")) {
    return [
      {
        word: "Family",
        meaning: "A group of people who are related to each other.",
        example: "I love my family.",
      },
      {
        word: "Mother",
        meaning: "A female parent.",
        example: "My mother helps me.",
      },
      {
        word: "Father",
        meaning: "A male parent.",
        example: "My father works hard.",
      },
      {
        word: "Brother",
        meaning: "A boy or man who has the same parents as you.",
        example: "My brother plays with me.",
      },
      {
        word: "Sister",
        meaning: "A girl or woman who has the same parents as you.",
        example: "My sister is kind.",
      },
    ];
  }

  if (title.includes("school")) {
    return [
      {
        word: "School",
        meaning: "A place where students learn.",
        example: "I go to school every day.",
      },
      {
        word: "Classroom",
        meaning: "A room where students learn.",
        example: "Our classroom is clean.",
      },
      {
        word: "Teacher",
        meaning: "A person who teaches students.",
        example: "My teacher helps me learn.",
      },
      {
        word: "Book",
        meaning: "A set of written or printed pages.",
        example: "I read a book at school.",
      },
      {
        word: "Friend",
        meaning: "A person you like and enjoy spending time with.",
        example: "My friend sits beside me.",
      },
    ];
  }

  return [];
}

function getLessonLearningContent(
  lesson: Lesson
): LearningContent {
  const title = lesson.title.toLowerCase();

  if (
    title.includes("introduc") ||
    title.includes("myself")
  ) {
    return {
      introduction:
        "In this lesson, you will learn how to introduce yourself clearly and confidently. You will practice saying your name, age, where you live, where you study, and a little about what you like. Read the example carefully and then practice saying the sentences aloud.",
      examples: [
        "Hello! My name is Rahul.",
        "I am 10 years old.",
        "I live in Hyderabad.",
        "I study in Grade 1.",
        "I like playing cricket.",
      ],
    };
  }

  if (title.includes("family")) {
    return {
      introduction:
        "In this lesson, you will learn how to talk about your family. Practice saying who is in your family and describe the people you love.",
      examples: [
        "This is my family.",
        "My mother is kind.",
        "My father works hard.",
        "I have one brother.",
        "I love my family.",
      ],
    };
  }

  if (title.includes("school")) {
    return {
      introduction:
        "In this lesson, you will learn how to talk about your school, classroom, teachers, and friends.",
      examples: [
        "I go to school every day.",
        "My classroom is clean.",
        "My teacher helps me learn.",
        "I read books at school.",
        "I play with my friends.",
      ],
    };
  }

  return {
    introduction:
      lesson.description ||
      "Read the lesson carefully and practice the examples aloud before starting the activities.",
    examples: [],
  };
}

export default function StudentLessonPage() {
  const [lesson, setLesson] =
    useState<Lesson | null>(null);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadLesson();
  }, []);

  async function loadLesson() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =========================================
      // GET LESSON ID FROM URL
      // =========================================

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
        "Loading lesson:",
        lessonId
      );

      // =========================================
      // GET LESSON
      // =========================================

      const {
        data: lessonData,
        error: lessonError,
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

      // =========================================
      // GET ACTIVITIES
      // =========================================

      const {
        data: activityData,
        error: activityError,
      } = await supabase
        .from("activities")
        .select(`
          id,
          title,
          description,
          activity_type
        `)
        .eq(
          "lesson_id",
          lessonId
        )
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
        setActivities(
          activityData || []
        );
      }

      setLoading(false);

    } catch (error) {
      console.error(
        "Unexpected error:",
        error
      );

      setErrorMessage(
        "Something went wrong while loading the lesson."
      );

      setLoading(false);
    }
  }

  // =========================================
  // OPEN SPEAKING PRACTICE
  // =========================================

  function startSpeaking() {
    if (!lesson) {
      return;
    }

    window.location.href =
      `/student/speaking?lessonId=${encodeURIComponent(
        lesson.id
      )}`;
  }

  // =========================================
  // LOADING
  // =========================================

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

  // =========================================
  // ERROR
  // =========================================

  if (
    errorMessage ||
    !lesson
  ) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-4xl px-6 py-20">

          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">

            <div className="text-6xl">
            
            </div>

            <h2 className="mt-5 text-2xl font-bold text-red-600">
              Lesson not found
            </h2>

            <p className="mt-3 text-gray-500">
              {errorMessage ||
                "Lesson could not be found."}
            </p>

            <button
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

  // =========================================
  // LESSON PAGE
  // =========================================

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
              Student Lesson
            </p>

          </div>

          <button
            onClick={() => {
              window.location.href =
                "/student/lessons";
            }}
            className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
          >
             Back to Lessons
          </button>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-5xl px-6 py-10">

        {/* ================================= */}
        {/* LESSON HEADER */}
        {/* ================================= */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="bg-blue-600 p-8 text-white">

            <div className="flex flex-wrap items-center gap-3">

              <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                Grade {lesson.grade}
              </span>

              <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
                Lesson {lesson.lesson_number}
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

        {/* ================================= */}
        {/* LEARNING SECTION */}
        {/* ================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 shrink-0 rounded-xl bg-blue-100"
              aria-hidden="true"
            />

            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Learn
              </h3>

              <p className="mt-1 text-gray-500">
                Read and practice the lesson before starting the activities.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-6">
            <h4 className="text-xl font-bold text-blue-700">
              About this lesson
            </h4>

            <p className="mt-4 text-base leading-8 text-gray-700">
              {getLessonLearningContent(lesson).introduction}
            </p>
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-bold text-gray-900">
              Example Sentences
            </h4>

            {getLessonLearningContent(lesson).examples.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-5">
                <p className="text-gray-500">
                  More examples will be added to this lesson soon.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {getLessonLearningContent(lesson).examples.map(
                  (example, index) => (
                    <div
                      key={`${lesson.id}-example-${index}`}
                      className="flex items-start gap-3 rounded-xl border bg-slate-50 p-4"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {index + 1}
                      </span>

                      <p className="leading-7 text-gray-700">
                        {example}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          if ("speechSynthesis" in window) {
                            window.speechSynthesis.cancel();

                            const speech =
                              new SpeechSynthesisUtterance(example);

                            speech.lang = "en-US";
                            speech.rate = 0.8;

                            window.speechSynthesis.speak(speech);
                          }
                        }}
                        className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm hover:bg-blue-100"
                        title="Listen to sentence"
                      >
                        <span
                          className="relative block h-4 w-4"
                          aria-hidden="true"
                        >
                          <span className="absolute left-0 top-1 h-2.5 w-1.5 rounded-sm bg-blue-600" />
                          <span className="absolute left-1.5 top-0.5 h-3.5 w-2.5 rounded-r-full border-2 border-l-0 border-blue-600" />
                        </span>
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* ================================= */}
        {/* VOCABULARY */}
        {/* ================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 shrink-0 rounded-xl bg-purple-100"
                aria-hidden="true"
              />

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
              {getLessonVocabulary(lesson).length} words
            </span>
          </div>

          <div className="mt-4 rounded-xl bg-purple-50 p-4">
            <p className="text-sm leading-6 text-purple-800">
              These words belong to <strong>{lesson.title}</strong>.
              Learn the meaning, listen to the pronunciation, and practice
              the example sentence.
            </p>
          </div>

          {getLessonVocabulary(lesson).length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
              <p className="text-gray-500">
                Vocabulary for this lesson will be added soon.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {getLessonVocabulary(lesson).map((item) => (
                <div
                  key={item.word}
                  className="rounded-xl border bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">
                        {item.word}
                      </h4>

                      <p className="mt-2 text-gray-600">
                        {item.meaning}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if ("speechSynthesis" in window) {
                          window.speechSynthesis.cancel();

                          const speech =
                            new SpeechSynthesisUtterance(item.word);

                          speech.lang = "en-US";
                          speech.rate = 0.8;

                          window.speechSynthesis.speak(speech);
                        }
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg hover:bg-blue-200"
                      title={`Listen to ${item.word}`}
                    >
                      
                    </button>
                  </div>

                  <div className="mt-4 rounded-lg bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      Example
                    </p>

                    <p className="mt-1 text-gray-700">
                      “{item.example}”
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if ("speechSynthesis" in window) {
                        window.speechSynthesis.cancel();

                        const speech =
                          new SpeechSynthesisUtterance(item.example);

                        speech.lang = "en-US";
                        speech.rate = 0.8;

                        window.speechSynthesis.speak(speech);
                      }
                    }}
                    className="mt-3 w-full rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                     Listen to Example
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================================= */}
        {/* SPEAKING PRACTICE */}
        {/* ================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">

          <div className="flex items-center gap-3">

            <div
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100"
              aria-hidden="true"
            >
              <div className="h-5 w-3 rounded-full border-2 border-blue-600" />
              <div className="absolute bottom-2 h-2.5 w-0.5 rounded-full bg-blue-600" />
            </div>

            <div>

              <h3 className="text-2xl font-bold text-gray-900">
                Speaking Practice
              </h3>

              <p className="mt-1 text-gray-500">
                Practice speaking about this lesson.
              </p>

            </div>

          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-6">

            <h4 className="text-lg font-bold text-blue-700">
              Introduce Yourself
            </h4>

            <p className="mt-2 leading-7 text-gray-600">
              Tell us your name, age,
              where you live, and where
              you study.
            </p>

            <button
              onClick={
                startSpeaking
              }
              className="mt-5 rounded-xl bg-blue-600 px-7 py-3 font-bold text-white hover:bg-blue-700"
            >
              Start Speaking
            </button>

          </div>

        </section>

        {/* ================================= */}
        {/* CLASSROOM ACTIVITIES */}
        {/* ================================= */}

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">

          <div className="flex items-center gap-3">

            <div
              className="h-10 w-10 shrink-0 rounded-xl bg-green-100"
              aria-hidden="true"
            />

            <div>

              <h3 className="text-2xl font-bold text-gray-900">
                Classroom Activities
              </h3>

              <p className="mt-1 text-gray-500">
                Fun offline activities to practice what you learned.
              </p>

            </div>

          </div>

          <div className="mt-4 rounded-xl bg-green-50 p-4">

            <p className="text-sm leading-6 text-green-800">
              These activities are for the teacher and students to do
              together in the classroom. No phone or computer is required.
            </p>

          </div>

          <div className="mt-6 space-y-4">

            {[
              {
                number: 1,
                title: "Role Play",
                description:
                  "Work in pairs. One student introduces themselves and the other student asks simple questions about their name, age, school and where they live.",
                time: "10 minutes",
              },
              {
                number: 2,
                title: "Pair Introduction",
                description:
                  "Talk to a partner for one minute. Then introduce your partner to the class using the sentences learned in this lesson.",
                time: "10 minutes",
              },
              {
                number: 3,
                title: "Group Discussion",
                description:
                  "Form small groups and discuss the lesson topic. Each student should get a chance to speak and share at least two sentences.",
                time: "10–15 minutes",
              },
              {
                number: 4,
                title: "Class Introduction Circle",
                description:
                  "Students sit in a circle. Each student says their name, age, school and one thing they like.",
                time: "10 minutes",
              },
            ].map((activity) => (

              <div
                key={activity.number}
                className="rounded-xl border bg-slate-50 p-5"
              >

                <div className="flex items-start gap-4">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                    {activity.number}
                  </div>

                  <div className="flex-1">

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                      <h4 className="text-lg font-bold text-gray-900">
                        {activity.title}
                      </h4>

                      <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500">
                        {activity.time}
                      </span>

                    </div>

                    <p className="mt-2 leading-7 text-gray-600">
                      {activity.description}
                    </p>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </section>

        {/* ================================= */}
        {/* COMPLETE LESSON */}
        {/* ================================= */}


      </section>

    </main>
  );
}