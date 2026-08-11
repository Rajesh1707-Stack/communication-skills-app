"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Activity = {
  id: string;
  title: string;
  description: string;
  activity_type: string;
};

type Question = {
  id: string;
  question_number: number;
  question_text: string;
  question_type: string;
};

export default function ActivityPage() {
  const params = useParams();

  const activityId = params?.id as string;

  const [activity, setActivity] =
    useState<Activity | null>(null);

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [studentId, setStudentId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [score, setScore] =
    useState<number | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    if (activityId) {
      loadActivity();
    }
  }, [activityId]);

  async function loadActivity() {
    setLoading(true);
    setErrorMessage("");

    console.log("Activity ID:", activityId);

    if (!activityId) {
      setErrorMessage(
        "Activity ID is missing."
      );
      setLoading(false);
      return;
    }

    // ========================================
    // GET LOGGED-IN USER
    // ========================================

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      window.location.href = "/login";
      return;
    }

    // ========================================
    // GET STUDENT
    // ========================================

    const {
      data: studentData,
      error: studentError,
    } = await supabase
      .from("students")
      .select("id")
      .eq(
        "auth_user_id",
        authData.user.id
      )
      .single();

    if (studentError || !studentData) {
      console.error(
        "Student error:",
        studentError
      );

      setErrorMessage(
        "Student information could not be found."
      );

      setLoading(false);
      return;
    }

    setStudentId(studentData.id);

    // ========================================
    // GET ACTIVITY
    // ========================================

    const {
      data: activityData,
      error: activityError,
    } = await supabase
      .from("activities")
      .select(
        "id, title, description, activity_type"
      )
      .eq("id", activityId)
      .single();

    console.log(
      "Activity:",
      activityData
    );

    console.log(
      "Activity error:",
      activityError
    );

    if (
      activityError ||
      !activityData
    ) {
      setErrorMessage(
        activityError?.message ||
          "Activity could not be found."
      );

      setLoading(false);
      return;
    }

    setActivity(activityData);

    // ========================================
    // GET QUESTIONS
    // ========================================

    const {
      data: questionData,
      error: questionError,
    } = await supabase
      .from("activity_questions")
      .select(
        "id, question_number, question_text, question_type"
      )
      .eq(
        "activity_id",
        activityId
      )
      .order(
        "question_number",
        {
          ascending: true,
        }
      );

    if (questionError) {
      console.error(
        "Question error:",
        questionError
      );

      setErrorMessage(
        questionError.message
      );

      setLoading(false);
      return;
    }

    setQuestions(
      questionData || []
    );

    // ========================================
    // CHECK PREVIOUS RESULT
    // ========================================

    const {
      data: resultData,
      error: resultError,
    } = await supabase
      .from(
        "student_activity_results"
      )
      .select(
        "score, completed, answers"
      )
      .eq(
        "student_id",
        studentData.id
      )
      .eq(
        "activity_id",
        activityId
      )
      .maybeSingle();

    if (
      !resultError &&
      resultData?.completed
    ) {
      setSubmitted(true);

      setScore(
        resultData.score
      );

      if (resultData.answers) {
        setAnswers(
          resultData.answers as Record<
            string,
            string
          >
        );
      }
    }

    setLoading(false);
  }

  function updateAnswer(
    questionId: string,
    answer: string
  ) {
    setAnswers(
      (previous) => ({
        ...previous,
        [questionId]: answer,
      })
    );
  }

  async function submitActivity() {
    if (
      !studentId ||
      !activity
    ) {
      return;
    }

    setErrorMessage("");

    const unanswered =
      questions.filter(
        (question) =>
          !answers[
            question.id
          ]?.trim()
      );

    if (
      unanswered.length > 0
    ) {
      setErrorMessage(
        "Please answer all questions before submitting."
      );

      return;
    }

    setSubmitting(true);

    const answeredCount =
      questions.filter(
        (question) =>
          answers[
            question.id
          ]?.trim()
      ).length;

    const calculatedScore =
      questions.length > 0
        ? Math.round(
            (answeredCount /
              questions.length) *
              100
          )
        : 0;

    const {
      error,
    } = await supabase
      .from(
        "student_activity_results"
      )
      .upsert(
        {
          student_id:
            studentId,

          activity_id:
            activity.id,

          score:
            calculatedScore,

          answers:
            answers,

          completed:
            true,

          completed_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "student_id,activity_id",
        }
      );

    if (error) {
      console.error(
        "Submit error:",
        error
      );

      setErrorMessage(
        error.message
      );

      setSubmitting(false);

      return;
    }

    setScore(
      calculatedScore
    );

    setSubmitted(true);

    setSubmitting(false);
  }

  function goBack() {
    window.location.href =
      "/student/lessons";
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="rounded-2xl bg-white p-10 text-center shadow">

          <div className="text-5xl">
            ⏳
          </div>

          <p className="mt-4 text-gray-600">
            Loading activity...
          </p>

        </div>

      </main>
    );
  }

  // ========================================
  // ACTIVITY NOT FOUND
  // ========================================

  if (!activity) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">

        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">

          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-4 text-2xl font-bold text-red-600">
            Activity not found
          </h1>

          <p className="mt-3 text-gray-500">
            {errorMessage}
          </p>

          <p className="mt-4 break-all text-xs text-gray-400">
            Activity ID:
            <br />
            {activityId}
          </p>

          <button
            onClick={goBack}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            ← Back to Lessons
          </button>

        </div>

      </main>
    );
  }

  // ========================================
  // ACTIVITY PAGE
  // ========================================

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
              Student Activity
            </p>

          </div>

          <button
            onClick={goBack}
            className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
          >
            ← Back to Lessons
          </button>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-4xl px-6 py-10">

        {/* ACTIVITY HEADER */}

        <div className="rounded-2xl bg-green-600 p-8 text-white shadow-sm">

          <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold capitalize">
            {activity.activity_type}
          </span>

          <h2 className="mt-5 text-3xl font-bold">
            {activity.title}
          </h2>

          <p className="mt-4 text-green-100">
            {activity.description}
          </p>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-600">

            <p className="font-semibold">
              {errorMessage}
            </p>

          </div>
        )}

        {/* COMPLETED */}

        {submitted ? (

          <section className="mt-8 rounded-2xl border bg-white p-10 text-center shadow-sm">

            <div className="text-6xl">
              🎉
            </div>

            <h3 className="mt-5 text-3xl font-bold text-green-600">
              Activity Completed!
            </h3>

            <p className="mt-3 text-gray-500">
              Great job! You completed the activity.
            </p>

            <div className="mx-auto mt-8 flex h-36 w-36 items-center justify-center rounded-full bg-blue-50">

              <div>

                <p className="text-5xl font-bold text-blue-600">
                  {score}
                </p>

                <p className="text-sm font-semibold text-gray-500">
                  out of 100
                </p>

              </div>

            </div>

            <button
              onClick={goBack}
              className="mt-8 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white hover:bg-blue-700"
            >
              ← Back to Lessons
            </button>

          </section>

        ) : (

          <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">

            <h3 className="text-2xl font-bold text-gray-900">
              📝 Answer the Questions
            </h3>

            <p className="mt-2 text-gray-500">
              Answer all the questions.
            </p>

            {questions.length === 0 ? (

              <div className="mt-6 rounded-xl bg-yellow-50 p-6 text-center text-yellow-700">

                <p className="font-semibold">
                  No questions are available for this activity.
                </p>

              </div>

            ) : (

              <>
                <div className="mt-8 space-y-7">

                  {questions.map(
                    (question) => (

                      <div
                        key={question.id}
                        className="rounded-xl border bg-slate-50 p-6"
                      >

                        <div className="flex items-start gap-3">

                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                            {question.question_number}
                          </span>

                          <p className="pt-1 text-lg font-bold text-gray-900">
                            {question.question_text}
                          </p>

                        </div>

                        <textarea
                          value={
                            answers[
                              question.id
                            ] || ""
                          }
                          onChange={(
                            event
                          ) =>
                            updateAnswer(
                              question.id,
                              event.target.value
                            )
                          }
                          rows={3}
                          placeholder="Type your answer here..."
                          className="mt-5 w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />

                      </div>

                    )
                  )}

                </div>

                <div className="mt-10 flex justify-center">

                  <button
                    onClick={
                      submitActivity
                    }
                    disabled={
                      submitting
                    }
                    className="rounded-xl bg-blue-600 px-10 py-4 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting..."
                      : "✅ Submit Activity"}
                  </button>

                </div>
              </>

            )}

          </section>

        )}

      </section>

    </main>
  );
}