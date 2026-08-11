"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Student = {
  id: string;
  name: string;
  student_id: string;
  grade: number | null;
  section: string | null;
  class_id: string | null;
};

type SchoolClass = {
  id: string;
  name: string;
  grade: number;
  section: string;
};

export default function AdminGradeDetailsPage() {
  const params = useParams();
  const gradeParam = params?.grade;

  const grade = Number(
    Array.isArray(gradeParam)
      ? gradeParam[0]
      : gradeParam
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] =
    useState("all");

  useEffect(() => {
    if (
      Number.isInteger(grade) &&
      grade >= 1 &&
      grade <= 10
    ) {
      loadGrade();
    } else {
      setErrorMessage("Invalid grade.");
      setLoading(false);
    }
  }, [grade]);

  async function loadGrade() {
    try {
      setLoading(true);
      setErrorMessage("");

      // =========================================
      // CHECK LOGIN
      // =========================================

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

      // =========================================
      // CHECK ADMIN
      // =========================================

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select("role")
          .eq(
            "id",
            authData.user.id
          )
          .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        await supabase.auth.signOut();

        window.location.href =
          "/login";

        return;
      }

      // =========================================
      // LOAD STUDENTS FOR THIS GRADE
      // =========================================

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
            section,
            class_id
          `)
          .eq("grade", grade)
          .order("name", {
            ascending: true,
          });

      if (studentError) {
        console.error(
          "Grade students error:",
          studentError
        );

        setErrorMessage(
          studentError.message ||
            "Unable to load students."
        );

        setLoading(false);
        return;
      }

      // =========================================
      // LOAD CLASSES FOR THIS GRADE
      // =========================================

      const {
        data: classData,
        error: classError,
      } =
        await supabase
          .from("classes")
          .select(`
            id,
            name,
            grade,
            section
          `)
          .eq("grade", grade)
          .order("section", {
            ascending: true,
          });

      if (classError) {
        console.error(
          "Grade classes error:",
          classError
        );

        setErrorMessage(
          classError.message ||
            "Unable to load classes."
        );

        setLoading(false);
        return;
      }

      setStudents(
        studentData || []
      );

      setClasses(
        classData || []
      );

      setLoading(false);
    } catch (error: any) {
      console.error(
        "Grade details error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load grade details."
      );

      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    window.location.href =
      "/login";
  }

  function openStudent(
    studentId: string
  ) {
    window.location.href =
      `/admin/students/${studentId}`;
  }

  const sections = useMemo(() => {
    const values = new Set<string>();

    students.forEach((student) => {
      if (student.section) {
        values.add(student.section);
      }
    });

    classes.forEach((item) => {
      if (item.section) {
        values.add(item.section);
      }
    });

    return Array.from(values).sort(
      (a, b) =>
        a.localeCompare(b)
    );
  }, [students, classes]);

  const filteredStudents =
    students.filter((student) => {
      const text =
        search
          .trim()
          .toLowerCase();

      const matchesSearch =
        !text ||
        student.name
          .toLowerCase()
          .includes(text) ||
        student.student_id
          .toLowerCase()
          .includes(text);

      const matchesSection =
        selectedSection === "all" ||
        student.section ===
          selectedSection;

      return (
        matchesSearch &&
        matchesSection
      );
    });

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">

          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              Admin • Grade {grade}
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() => {
                window.location.href =
                  "/admin";
              }}
              className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Dashboard
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

      {/* ================================= */}
      {/* CONTENT */}
      {/* ================================= */}

      <section className="mx-auto max-w-7xl px-8 py-8">

        {/* TITLE */}

        <div className="mb-8">

          <div className="flex items-center gap-3">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
              🎓
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Grade {grade}
              </h2>

              <p className="mt-1 text-gray-500">
                View teachers, classes and students for this grade.
              </p>
            </div>

          </div>

        </div>

        {/* ERROR */}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-medium text-red-700">
              ⚠️ {errorMessage}
            </p>
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid gap-5 md:grid-cols-3">

          <SummaryCard
            icon="👨‍🎓"
            title="Students"
            value={
              loading
                ? "..."
                : String(
                    students.length
                  )
            }
            description="Students in this grade"
          />

          <SummaryCard
            icon="🏫"
            title="Classes"
            value={
              loading
                ? "..."
                : String(
                    classes.length
                  )
            }
            description="Classes / sections"
          />

          <SummaryCard
            icon="👩‍🏫"
            title="Teachers"
            value="—"
            description="Teacher assignment will be connected next"
          />

        </div>

        {/* TEACHERS */}

        <section className="mt-8 rounded-2xl border bg-white p-7 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-xl font-bold text-gray-900">
                👩‍🏫 Assigned Teachers
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Teachers assigned to Grade {grade} will appear here.
              </p>
            </div>

            <span className="rounded-full bg-yellow-50 px-4 py-2 text-xs font-bold text-yellow-700">
              Assignment pending
            </span>

          </div>

          <div className="mt-5 rounded-xl border border-dashed bg-slate-50 p-7 text-center">

            <div className="text-4xl">
              👩‍🏫
            </div>

            <p className="mt-3 font-semibold text-gray-800">
              No teacher assignment is connected yet.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              We will connect teachers to grades and sections in the next step.
            </p>

            <button
              onClick={() => {
                window.location.href =
                  "/admin/teachers";
              }}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
            >
              Manage Teachers →
            </button>

          </div>

        </section>

        {/* CLASSES */}

        <section className="mt-8 rounded-2xl border bg-white p-7 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-xl font-bold text-gray-900">
                🏫 Classes & Sections
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Sections currently available for Grade {grade}.
              </p>
            </div>

            <button
              onClick={() => {
                window.location.href =
                  "/admin/classes";
              }}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Manage Classes
            </button>

          </div>

          {classes.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed bg-slate-50 p-7 text-center">

              <div className="text-4xl">
                🏫
              </div>

              <p className="mt-3 font-semibold text-gray-800">
                No classes created for Grade {grade}.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Create a class or section to organize students.
              </p>

            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {classes.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border bg-slate-50 p-5"
                >

                  <div className="flex items-center justify-between">

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg">
                      🏫
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      Section {item.section}
                    </span>

                  </div>

                  <h4 className="mt-4 font-bold text-gray-900">
                    {item.name}
                  </h4>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* STUDENTS */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-7">

            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  👨‍🎓 Students
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {students.length} students in Grade {grade}.
                </p>
              </div>

              <button
                onClick={() => {
                  window.location.href =
                    "/admin/students";
                }}
                className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Manage All Students →
              </button>

            </div>

            {/* FILTERS */}

            <div className="mt-5 flex flex-col gap-3 md:flex-row">

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search student name or ID..."
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500 md:max-w-md"
              />

              <select
                value={selectedSection}
                onChange={(event) =>
                  setSelectedSection(
                    event.target.value
                  )
                }
                className="rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="all">
                  All Sections
                </option>

                {sections.map(
                  (section) => (
                    <option
                      key={section}
                      value={section}
                    >
                      Section {section}
                    </option>
                  )
                )}
              </select>

              <button
                onClick={loadGrade}
                className="rounded-xl border bg-gray-50 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100"
              >
                ↻ Refresh
              </button>

            </div>

          </div>

          {/* TABLE */}

          {loading ? (
            <div className="p-12 text-center">

              <div className="text-4xl">
                ⏳
              </div>

              <p className="mt-3 text-gray-500">
                Loading Grade {grade}...
              </p>

            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center">

              <div className="text-5xl">
                👨‍🎓
              </div>

              <h4 className="mt-4 text-lg font-bold text-gray-900">
                No students found
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                No students match the selected filters.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead className="bg-slate-50">

                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500">

                    <th className="px-7 py-4">
                      Student
                    </th>

                    <th className="px-7 py-4">
                      Student ID
                    </th>

                    <th className="px-7 py-4">
                      Section
                    </th>

                    <th className="px-7 py-4">
                      Class
                    </th>

                    <th className="px-7 py-4 text-right">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredStudents.map(
                    (student) => {

                      const classInfo =
                        classes.find(
                          (item) =>
                            item.id ===
                            student.class_id
                        );

                      return (
                        <tr
                          key={student.id}
                          className="border-t hover:bg-slate-50"
                        >

                          <td className="px-7 py-5">

                            <div className="flex items-center gap-3">

                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl">
                                👨‍🎓
                              </div>

                              <div>

                                <p className="font-bold text-gray-900">
                                  {student.name}
                                </p>

                                <p className="text-xs text-gray-500">
                                  Grade {student.grade}
                                </p>

                              </div>

                            </div>

                          </td>

                          <td className="px-7 py-5 text-sm font-medium text-gray-600">
                            {student.student_id}
                          </td>

                          <td className="px-7 py-5">

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              {student.section
                                ? `Section ${student.section}`
                                : "Not assigned"}
                            </span>

                          </td>

                          <td className="px-7 py-5 text-sm text-gray-600">
                            {classInfo?.name ||
                              "Not assigned"}
                          </td>

                          <td className="px-7 py-5 text-right">

                            <button
                              onClick={() =>
                                openStudent(
                                  student.id
                                )
                              }
                              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                            >
                              View Student →
                            </button>

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

        {/* FOOTER NAVIGATION */}

        <div className="mt-8 flex flex-wrap gap-3">

          <button
            onClick={() => {
              window.location.href =
                "/admin";
            }}
            className="rounded-lg border bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Admin Dashboard
          </button>

          <button
            onClick={() => {
              window.location.href =
                "/admin/students";
            }}
            className="rounded-lg border bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            All Students
          </button>

          <button
            onClick={() => {
              window.location.href =
                "/admin/teachers";
            }}
            className="rounded-lg border bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Teachers
          </button>

        </div>

      </section>

    </main>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  description,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
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