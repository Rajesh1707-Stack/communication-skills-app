"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Student = {
  id: string;
  name: string;
  student_id: string;
  grade: number;
  section: string;
};

type AttendanceRecord = {
  id: string;
  attendance_date: string;
  status: string;
  created_at: string;
};

export default function StudentAttendancePage() {
  const [student, setStudent] =
    useState<Student | null>(null);

  const [attendance, setAttendance] =
    useState<AttendanceRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadAttendance();
  }, []);

  async function loadAttendance() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =====================================
      // CHECK LOGIN
      // =====================================

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        window.location.href =
          "/login";
        return;
      }

      // =====================================
      // FIND LOGGED-IN STUDENT
      // =====================================

      const {
        data: studentData,
        error: studentError,
      } =
        await supabase
          .from("students")
          .select(
            `
            id,
            name,
            student_id,
            grade,
            section
            `
          )
          .eq(
            "auth_user_id",
            authData.user.id
          )
          .single();

      if (
        studentError ||
        !studentData
      ) {
        console.error(
          "Student lookup error:",
          studentError
        );

        setErrorMessage(
          "Student account could not be found."
        );

        setLoading(false);
        return;
      }

      setStudent(
        studentData
      );

      // =====================================
      // LOAD ATTENDANCE
      // =====================================

      const {
        data: attendanceData,
        error: attendanceError,
      } =
        await supabase
          .from("attendance")
          .select(
            `
            id,
            attendance_date,
            status,
            created_at
            `
          )
          .eq(
            "student_id",
            studentData.id
          )
          .order(
            "attendance_date",
            {
              ascending: false,
            }
          );

      if (attendanceError) {
        console.error(
          "Attendance loading error:",
          attendanceError
        );

        setErrorMessage(
          attendanceError.message
        );

        setLoading(false);
        return;
      }

      setAttendance(
        attendanceData || []
      );

      setLoading(false);

    } catch (error: any) {
      console.error(
        "Student attendance error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load attendance."
      );

      setLoading(false);
    }
  }

  // =====================================
  // COUNTS
  // =====================================

  const presentCount =
    attendance.filter(
      (item) =>
        item.status?.toLowerCase() ===
        "present"
    ).length;

  const absentCount =
    attendance.filter(
      (item) =>
        item.status?.toLowerCase() ===
        "absent"
    ).length;

  const totalDays =
    presentCount +
    absentCount;

  const attendancePercentage =
    totalDays > 0
      ? Math.round(
          (presentCount /
            totalDays) *
            100
        )
      : 0;

  // =====================================
  // DATE FORMAT
  // =====================================

  function formatDate(
    date: string
  ) {
    const parts =
      date.split("-");

    if (
      parts.length === 3
    ) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return date;
  }

  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="flex min-h-screen items-center justify-center">

          <div className="text-center">

            <div className="text-5xl">
              📅
            </div>

            <p className="mt-4 font-semibold text-gray-600">
              Loading attendance...
            </p>

          </div>

        </div>

      </main>
    );
  }

  // =====================================
  // ERROR
  // =====================================

  if (!student) {
    return (
      <main className="min-h-screen bg-slate-50">

        <section className="mx-auto max-w-4xl px-6 py-16">

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">

            <h2 className="text-xl font-bold text-red-700">
              ⚠️ Unable to load attendance
            </h2>

            <p className="mt-3 text-red-600">
              {errorMessage}
            </p>

            <button
              onClick={
                loadAttendance
              }
              className="mt-6 rounded-lg bg-red-600 px-5 py-2 font-bold text-white hover:bg-red-700"
            >
              Try Again
            </button>

          </div>

        </section>

      </main>
    );
  }

  // =====================================
  // PAGE
  // =====================================

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
              My Attendance
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
              onClick={
                loadAttendance
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

        {/* STUDENT */}

        <div className="rounded-2xl border bg-white p-7 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-semibold text-blue-600">
                Student
              </p>

              <h2 className="mt-1 text-3xl font-bold text-gray-900">
                {student.name}
              </h2>

              <p className="mt-2 text-gray-500">
                ID: {student.student_id}
                {" • "}
                Grade {student.grade}
                {" • "}
                Section {student.section}
              </p>

            </div>

            <div className="text-5xl">
              🎓
            </div>

          </div>

        </div>

        {/* SUMMARY */}

        <div className="mt-6 grid gap-5 md:grid-cols-4">

          <SummaryCard
            title="Attendance"
            value={`${attendancePercentage}%`}
            icon="📅"
          />

          <SummaryCard
            title="Present"
            value={presentCount}
            icon="✅"
          />

          <SummaryCard
            title="Absent"
            value={absentCount}
            icon="❌"
          />

          <SummaryCard
            title="Total Days"
            value={totalDays}
            icon="📊"
          />

        </div>

        {/* PROGRESS */}

        <section className="mt-6 rounded-2xl border bg-white p-7 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-xl font-bold text-gray-900">
                Attendance Percentage
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Your overall attendance
              </p>

            </div>

            <span className="text-3xl font-bold text-blue-600">
              {attendancePercentage}%
            </span>

          </div>

          <div className="mt-5 h-4 overflow-hidden rounded-full bg-gray-200">

            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${attendancePercentage}%`,
              }}
            />

          </div>

          <div className="mt-3 flex justify-between text-sm text-gray-500">

            <span>
              {presentCount} present
            </span>

            <span>
              {absentCount} absent
            </span>

          </div>

        </section>

        {/* HISTORY */}

        <section className="mt-6 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-7">

            <h3 className="text-2xl font-bold text-gray-900">
              📅 Attendance History
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Your daily attendance records
            </p>

          </div>

          {attendance.length ===
          0 ? (

            <div className="p-12 text-center">

              <div className="text-5xl">
                📅
              </div>

              <h4 className="mt-4 text-xl font-bold text-gray-900">
                No attendance records
              </h4>

              <p className="mt-2 text-gray-500">
                Your attendance records will appear here.
              </p>

            </div>

          ) : (

            <div className="divide-y">

              {attendance.map(
                (record) => {

                  const isPresent =
                    record.status?.toLowerCase() ===
                    "present";

                  return (
                    <div
                      key={
                        record.id
                      }
                      className="flex items-center justify-between px-7 py-5"
                    >

                      <div>

                        <p className="font-bold text-gray-900">
                          {formatDate(
                            record.attendance_date
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Attendance record
                        </p>

                      </div>

                      <span
                        className={`rounded-full px-5 py-2 text-sm font-bold ${
                          isPresent
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isPresent
                          ? "✓ Present"
                          : "✕ Absent"}
                      </span>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* BACK */}

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

// =====================================
// SUMMARY CARD
// =====================================

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-semibold text-gray-500">
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