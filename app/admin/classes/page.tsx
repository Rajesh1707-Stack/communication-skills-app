"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type ClassData = {
  id: string;
  name: string;
  grade: number | null;
  section: string | null;
  school_id: string | null;
  teacher_id: string | null;
  created_at: string;
};

type Teacher = {
  id: string;
  name: string;
  email: string | null;
};

type Student = {
  id: string;
  name: string;
  student_id: string;
  class_id: string | null;
};

export default function ClassesPage() {
  const [classes, setClasses] =
    useState<ClassData[]>([]);

  const [teachers, setTeachers] =
    useState<Teacher[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadClasses();
  }, []);

  // =========================================
  // LOAD CLASSES
  // =========================================

  async function loadClasses() {
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
      // GET TEACHERS
      // =========================================

      const teacherIds =
        loadedClasses
          .map(
            (item) => item.teacher_id
          )
          .filter(
            (id): id is string =>
              Boolean(id)
          );

      if (teacherIds.length > 0) {
        const {
          data: teacherData,
          error: teacherError,
        } = await supabase
          .from("teachers")
          .select(`
            id,
            name,
            email
          `)
          .in("id", teacherIds);

        if (teacherError) {
          console.error(
            "Teacher loading error:",
            teacherError
          );
        }

        setTeachers(
          teacherData || []
        );
      } else {
        setTeachers([]);
      }

      // =========================================
      // GET STUDENTS
      // =========================================

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(`
          id,
          name,
          student_id,
          class_id
        `);

      if (studentError) {
        console.error(
          "Student loading error:",
          studentError
        );
      }

      setStudents(
        studentData || []
      );

      setLoading(false);

    } catch (error) {
      console.error(
        "Classes page error:",
        error
      );

      setErrorMessage(
        "Unable to load classes."
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
  // TEACHER NAME
  // =========================================

  function getTeacherName(
    teacherId: string | null
  ) {
    if (!teacherId) {
      return "Not assigned";
    }

    const teacher =
      teachers.find(
        (item) =>
          item.id === teacherId
      );

    return teacher
      ? teacher.name
      : "Unknown teacher";
  }

  // =========================================
  // STUDENT COUNT
  // =========================================

  function getStudentCount(
    classId: string
  ) {
    return students.filter(
      (student) =>
        student.class_id === classId
    ).length;
  }

  // =========================================
  // SEARCH
  // =========================================

  const filteredClasses =
    classes.filter((item) => {
      const teacherName =
        getTeacherName(
          item.teacher_id
        );

      const text =
        `${item.name} ${
          item.grade || ""
        } ${
          item.section || ""
        } ${teacherName}`.toLowerCase();

      return text.includes(
        search.toLowerCase()
      );
    });

  // =========================================
  // TOTAL STUDENTS
  // =========================================

  const totalStudents =
    students.length;

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-7xl px-6 py-20 text-center">

          <div className="text-6xl">
            ⏳
          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Loading classes...
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
              Class Management
            </p>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                (window.location.href =
                  "/admin")
              }
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

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-8">

        {/* TITLE */}

        <div className="mb-8">

          <h2 className="text-3xl font-bold text-gray-900">
            🏫 Classes
          </h2>

          <p className="mt-2 text-gray-500">
            View and manage grades, sections,
            teachers and students.
          </p>

        </div>

        {/* ERROR */}

        {errorMessage && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">

            <p className="font-medium text-red-700">
              ⚠️ {errorMessage}
            </p>

          </div>

        )}

        {/* STATISTICS */}

        <div className="grid gap-5 md:grid-cols-3">

          <StatCard
            title="Total Classes"
            value={classes.length}
            description="Grade and section combinations"
            icon="🏫"
          />

          <StatCard
            title="Total Students"
            value={totalStudents}
            description="Students across classes"
            icon="👨‍🎓"
          />

          <StatCard
            title="Assigned Teachers"
            value={
              classes.filter(
                (item) =>
                  item.teacher_id
              ).length
            }
            description="Classes with teachers"
            icon="👩‍🏫"
          />

        </div>

        {/* CLASS LIST */}

        <section className="mt-8 rounded-2xl border bg-white shadow-sm">

          {/* LIST HEADER */}

          <div className="border-b p-6">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div>

                <h3 className="text-xl font-bold text-gray-900">
                  Class List
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredClasses.length}{" "}
                  {filteredClasses.length === 1
                    ? "class"
                    : "classes"}{" "}
                  found
                </p>

              </div>

              {/* SEARCH */}

              <div className="relative">

                <span className="absolute left-4 top-1/2 -translate-y-1/2">
                  🔍
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search classes..."
                  className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-80"
                />

              </div>

            </div>

          </div>

          {/* EMPTY */}

          {filteredClasses.length === 0 ? (

            <div className="p-12 text-center">

              <div className="text-6xl">
                🏫
              </div>

              <h4 className="mt-5 text-xl font-bold text-gray-900">
                No classes found
              </h4>

              <p className="mt-2 text-gray-500">
                {search
                  ? "Try a different search."
                  : "No classes have been created yet."}
              </p>

            </div>

          ) : (

            /* TABLE */

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      Class
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      Grade
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      Section
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      Teacher
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      Students
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {filteredClasses.map(
                    (classItem) => {

                      const studentCount =
                        getStudentCount(
                          classItem.id
                        );

                      const teacherName =
                        getTeacherName(
                          classItem.teacher_id
                        );

                      return (
                        <tr
                          key={
                            classItem.id
                          }
                          className="hover:bg-slate-50"
                        >

                          {/* CLASS */}

                          <td className="px-6 py-5">

                            <div className="flex items-center gap-3">

                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-xl">
                                🏫
                              </div>

                              <div>

                                <p className="font-bold text-gray-900">
                                  {
                                    classItem.name
                                  }
                                </p>

                                <p className="text-xs text-gray-500">
                                  Class ID:{" "}
                                  {classItem.id.slice(
                                    0,
                                    8
                                  )}
                                  ...
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* GRADE */}

                          <td className="px-6 py-5">

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              {classItem.grade
                                ? `Grade ${classItem.grade}`
                                : "-"}
                            </span>

                          </td>

                          {/* SECTION */}

                          <td className="px-6 py-5">

                            <span className="font-semibold text-gray-800">
                              {classItem.section ||
                                "-"}
                            </span>

                          </td>

                          {/* TEACHER */}

                          <td className="px-6 py-5">

                            <div className="flex items-center gap-2">

                              <span>
                                👩‍🏫
                              </span>

                              <span
                                className={
                                  classItem.teacher_id
                                    ? "font-medium text-gray-900"
                                    : "text-gray-400"
                                }
                              >
                                {
                                  teacherName
                                }
                              </span>

                            </div>

                          </td>

                          {/* STUDENTS */}

                          <td className="px-6 py-5">

                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                              {studentCount}{" "}
                              {studentCount ===
                              1
                                ? "Student"
                                : "Students"}
                            </span>

                          </td>

                          {/* ACTION */}

                          <td className="px-6 py-5 text-right">

                            <button
                              onClick={() =>
                                (window.location.href =
                                  `/admin/classes/${classItem.id}`)
                              }
                              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                              View
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

        {/* REFRESH */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={loadClasses}
            className="rounded-lg border bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ↻ Refresh
          </button>

        </div>

      </section>

    </main>
  );
}

// =========================================
// STAT CARD
// =========================================

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
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

          <p className="mt-2 text-xs text-gray-500">
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