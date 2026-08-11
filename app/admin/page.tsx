"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function AdminDashboard() {
  const [userName, setUserName] =
    useState("Administrator");

  const [studentCount, setStudentCount] =
    useState(0);

  const [teacherCount, setTeacherCount] =
    useState(0);

  const [classCount, setClassCount] =
    useState(0);

  const [lessonCount, setLessonCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  // =========================================
  // CREATE TEACHER
  // =========================================

  const [showCreateTeacher, setShowCreateTeacher] =
    useState(false);

  const [teacherName, setTeacherName] =
    useState("");

  const [teacherLoginId, setTeacherLoginId] =
    useState("");

  const [teacherPassword, setTeacherPassword] =
    useState("");

  const [teacherConfirmPassword, setTeacherConfirmPassword] =
    useState("");

  const [creatingTeacher, setCreatingTeacher] =
    useState(false);

  useEffect(() => {
    loadAdminDashboard();
  }, []);

  // =========================================
  // LOAD ADMIN DASHBOARD
  // =========================================

  async function loadAdminDashboard() {
    try {
      setLoading(true);
      setErrorMessage("");

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

      setUserName(
        profile.full_name ||
          "Administrator"
      );

      const {
        count: students,
        error: studentError,
      } = await supabase
        .from("students")
        .select("id", {
          count: "exact",
          head: true,
        });

      if (studentError) {
        console.error(
          "Student count error:",
          studentError
        );
      }

      setStudentCount(
        students || 0
      );

      const {
        count: teachers,
        error: teacherError,
      } = await supabase
        .from("teachers")
        .select("id", {
          count: "exact",
          head: true,
        });

      if (teacherError) {
        console.error(
          "Teacher count error:",
          teacherError
        );
      }

      setTeacherCount(
        teachers || 0
      );

      const {
        count: classes,
        error: classError,
      } = await supabase
        .from("classes")
        .select("id", {
          count: "exact",
          head: true,
        });

      if (classError) {
        console.error(
          "Class count error:",
          classError
        );
      }

      setClassCount(
        classes || 0
      );

      const {
        count: lessons,
        error: lessonError,
      } = await supabase
        .from("lessons")
        .select("id", {
          count: "exact",
          head: true,
        });

      if (lessonError) {
        console.log(
          "Lessons table/count not available:",
          lessonError.message
        );

        setLessonCount(0);
      } else {
        setLessonCount(
          lessons || 0
        );
      }

      setLoading(false);
    } catch (error) {
      console.error(
        "Admin dashboard error:",
        error
      );

      setErrorMessage(
        "Unable to load dashboard data."
      );

      setLoading(false);
    }
  }

  // =========================================
  // CREATE TEACHER
  // =========================================

  async function createTeacher() {
    try {
      setCreatingTeacher(true);
      setErrorMessage("");
      setSuccessMessage("");

      const name =
        teacherName.trim();

      const loginId =
        teacherLoginId
          .trim()
          .toUpperCase();

      const password =
        teacherPassword;

      const confirmPassword =
        teacherConfirmPassword;

      // -----------------------------
      // VALIDATION
      // -----------------------------

      if (!name) {
        throw new Error(
          "Please enter teacher name."
        );
      }

      if (!loginId) {
        throw new Error(
          "Please enter a Teacher Login ID."
        );
      }

      if (
        /[^A-Z0-9._-]/.test(loginId)
      ) {
        throw new Error(
          "Login ID can contain only letters, numbers, dot, underscore and hyphen."
        );
      }

      if (!password) {
        throw new Error(
          "Please enter a password."
        );
      }

      if (password.length < 6) {
        throw new Error(
          "Password must contain at least 6 characters."
        );
      }

      if (!confirmPassword) {
        throw new Error(
          "Please confirm the password."
        );
      }

      if (
        password !== confirmPassword
      ) {
        throw new Error(
          "Passwords do not match. Please enter the same password in both fields."
        );
      }

      // -----------------------------
      // CHECK ADMIN SESSION
      // -----------------------------

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {
        throw new Error(
          "Your admin session has expired. Please login again."
        );
      }

      // -----------------------------
      // CALL SERVER API
      // -----------------------------

      const response =
        await fetch(
          "/api/admin/create-teacher",
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
              password,
            }),
          }
        );

      // Read safely instead of response.json()
      const responseText =
        await response.text();

      let result: any = {};

      try {
        result =
          responseText
            ? JSON.parse(responseText)
            : {};
      } catch {
        console.error(
          "Create teacher API returned non-JSON:",
          responseText
        );

        throw new Error(
          "Server returned an invalid response. Check app/api/admin/create-teacher/route.ts."
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            `Unable to create teacher. Server status: ${response.status}`
        );
      }

      // -----------------------------
      // SUCCESS
      // -----------------------------

      setTeacherName("");
      setTeacherLoginId("");
      setTeacherPassword("");
      setTeacherConfirmPassword("");

      setShowCreateTeacher(false);

      await loadAdminDashboard();

      setSuccessMessage(
        `Teacher created successfully. Login ID: ${loginId}`
      );
    } catch (error: any) {
      console.error(
        "Create teacher error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to create teacher."
      );
    } finally {
      setCreatingTeacher(false);
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
  // PAGE
  // =========================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">

          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              Admin Dashboard
            </p>
          </div>

          <div className="flex items-center gap-4">

            <span className="text-sm font-medium text-gray-700">
              {userName}
            </span>

            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </div>
      </header>

      {/* DASHBOARD */}

      <section className="mx-auto max-w-7xl px-8 py-8">

        {/* WELCOME */}

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, {userName}
          </h2>

          <p className="mt-2 text-gray-500">
            Manage your school communication
            skills platform.
          </p>
        </div>

        {/* MESSAGES */}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              ⚠️ {errorMessage}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-700">
              ✅ {successMessage}
            </p>
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid gap-6 md:grid-cols-4">

          <DashboardCard
            title="Students"
            value={
              loading
                ? "..."
                : String(studentCount)
            }
            description="Total students"
            icon="👨‍🎓"
          />

          <DashboardCard
            title="Teachers"
            value={
              loading
                ? "..."
                : String(teacherCount)
            }
            description="Total teachers"
            icon="👩‍🏫"
          />

          <DashboardCard
            title="Classes"
            value={
              loading
                ? "..."
                : String(classCount)
            }
            description="Total classes"
            icon="🏫"
          />

          <DashboardCard
            title="Lessons"
            value={
              loading
                ? "..."
                : String(lessonCount)
            }
            description="Total lessons"
            icon="📚"
          />

        </div>

        {/* MANAGEMENT */}

        <div className="mt-10">

          <h3 className="text-2xl font-bold text-gray-900">
            Management
          </h3>

          <div className="mt-5 grid gap-5 md:grid-cols-3">

            <ManagementCard
              title="Students"
              description="Add, view and manage students."
              href="/admin/students"
              icon="👨‍🎓"
            />

            {/* TEACHERS */}

            <ManagementCard
              title="Teachers"
              description="Create teacher login accounts, manage teachers and assign classes."
              href="/admin/teachers"
              icon="👩‍🏫"
              secondaryHref="/admin/teachers"
              secondaryLabel="+ Create Teacher"
            />

            <ManagementCard
              title="Classes"
              description="Create grades, sections and classes."
              href="/admin/classes"
              icon="🏫"
            />

            <ManagementCard
              title="Lessons"
              description="Manage communication skills lessons."
              href="/admin/lessons"
              icon="📚"
            />

            <ManagementCard
              title="Vocabulary"
              description="Manage lesson vocabulary."
              href="/admin/vocabulary"
              icon="📖"
            />

            <ManagementCard
              title="Reports"
              description="View student performance and attendance."
              href="/admin/reports"
              icon="📊"
            />

          </div>
        </div>

        {/* QUICK TEACHER ACTION */}

        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

            <div>
              <h3 className="text-lg font-bold text-gray-900">
                👩‍🏫 Teacher Accounts
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Create login IDs and passwords for teachers,
                then assign their grades and sections.
              </p>
            </div>

            <button
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
                setShowCreateTeacher(true);
              }}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
            >
              + Create Teacher
            </button>

          </div>
        </div>

        {/* REFRESH */}

        <div className="mt-8 flex justify-end">

          <button
            onClick={loadAdminDashboard}
            className="rounded-lg border bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ↻ Refresh Dashboard
          </button>

        </div>

      </section>

      {/* ========================================= */}
      {/* CREATE TEACHER MODAL */}
      {/* ========================================= */}

      {showCreateTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b p-6">

              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Create Teacher
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Create a login ID and password for a teacher.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!creatingTeacher) {
                    setShowCreateTeacher(false);
                    setErrorMessage("");
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>

            </div>

            {/* FORM */}

            <div className="space-y-5 p-6">

              {/* NAME */}

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Teacher Name
                </label>

                <input
                  type="text"
                  value={teacherName}
                  onChange={(event) =>
                    setTeacherName(
                      event.target.value
                    )
                  }
                  placeholder="Enter teacher name"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* LOGIN ID */}

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Teacher Login ID
                </label>

                <input
                  type="text"
                  value={teacherLoginId}
                  onChange={(event) =>
                    setTeacherLoginId(
                      event.target.value
                        .toUpperCase()
                        .replace(
                          /[^A-Z0-9._-]/g,
                          ""
                        )
                    )
                  }
                  placeholder="Example: TCH001"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Example: TCH001
                </p>
              </div>

              {/* PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Password
                </label>

                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(event) =>
                    setTeacherPassword(
                      event.target.value
                    )
                  }
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* CONFIRM PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={teacherConfirmPassword}
                  onChange={(event) =>
                    setTeacherConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter the same password again"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

            </div>

            {/* MODAL ERROR */}

            {errorMessage && (
              <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-700">
                  ⚠️ {errorMessage}
                </p>
              </div>
            )}

            {/* FOOTER */}

            <div className="flex flex-col-reverse gap-3 border-t p-6 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() => {
                  if (!creatingTeacher) {
                    setShowCreateTeacher(false);
                    setErrorMessage("");
                  }
                }}
                disabled={creatingTeacher}
                className="rounded-xl border px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createTeacher}
                disabled={creatingTeacher}
                className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingTeacher
                  ? "Creating..."
                  : "Create Teacher"}
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}

// =========================================
// DASHBOARD CARD
// =========================================

function DashboardCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
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

          <p className="mt-1 text-sm text-gray-500">
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

// =========================================
// MANAGEMENT CARD
// =========================================

function ManagementCard({
  title,
  description,
  href,
  icon,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md">

      <div className="flex items-start justify-between">

        <div>

          <h4 className="text-lg font-bold text-gray-900">
            {title}
          </h4>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {description}
          </p>

        </div>

        <div className="text-3xl">
          {icon}
        </div>

      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">

        <button
          type="button"
          onClick={() => {
            window.location.href =
              href;
          }}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          Open →
        </button>

        {secondaryHref &&
          secondaryLabel && (
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  secondaryHref;
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              {secondaryLabel}
            </button>
          )}

      </div>

    </div>
  );
}