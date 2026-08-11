"use client";

import { useEffect, useMemo, useState } from "react";
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
  student_id: string;
  attendance_date: string;
  status: "present" | "absent";
};

export default function AdminAttendance() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [attendance, setAttendance] =
    useState<AttendanceRecord[]>([]);

  const [selectedDate, setSelectedDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [selectedClass, setSelectedClass] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // =========================================
  // LOAD DATA
  // =========================================

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      // ---------------------------------------
      // STUDENTS
      // ---------------------------------------

      const {
        data: studentData,
        error: studentError,
      } =
        await supabase
          .from("students")
          .select(`
            id,
            name,
            student_id,
            grade,
            section
          `)
          .order("name", {
            ascending: true,
          });

      if (studentError) {
        throw studentError;
      }

      setStudents(
        studentData || []
      );

      // ---------------------------------------
      // ATTENDANCE
      // ---------------------------------------

      const {
        data: attendanceData,
        error: attendanceError,
      } =
        await supabase
          .from("attendance")
          .select(`
            student_id,
            attendance_date,
            status
          `)
          .eq(
            "attendance_date",
            selectedDate
          );

      if (attendanceError) {
        throw attendanceError;
      }

      setAttendance(
        attendanceData || []
      );

    } catch (error: any) {
      console.error(
        "Admin attendance error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load attendance."
      );

    } finally {
      setLoading(false);
    }
  }

  // =========================================
  // CLASS LIST
  // =========================================

  const classList =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            key: string;
            grade: number;
            section: string;
          }
        >();

      students.forEach(
        (student) => {
          const key =
            `${student.grade}-${student.section}`;

          if (!map.has(key)) {
            map.set(key, {
              key,
              grade:
                student.grade,
              section:
                student.section,
            });
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.grade - b.grade ||
          a.section.localeCompare(
            b.section
          )
      );
    }, [students]);

  // =========================================
  // FILTER STUDENTS
  // =========================================

  const filteredStudents =
    useMemo(() => {
      if (
        selectedClass ===
        "all"
      ) {
        return students;
      }

      return students.filter(
        (student) =>
          `${student.grade}-${student.section}` ===
          selectedClass
      );
    }, [
      students,
      selectedClass,
    ]);

  // =========================================
  // GET STATUS
  // =========================================

  function getStatus(
    studentId: string
  ) {
    const record =
      attendance.find(
        (item) =>
          item.student_id ===
          studentId
      );

    return (
      record?.status ||
      "not marked"
    );
  }

  // =========================================
  // COUNTS
  // =========================================

  const presentCount =
    filteredStudents.filter(
      (student) =>
        getStatus(
          student.id
        ) === "present"
    ).length;

  const absentCount =
    filteredStudents.filter(
      (student) =>
        getStatus(
          student.id
        ) === "absent"
    ).length;

  const notMarkedCount =
    filteredStudents.filter(
      (student) =>
        getStatus(
          student.id
        ) === "not marked"
    ).length;

  const totalCount =
    filteredStudents.length;

  const percentage =
    totalCount > 0
      ? Math.round(
          (presentCount /
            totalCount) *
            100
        )
      : 0;

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="text-6xl">
            ⏳
          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Loading attendance...
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
              Admin Attendance Report
            </p>

          </div>

          <button
            onClick={() =>
              (window.location.href =
                "/admin")
            }
            className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
          >
            ← Dashboard
          </button>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            📊 Attendance Report
          </h2>

          <p className="mt-2 text-gray-500">
            View student attendance by date and class.
          </p>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">

            <p className="font-semibold text-red-700">
              ⚠️ {errorMessage}
            </p>

          </div>
        )}

        {/* FILTERS */}

        <section className="rounded-2xl border bg-white p-7 shadow-sm">

          <div className="grid gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-bold text-gray-700">
                Attendance Date
              </label>

              <input
                type="date"
                value={
                  selectedDate
                }
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-bold text-gray-700">
                Select Class
              </label>

              <select
                value={
                  selectedClass
                }
                onChange={(event) =>
                  setSelectedClass(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >

                <option value="all">
                  All Classes
                </option>

                {classList.map(
                  (classItem) => (

                    <option
                      key={
                        classItem.key
                      }
                      value={
                        classItem.key
                      }
                    >
                      Grade{" "}
                      {
                        classItem.grade
                      }{" "}
                      -{" "}
                      {
                        classItem.section
                      }
                    </option>

                  )
                )}

              </select>

            </div>

          </div>

        </section>

        {/* SUMMARY */}

        <div className="mt-6 grid gap-5 md:grid-cols-4">

          <SummaryCard
            title="Total Students"
            value={
              totalCount
            }
            icon="👨‍🎓"
          />

          <SummaryCard
            title="Present"
            value={
              presentCount
            }
            icon="✅"
          />

          <SummaryCard
            title="Absent"
            value={
              absentCount
            }
            icon="❌"
          />

          <SummaryCard
            title="Attendance"
            value={`${percentage}%`}
            icon="📈"
          />

        </div>

        {/* REPORT */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-7">

            <h3 className="text-2xl font-bold text-gray-900">
              Attendance Details
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {selectedDate}
            </p>

          </div>

          {filteredStudents.length ===
          0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                👨‍🎓
              </div>

              <h4 className="mt-5 text-xl font-bold">
                No students found
              </h4>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px]">

                <thead>

                  <tr className="border-b bg-slate-50 text-left">

                    <th className="px-6 py-4 text-sm font-bold text-gray-500">
                      #
                    </th>

                    <th className="px-6 py-4 text-sm font-bold text-gray-500">
                      Student
                    </th>

                    <th className="px-6 py-4 text-sm font-bold text-gray-500">
                      Student ID
                    </th>

                    <th className="px-6 py-4 text-sm font-bold text-gray-500">
                      Class
                    </th>

                    <th className="px-6 py-4 text-sm font-bold text-gray-500">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredStudents.map(
                    (
                      student,
                      index
                    ) => {

                      const status =
                        getStatus(
                          student.id
                        );

                      return (

                        <tr
                          key={
                            student.id
                          }
                          className="border-b last:border-0 hover:bg-slate-50"
                        >

                          <td className="px-6 py-5 font-semibold text-gray-500">
                            {index + 1}
                          </td>

                          <td className="px-6 py-5 font-bold text-gray-900">
                            {
                              student.name
                            }
                          </td>

                          <td className="px-6 py-5 font-semibold text-gray-700">
                            {
                              student.student_id
                            }
                          </td>

                          <td className="px-6 py-5">

                            <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                              Grade{" "}
                              {
                                student.grade
                              }{" "}
                              -{" "}
                              {
                                student.section
                              }
                            </span>

                          </td>

                          <td className="px-6 py-5">

                            {status ===
                              "present" && (

                              <span className="rounded-lg bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                                ✓ Present
                              </span>

                            )}

                            {status ===
                              "absent" && (

                              <span className="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
                                ✕ Absent
                              </span>

                            )}

                            {status ===
                              "not marked" && (

                              <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-500">
                                Not Marked
                              </span>

                            )}

                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </section>

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