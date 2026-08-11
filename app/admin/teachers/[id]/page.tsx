"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Teacher = {
  id: string;
  name: string;
  email: string | null;
  school_id: string | null;
  created_at: string;
};

type ClassData = {
  id: string;
  name: string;
  grade: number | null;
  section: string | null;
  school_id: string | null;
  teacher_id: string | null;
  created_at: string;
};

type Student = {
  id: string;
  name: string;
  student_id: string;
  grade: number | null;
  section: string | null;
  class_id: string | null;
  school_id: string | null;
  created_at: string;
};

type Analysis = {
  student_id: string;
  overall_score: number;
};

export default function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [teacher, setTeacher] =
    useState<Teacher | null>(null);

  const [classes, setClasses] =
    useState<ClassData[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [analyses, setAnalyses] =
    useState<Analysis[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadTeacher();
  }, [id]);

  // =========================================
  // LOAD TEACHER
  // =========================================

  async function loadTeacher() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =========================================
      // CHECK LOGIN
      // =========================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      // =========================================
      // CHECK ADMIN
      // =========================================

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

      // =========================================
      // GET TEACHER
      // =========================================

      const {
        data: teacherData,
        error: teacherError,
      } = await supabase
        .from("teachers")
        .select(`
          id,
          name,
          email,
          school_id,
          created_at
        `)
        .eq("id", id)
        .single();

      if (teacherError) {
        console.error(
          "Teacher profile error:",
          teacherError
        );

        setErrorMessage(
          teacherError.message
        );

        setLoading(false);
        return;
      }

      setTeacher(teacherData);

      // =========================================
      // GET CLASSES
      // =========================================

      const {
        data: classData,
        error: classError,
      } = await supabase
        .from("classes")
        .select(`
          id,
          name,
          grade,
          section,
          school_id,
          teacher_id,
          created_at
        `)
        .eq("teacher_id", id)
        .order("grade", {
          ascending: true,
        });

      if (classError) {
        console.error(
          "Class loading error:",
          classError
        );

        setErrorMessage(
          classError.message
        );

        setLoading(false);
        return;
      }

      const loadedClasses =
        classData || [];

      setClasses(loadedClasses);

      // =========================================
      // GET STUDENTS
      // =========================================

      if (loadedClasses.length > 0) {
        const classIds =
          loadedClasses.map(
            (item) => item.id
          );

        const {
          data: studentData,
          error: studentError,
        } = await supabase
          .from("students")
          .select(`
            id,
            name,
            student_id,
            grade,
            section,
            class_id,
            school_id,
            created_at
          `)
          .in("class_id", classIds)
          .order("name", {
            ascending: true,
          });

        if (studentError) {
          console.error(
            "Student loading error:",
            studentError
          );

          setErrorMessage(
            studentError.message
          );

          setLoading(false);
          return;
        }

        const loadedStudents =
          studentData || [];

        setStudents(
          loadedStudents
        );

        // =========================================
        // GET SPEECH ANALYSIS
        // =========================================

        if (loadedStudents.length > 0) {
          const studentIds =
            loadedStudents.map(
              (student) => student.id
            );

          const {
            data: analysisData,
            error: analysisError,
          } = await supabase
            .from("speech_analysis")
            .select(`
              student_id,
              overall_score
            `)
            .in(
              "student_id",
              studentIds
            );

          if (analysisError) {
            console.error(
              "Speech analysis loading error:",
              analysisError
            );
          }

          setAnalyses(
            analysisData || []
          );
        } else {
          setAnalyses([]);
        }

      } else {
        setStudents([]);
        setAnalyses([]);
      }

      setLoading(false);

    } catch (error) {
      console.error(
        "Teacher profile error:",
        error
      );

      setErrorMessage(
        "Unable to load teacher profile."
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
      "/admin/teachers";
  }

  // =========================================
  // STUDENT ATTEMPTS
  // =========================================

  function getAttempts(
    studentId: string
  ) {
    return analyses.filter(
      (item) =>
        item.student_id === studentId
    ).length;
  }

  // =========================================
  // STUDENT SCORE
  // =========================================

  function getStudentScore(
    studentId: string
  ) {
    const studentAnalyses =
      analyses.filter(
        (item) =>
          item.student_id === studentId
      );

    if (
      studentAnalyses.length === 0
    ) {
      return 0;
    }

    const total =
      studentAnalyses.reduce(
        (sum, item) =>
          sum +
          Number(
            item.overall_score || 0
          ),
        0
      );

    return Math.round(
      total /
        studentAnalyses.length
    );
  }

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-6xl px-6 py-20 text-center">

          <div className="text-6xl">
            ⏳
          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Loading teacher...
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
    !teacher
  ) {
    return (
      <main className="min-h-screen bg-slate-50">

        <header className="border-b bg-white">

          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

            <div>

              <h1 className="text-2xl font-bold text-blue-700">
                Communication Skills
              </h1>

              <p className="text-sm text-gray-500">
                Teacher Profile
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

        <section className="mx-auto max-w-5xl px-6 py-10">

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">

            <h2 className="text-xl font-bold text-red-700">
              Teacher not found
            </h2>

            <p className="mt-2 text-red-600">
              {errorMessage ||
                "The requested teacher could not be found."}
            </p>

            <button
              onClick={goBack}
              className="mt-6 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ← Back to Teachers
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
              Teacher Profile
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={goBack}
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Teachers
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

        {/* TITLE */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            👩‍🏫 Teacher Profile
          </h2>

          <p className="mt-2 text-gray-500">
            View teacher information, classes,
            students and speaking performance.
          </p>

        </div>

        {/* TEACHER PROFILE */}

        <section className="rounded-2xl border bg-white p-8 shadow-sm">

          <div className="flex flex-col gap-6 md:flex-row md:items-center">

            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-purple-100 text-5xl">
              👩‍🏫
            </div>

            <div>

              <p className="text-sm font-medium text-blue-600">
                Teacher
              </p>

              <h3 className="mt-1 text-3xl font-bold text-gray-900">
                {teacher.name}
              </h3>

              <p className="mt-2 text-gray-500">
                {teacher.email ||
                  "No email available"}
              </p>

            </div>

          </div>

        </section>

        {/* ACCOUNT INFORMATION */}

        <section className="mt-6 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h3 className="text-xl font-bold text-gray-900">
              Account Information
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Teacher account details.
            </p>

          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">

            <InfoCard
              label="Teacher Name"
              value={teacher.name}
              icon="👩‍🏫"
            />

            <InfoCard
              label="Email"
              value={
                teacher.email ||
                "Not available"
              }
              icon="📧"
            />

            <InfoCard
              label="Teacher ID"
              value={teacher.id}
              icon="🆔"
            />

            <InfoCard
              label="School ID"
              value={
                teacher.school_id ||
                "Not assigned"
              }
              icon="🏫"
            />

            <InfoCard
              label="Account Created"
              value={new Date(
                teacher.created_at
              ).toLocaleDateString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }
              )}
              icon="📅"
            />

            <InfoCard
              label="Account Status"
              value="Active"
              icon="✅"
            />

          </div>

        </section>

        {/* TEACHING & CLASSES */}

        <section className="mt-6 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <div className="flex items-center justify-between">

              <div>

                <h3 className="text-xl font-bold text-gray-900">
                  🎓 Teaching & Classes
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Classes currently assigned to this teacher.
                </p>

              </div>

              <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                {classes.length}{" "}
                {classes.length === 1
                  ? "Class"
                  : "Classes"}
              </div>

            </div>

          </div>

          {classes.length === 0 ? (

            <div className="p-8 text-center">

              <div className="text-5xl">
                🎓
              </div>

              <h4 className="mt-4 text-lg font-bold text-gray-900">
                No classes assigned
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                This teacher currently has no
                assigned classes.
              </p>

            </div>

          ) : (

            <div className="grid gap-5 p-6 md:grid-cols-2">

              {classes.map(
                (classItem) => {

                  const classStudents =
                    students.filter(
                      (student) =>
                        student.class_id ===
                        classItem.id
                    );

                  return (
                    <div
                      key={classItem.id}
                      className="rounded-xl border bg-slate-50 p-6"
                    >

                      {/* CLASS HEADER */}

                      <div className="flex items-start justify-between">

                        <div>

                          <p className="text-sm font-medium text-blue-600">
                            Class
                          </p>

                          <h4 className="mt-1 text-xl font-bold text-gray-900">
                            {classItem.name}
                          </h4>

                        </div>

                        <div className="text-3xl">
                          🏫
                        </div>

                      </div>

                      {/* CLASS DETAILS */}

                      <div className="mt-5 grid grid-cols-2 gap-3">

                        <div className="rounded-lg bg-white p-3">

                          <p className="text-xs text-gray-500">
                            Grade
                          </p>

                          <p className="mt-1 font-bold text-gray-900">
                            {classItem.grade
                              ? `Grade ${classItem.grade}`
                              : "-"}
                          </p>

                        </div>

                        <div className="rounded-lg bg-white p-3">

                          <p className="text-xs text-gray-500">
                            Section
                          </p>

                          <p className="mt-1 font-bold text-gray-900">
                            {classItem.section ||
                              "-"}
                          </p>

                        </div>

                      </div>

                      {/* STUDENT COUNT */}

                      <div className="mt-4 rounded-lg bg-blue-50 p-4">

                        <p className="text-xs text-blue-600">
                          Students
                        </p>

                        <p className="mt-1 text-2xl font-bold text-blue-700">
                          {classStudents.length}
                        </p>

                      </div>

                      {/* STUDENTS */}

                      {classStudents.length > 0 && (

                        <div className="mt-5">

                          <h5 className="mb-3 text-sm font-bold text-gray-900">
                            👨‍🎓 Students
                          </h5>

                          <div className="space-y-3">

                            {classStudents.map(
                              (student) => {

                                const attempts =
                                  getAttempts(
                                    student.id
                                  );

                                const score =
                                  getStudentScore(
                                    student.id
                                  );

                                return (
                                  <div
                                    key={
                                      student.id
                                    }
                                    className="rounded-lg border bg-white p-4"
                                  >

                                    <div className="flex items-center justify-between gap-3">

                                      <div className="flex min-w-0 items-center gap-3">

                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                                          👨‍🎓
                                        </div>

                                        <div className="min-w-0">

                                          <p className="truncate font-bold text-gray-900">
                                            {
                                              student.name
                                            }
                                          </p>

                                          <p className="text-xs text-gray-500">
                                            ID:{" "}
                                            {
                                              student.student_id
                                            }
                                          </p>

                                        </div>

                                      </div>

                                      <span
                                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                                          score >= 80
                                            ? "bg-green-100 text-green-700"
                                            : score >= 60
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {score}%
                                      </span>

                                    </div>

                                    <div className="mt-3 flex justify-between text-xs text-gray-500">

                                      <span>
                                        🎤{" "}
                                        {attempts}{" "}
                                        {attempts === 1
                                          ? "Attempt"
                                          : "Attempts"}
                                      </span>

                                      <span>
                                        {attempts > 0
                                          ? "Speaking practice"
                                          : "No practice yet"}
                                      </span>

                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>

                        </div>

                      )}

                      {/* NO STUDENTS */}

                      {classStudents.length === 0 && (

                        <div className="mt-5 rounded-lg border border-dashed bg-white p-5 text-center">

                          <div className="text-3xl">
                            👨‍🎓
                          </div>

                          <p className="mt-2 text-sm font-semibold text-gray-700">
                            No students assigned
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            There are currently no
                            students in this class.
                          </p>

                        </div>

                      )}

                      {/* CLASS ID */}

                      <div className="mt-5">

                        <p className="text-xs text-gray-500">
                          Class ID
                        </p>

                        <p className="mt-1 break-all text-xs font-medium text-gray-700">
                          {classItem.id}
                        </p>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* SUMMARY */}

        <section className="mt-6 grid gap-5 md:grid-cols-3">

          <SummaryCard
            title="Total Classes"
            value={classes.length}
            icon="🎓"
          />

          <SummaryCard
            title="Total Students"
            value={students.length}
            icon="👨‍🎓"
          />

          <SummaryCard
            title="Speaking Attempts"
            value={analyses.length}
            icon="🎤"
          />

        </section>

        {/* BACK */}

        <div className="mt-6">

          <button
            onClick={goBack}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            ← Back to Teachers
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
    <div className="rounded-xl border bg-slate-50 p-5">

      <div className="flex items-start gap-4">

        <div className="text-2xl">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-sm font-medium text-gray-500">
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
// SUMMARY CARD
// =========================================

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>

        </div>

        <div className="text-3xl">
          {icon}
        </div>

      </div>

    </div>
  );
}