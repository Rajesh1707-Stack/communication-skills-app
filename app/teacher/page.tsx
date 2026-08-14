"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type SchoolClass = {
  id: string;
  grade: number;
  section: string;
  name?: string | null;
};

type Student = {
  id: string;
  name: string;
  student_id: string;
  grade: number;
  section: string;
  class_id: string | null;
  auth_user_id: string | null;
};

type Lesson = {
  id: string;
  grade: number | null;
  lesson_number: number | null;
  title: string | null;
  description: string | null;
  difficulty: string | null;
};

type Teacher = {
  id: string;
  full_name: string | null;
  role: string;
  login_id?: string | null;
};

export default function TeacherDashboard() {

  // =========================================
  // DASHBOARD DATA
  // =========================================

  const [teacher, setTeacher] =
    useState<Teacher | null>(null);

  // Teacher assigned classes
  const [classes, setClasses] =
    useState<SchoolClass[]>([]);

  // ALL school classes
  const [allClasses, setAllClasses] =
    useState<SchoolClass[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [lessons, setLessons] =
    useState<Lesson[]>([]);

  // =========================================
  // PAGE STATE
  // =========================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  // =========================================
  // CREATE STUDENT STATE
  // =========================================

  const [
    showCreateStudent,
    setShowCreateStudent,
  ] = useState(false);

  const [
    studentName,
    setStudentName,
  ] = useState("");

  const [
    studentLoginId,
    setStudentLoginId,
  ] = useState("");

  const [
    studentPassword,
    setStudentPassword,
  ] = useState("");

  const [
    studentConfirmPassword,
    setStudentConfirmPassword,
  ] = useState("");

  const [
    studentClassId,
    setStudentClassId,
  ] = useState("");

  const [
    creatingStudent,
    setCreatingStudent,
  ] = useState(false);

  // =========================================
  // LOAD
  // =========================================

  useEffect(() => {
    loadDashboard();
  }, []);

  // =========================================
  // LOAD DASHBOARD
  // =========================================

  async function loadDashboard(
    isRefresh = false
  ) {

    try {

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      setSuccessMessage("");

      // =====================================
      // SESSION
      // =====================================

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {
        window.location.href =
          "/login";

        return;
      }

      const token =
        sessionData.session
          .access_token;

      // =====================================
      // DASHBOARD
      // =====================================

      const response =
        await fetch(
          "/api/teacher/dashboard",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            cache: "no-store",
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {

        const text =
          await response.text();

        console.error(
          "Teacher dashboard returned non-JSON:",
          text.substring(
            0,
            500
          )
        );

        throw new Error(
          "Teacher dashboard API did not return JSON."
        );
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to load teacher dashboard."
        );
      }

      // =====================================
      // SET DASHBOARD DATA
      // =====================================

      setTeacher(
        result.teacher ||
          null
      );

      setClasses(
        result.classes ||
          []
      );

      setStudents(
        result.students ||
          []
      );

      setLessons(
        result.lessons ||
          []
      );

      // =====================================
      // LOAD ALL SCHOOL CLASSES
      // =====================================

      const classResponse =
        await fetch(
          "/api/teacher/classes",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            cache: "no-store",
          }
        );

      const classContentType =
        classResponse.headers.get(
          "content-type"
        ) || "";

      if (
        !classContentType.includes(
          "application/json"
        )
      ) {

        const text =
          await classResponse.text();

        console.error(
          "Teacher classes returned non-JSON:",
          text.substring(
            0,
            500
          )
        );

        throw new Error(
          "Teacher classes API did not return JSON."
        );
      }

      const classResult =
        await classResponse.json();

      if (
        !classResponse.ok
      ) {
        throw new Error(
          classResult?.error ||
            "Unable to load school classes."
        );
      }

      setAllClasses(
        classResult.classes ||
          []
      );

    } catch (error: any) {

      console.error(
        "Teacher dashboard error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load teacher dashboard."
      );

    } finally {

      setLoading(false);

      setRefreshing(false);
    }
  }

  // =========================================
  // OPEN CREATE STUDENT
  // =========================================

  function openCreateStudent() {

    setErrorMessage("");

    setSuccessMessage("");

    // IMPORTANT:
    // Use ALL school classes, not only
    // teacher assigned classes.

    if (
      allClasses.length ===
      0
    ) {

      setErrorMessage(
        "No school classes are available. Please create classes from the Admin dashboard first."
      );

      return;
    }

    // Automatically select first class

    if (!studentClassId) {
      setStudentClassId(
        allClasses[0].id
      );
    }

    setShowCreateStudent(
      true
    );
  }

  // =========================================
  // CREATE STUDENT
  // =========================================

  async function createStudent() {

    try {

      setCreatingStudent(
        true
      );

      setErrorMessage("");

      setSuccessMessage("");

      const name =
        studentName.trim();

      const loginId =
        studentLoginId
          .trim()
          .toLowerCase();

      // =====================================
      // VALIDATION
      // =====================================

      if (!name) {
        throw new Error(
          "Student name is required."
        );
      }

      if (!studentClassId) {
        throw new Error(
          "Please select a class."
        );
      }

      if (!/^[a-zA-Z0-9._-]{3,30}$/.test(loginId)) {
  throw new Error(
    "Student Login ID must contain 3-30 characters using letters, numbers, dot, underscore or hyphen."
  );
}

      if (
        studentPassword.length <
        6
      ) {
        throw new Error(
          "Password must contain at least 6 characters."
        );
      }

      if (
        studentPassword !==
        studentConfirmPassword
      ) {
        throw new Error(
          "Passwords do not match."
        );
      }

      // =====================================
      // SESSION
      // =====================================

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {

        window.location.href =
          "/login";

        return;
      }

      // =====================================
      // CREATE STUDENT API
      // =====================================

      const response =
        await fetch(
          "/api/teacher/create-student",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${sessionData.session.access_token}`,
            },

            body: JSON.stringify({
              name,

              loginId,

              password:
                studentPassword,

              classId:
                studentClassId,
            }),
          }
        );

      // =====================================
      // SAFE JSON
      // =====================================

      const responseText =
        await response.text();

      let result: any = {};

      try {

        result =
          responseText
            ? JSON.parse(
                responseText
              )
            : {};

      } catch {

        console.error(
          "Create student API returned non-JSON:",
          responseText.substring(
            0,
            1000
          )
        );

        throw new Error(
          "Create student API did not return JSON. Check app/api/teacher/create-student/route.ts."
        );
      }

      // =====================================
      // API ERROR
      // =====================================

      if (!response.ok) {

        throw new Error(
          result?.error ||
            result?.message ||
            "Unable to create student."
        );
      }

      // =====================================
      // SUCCESS
      // =====================================

      setSuccessMessage(
        `Student "${name}" created successfully.`
      );

      // Clear form

      setStudentName("");

      setStudentLoginId("");

      setStudentPassword("");

      setStudentConfirmPassword("");

      setStudentClassId("");

      setShowCreateStudent(
        false
      );

      // Reload dashboard

      await loadDashboard(
        true
      );

    } catch (error: any) {

      console.error(
        "Create student error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to create student."
      );

    } finally {

      setCreatingStudent(
        false
      );
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
  // SEARCH STUDENTS
  // =========================================

  const filteredStudents =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return students;
      }

      return students.filter(
        (student) =>
          student.name
            .toLowerCase()
            .includes(query) ||
          student.student_id
            .toLowerCase()
            .includes(query)
      );

    }, [
      students,
      search,
    ]);

  // =========================================
  // LOADING
  // =========================================

  if (loading) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="text-5xl">
            ⏳
          </div>

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Loading Teacher Dashboard...
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Please wait.
          </p>

        </div>

      </main>
    );
  }

  // =========================================
  // DASHBOARD
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
              Teacher Dashboard
            </p>

          </div>

          <div className="flex items-center gap-4">

            <div className="hidden text-right sm:block">

              <p className="text-sm font-semibold text-gray-900">
                {teacher?.full_name ||
                  "Teacher"}
              </p>

              <p className="text-xs text-gray-400">
                Teacher
              </p>

            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-8">

        {/* WELCOME */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            Welcome,{" "}
            {teacher?.full_name ||
              "Teacher"}
          </h2>

          <p className="mt-2 text-gray-500">
            Manage your classes, lessons and students.
          </p>

        </div>

        {/* ERROR */}

        {errorMessage && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            ⚠️ {errorMessage}
          </div>

        )}

        {/* SUCCESS */}

        {successMessage && (

          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            ✅ {successMessage}
          </div>

        )}

        {/* SUMMARY */}

        <div className="grid gap-5 md:grid-cols-3">

          <SummaryCard
            title="My Classes"
            value={classes.length}
            icon="🏫"
          />

          <SummaryCard
            title="My Students"
            value={students.length}
            icon="👨‍🎓"
          />

          <SummaryCard
            title="My Lessons"
            value={lessons.length}
            icon="📚"
          />

        </div>

        {/* =====================================
            ASSIGNED CLASSES
        ====================================== */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h3 className="text-xl font-bold text-gray-900">
                🏫 My Assigned Classes
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Classes assigned to you by the administrator.
              </p>

            </div>

            <button
              type="button"
              onClick={
                openCreateStudent
              }
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              + Create Student
            </button>

          </div>

          {classes.length ===
          0 ? (

            <div className="p-10 text-center">

              <div className="text-5xl">
                🏫
              </div>

              <h4 className="mt-4 font-bold text-gray-900">
                No classes assigned
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                You can still create students by selecting a school class.
              </p>

            </div>

          ) : (

            <div className="grid gap-5 p-6 md:grid-cols-2 lg:grid-cols-3">

              {classes.map(
                (classItem) => {

                  const count =
                    students.filter(
                      (student) =>
                        student.class_id ===
                        classItem.id
                    ).length;

                  return (

                    <div
                      key={
                        classItem.id
                      }
                      className="rounded-2xl border bg-slate-50 p-5"
                    >

                      <div className="flex items-start justify-between">

                        <div>

                          <h4 className="text-lg font-bold text-gray-900">
                            Grade{" "}
                            {
                              classItem.grade
                            }
                          </h4>

                          <p className="mt-1 text-sm text-gray-500">
                            Section{" "}
                            {
                              classItem.section
                            }
                          </p>

                        </div>

                        <span className="text-3xl">
                          🏫
                        </span>

                      </div>

                      <div className="mt-5 rounded-xl bg-white p-4">

                        <p className="text-2xl font-bold text-blue-600">
                          {count}
                        </p>

                        <p className="text-sm text-gray-500">
                          Students
                        </p>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </section>

        {/* =====================================
            LESSONS
        ====================================== */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h3 className="text-xl font-bold text-gray-900">
                📚 Lessons
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Lessons available for teachers.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                window.location.assign(
                  "/teacher/lessons"
                )
              }
              className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
            >
              View All Grades →
            </button>

          </div>

          {lessons.length ===
          0 ? (

            <div className="p-10 text-center">

              <div className="text-5xl">
                📚
              </div>

              <h4 className="mt-4 font-bold text-gray-900">
                No lessons available
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                No lessons are currently available.
              </p>

            </div>

          ) : (

            <div className="grid gap-5 p-6 md:grid-cols-2 lg:grid-cols-3">

              {lessons
                .slice(
                  0,
                  6
                )
                .map(
                  (lesson) => (

                    <div
                      key={
                        lesson.id
                      }
                      className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >

                      <div className="bg-blue-600 p-5 text-white">

                        <div className="flex items-center justify-between gap-2">

                          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                            Lesson{" "}
                            {
                              lesson.lesson_number ??
                              ""
                            }
                          </span>

                          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                            Grade{" "}
                            {
                              lesson.grade ??
                              ""
                            }
                          </span>

                        </div>

                        <h4 className="mt-4 text-xl font-bold">
                          {
                            lesson.title ||
                            "Untitled Lesson"
                          }
                        </h4>

                      </div>

                      <div className="p-5">

                        <p className="min-h-[48px] text-sm leading-6 text-gray-600">
                          {
                            lesson.description ||
                            "Communication skills lesson."
                          }
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            window.location.assign(
                              `/teacher/lessons/${lesson.id}`
                            )
                          }
                          className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
                        >
                          Open Lesson →
                        </button>

                      </div>

                    </div>

                  )
                )}

            </div>

          )}

        </section>

        {/* =====================================
            STUDENTS
        ====================================== */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b p-6 md:flex-row md:items-center md:justify-between">

            <div>

              <h3 className="text-xl font-bold text-gray-900">
                👨‍🎓 My Students
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Students in your assigned classes.
              </p>

            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <input
                type="text"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search student..."
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />

              <button
                type="button"
                onClick={
                  openCreateStudent
                }
                className="whitespace-nowrap rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                + Create Student
              </button>

            </div>

          </div>

          {filteredStudents.length ===
          0 ? (

            <div className="p-10 text-center">

              <div className="text-5xl">
                👨‍🎓
              </div>

              <h4 className="mt-4 font-bold text-gray-900">
                No students found
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                Create a student to add them to a school class.
              </p>

            </div>

          ) : (

            <div className="divide-y">

              {filteredStudents.map(
                (student) => (

                  <div
                    key={
                      student.id
                    }
                    className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div>

                      <h4 className="font-bold text-gray-900">
                        {
                          student.name
                        }
                      </h4>

                      <p className="mt-1 text-sm text-gray-500">
                        Login ID:{" "}
                        {
                          student.student_id
                        }
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Grade{" "}
                        {
                          student.grade
                        }{" "}
                        • Section{" "}
                        {
                          student.section
                        }
                      </p>

                    </div>

                    <div className="rounded-xl bg-slate-50 px-5 py-3 text-center">

                      <p className="text-xs text-gray-500">
                        Student Account
                      </p>

                      <p className="mt-1 font-semibold text-green-600">
                        Active
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* REFRESH */}

        <div className="mt-8 flex justify-end">

          <button
            type="button"
            onClick={() =>
              loadDashboard(
                true
              )
            }
            disabled={
              refreshing
            }
            className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh Dashboard"}
          </button>

        </div>

      </section>

      {/* =====================================
          CREATE STUDENT MODAL
      ====================================== */}

      {showCreateStudent && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b p-6">

              <div>

                <h3 className="text-2xl font-bold text-gray-900">
                  Create Student
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Create login credentials for a student.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreateStudent(
                    false
                  )
                }
                disabled={
                  creatingStudent
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>

            </div>

            {/* BODY */}

            <div className="space-y-5 p-6">

              {/* NAME */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Student Name
                </label>

                <input
                  type="text"
                  value={
                    studentName
                  }
                  onChange={(
                    event
                  ) =>
                    setStudentName(
                      event.target.value
                    )
                  }
                  placeholder="Enter student name"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>

              {/* LOGIN ID */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Student Login ID
                </label>

                <input
  type="text"
  value={studentLoginId}
  onChange={(event) =>
    setStudentLoginId(
      event.target.value
        .toLowerCase()
        .replace(/\s/g, "")
    )
  }
  placeholder="peter01"
  autoComplete="username"
  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
/>

<p className="mt-1 text-xs text-gray-400">
  Example: peter01
</p>

              </div>

              {/* PASSWORD */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Password
                </label>

                <input
                  type="password"
                  value={
                    studentPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setStudentPassword(
                      event.target.value
                    )
                  }
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>

              {/* CONFIRM */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={
                    studentConfirmPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setStudentConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>

              {/* CLASS */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Class
                </label>

                <select
                  value={
                    studentClassId
                  }
                  onChange={(
                    event
                  ) =>
                    setStudentClassId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >

                  <option value="">
                    Select class
                  </option>

                  {allClasses.map(
                    (
                      classItem
                    ) => (

                      <option
                        key={
                          classItem.id
                        }
                        value={
                          classItem.id
                        }
                      >
                        Grade{" "}
                        {
                          classItem.grade
                        }{" "}
                        - Section{" "}
                        {
                          classItem.section
                        }

                        {classItem.name
                          ? ` - ${classItem.name}`
                          : ""}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* INFO */}

              <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                Every teacher created by the administrator can create a student in any school class.
              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setShowCreateStudent(
                      false
                    )
                  }
                  disabled={
                    creatingStudent
                  }
                  className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    createStudent
                  }
                  disabled={
                    creatingStudent
                  }
                  className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingStudent
                    ? "Creating..."
                    : "Create Student"}
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </main>
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

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-gray-500">
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