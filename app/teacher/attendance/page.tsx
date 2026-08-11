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
  class_id: string | null;
};

type SchoolClass = {
  id: string;
  name: string | null;
  grade: number;
  section: string;
};

type Assignment = {
  class_id: string;
};

type AttendanceStatus = "present" | "absent";
type AttendanceMap = Record<string, AttendanceStatus>;

export default function TeacherAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedClasses, setAssignedClasses] =
    useState<SchoolClass[]>([]);
  const [attendance, setAttendance] =
    useState<AttendanceMap>({});

  const [selectedClass, setSelectedClass] =
    useState("all");

  const [selectedDate, setSelectedDate] =
    useState(
      new Date().toISOString().split("T")[0]
    );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadTeacherAttendance();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      loadAttendance();
    } else {
      setAttendance({});
    }
  }, [students, selectedDate]);

  async function loadTeacherAttendance() {
    try {
      setLoading(true);
      setErrorMessage("");
      setMessage("");

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", authData.user.id)
          .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "teacher"
      ) {
        setErrorMessage(
          "You do not have teacher access."
        );
        setLoading(false);
        return;
      }

      // ------------------------------------------------
      // GET ONLY THIS TEACHER'S ACTIVE ASSIGNMENTS
      // ------------------------------------------------

      const {
        data: assignmentData,
        error: assignmentError,
      } = await supabase
        .from("teacher_class_assignments")
        .select("class_id")
        .eq(
          "teacher_profile_id",
          authData.user.id
        )
        .eq("active", true);

      if (assignmentError) {
        throw assignmentError;
      }

      const assignments =
        (assignmentData || []) as Assignment[];

      const classIds = [
        ...new Set(
          assignments.map(
            (item) => item.class_id
          )
        ),
      ];

      if (classIds.length === 0) {
        setAssignedClasses([]);
        setStudents([]);
        setLoading(false);
        return;
      }

      // ------------------------------------------------
      // GET ONLY ASSIGNED CLASSES
      // ------------------------------------------------

      const {
        data: classData,
        error: classError,
      } = await supabase
        .from("classes")
        .select(
          "id, name, grade, section"
        )
        .in("id", classIds)
        .order("grade", {
          ascending: true,
        })
        .order("section", {
          ascending: true,
        });

      if (classError) {
        throw classError;
      }

      const classes =
        (classData || []) as SchoolClass[];

      setAssignedClasses(classes);

      // ------------------------------------------------
      // GET ONLY STUDENTS FROM ASSIGNED CLASSES
      // ------------------------------------------------

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
          class_id
        `)
        .in("class_id", classIds)
        .order("name", {
          ascending: true,
        });

      if (studentError) {
        throw studentError;
      }

      setStudents(
        (studentData || []) as Student[]
      );

      setLoading(false);
    } catch (error: any) {
      console.error(
        "Teacher attendance error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load attendance."
      );

      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    if (selectedClass === "all") {
      return students;
    }

    return students.filter(
      (student) =>
        student.class_id === selectedClass
    );
  }, [students, selectedClass]);

  async function loadAttendance() {
    if (students.length === 0) return;

    const defaultMap: AttendanceMap = {};

    students.forEach((student) => {
      defaultMap[student.id] = "present";
    });

    setAttendance(defaultMap);

    const {
      data,
      error,
    } = await supabase
      .from("attendance")
      .select(`
        id,
        student_id,
        attendance_date,
        status
      `)
      .eq(
        "attendance_date",
        selectedDate
      );

    if (error) {
      console.warn(
        "Could not read saved attendance:",
        error
      );
      return;
    }

    const updatedMap = {
      ...defaultMap,
    };

    data?.forEach((record) => {
      if (
        students.some(
          (student) =>
            student.id ===
            record.student_id
        ) &&
        (
          record.status === "present" ||
          record.status === "absent"
        )
      ) {
        updatedMap[
          record.student_id
        ] = record.status;
      }
    });

    setAttendance(updatedMap);
  }

  function setStudentAttendance(
    studentId: string,
    status: AttendanceStatus
  ) {
    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  }

  function markAllPresent() {
    setAttendance((previous) => {
      const updated = { ...previous };

      filteredStudents.forEach(
        (student) => {
          updated[student.id] = "present";
        }
      );

      return updated;
    });
  }

  function markAllAbsent() {
    setAttendance((previous) => {
      const updated = { ...previous };

      filteredStudents.forEach(
        (student) => {
          updated[student.id] = "absent";
        }
      );

      return updated;
    });
  }

  async function saveAttendance() {
    try {
      setSaving(true);
      setErrorMessage("");
      setMessage("");

      if (filteredStudents.length === 0) {
        setErrorMessage(
          "No students are available for this assigned class."
        );
        setSaving(false);
        return;
      }

      for (const student of filteredStudents) {
        const status =
          attendance[student.id] ||
          "present";

        const {
          data: existing,
          error: existingError,
        } = await supabase
          .from("attendance")
          .select("id")
          .eq(
            "student_id",
            student.id
          )
          .eq(
            "attendance_date",
            selectedDate
          )
          .maybeSingle();

        if (existingError) {
          throw existingError;
        }

        if (existing) {
          const { error } =
            await supabase
              .from("attendance")
              .update({ status })
              .eq(
                "id",
                existing.id
              );

          if (error) throw error;
        } else {
          const { error } =
            await supabase
              .from("attendance")
              .insert({
                student_id:
                  student.id,
                attendance_date:
                  selectedDate,
                status,
              });

          if (error) throw error;
        }
      }

      setMessage(
        `Attendance saved successfully for ${filteredStudents.length} student${
          filteredStudents.length === 1
            ? ""
            : "s"
        }.`
      );
    } catch (error: any) {
      console.error(
        "Save attendance error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to save attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const presentCount =
    filteredStudents.filter(
      (student) =>
        attendance[student.id] ===
        "present"
    ).length;

  const absentCount =
    filteredStudents.filter(
      (student) =>
        attendance[student.id] ===
        "absent"
    ).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-6xl">⏳</div>
          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Loading attendance...
          </h2>
          <p className="mt-2 text-gray-500">
            Checking your assigned classes.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Communication Skills
            </h1>

            <p className="text-sm text-gray-500">
              Teacher Attendance
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                window.location.href =
                  "/teacher";
              }}
              className="rounded-lg bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              ← Dashboard
            </button>

            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-5 py-2 font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            📅 Attendance
          </h2>

          <p className="mt-2 text-gray-500">
            Mark attendance only for your assigned classes.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-700">
              ⚠️ {errorMessage}
            </p>
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="font-semibold text-green-700">
              ✅ {message}
            </p>
          </div>
        )}

        {assignedClasses.length === 0 ? (
          <section className="rounded-2xl border bg-white p-12 text-center shadow-sm">

            <div className="text-6xl">👩‍🏫</div>

            <h3 className="mt-5 text-2xl font-bold text-gray-900">
              No classes assigned
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-gray-500">
              You currently do not have any classes assigned by the administrator.
              Please contact your administrator.
            </p>

            <button
              onClick={() => {
                window.location.href =
                  "/teacher";
              }}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
            >
              ← Back to Dashboard
            </button>

          </section>
        ) : (
          <>
            {/* FILTERS */}

            <section className="rounded-2xl border bg-white p-7 shadow-sm">

              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Select Assigned Class
                  </label>

                  <select
                    value={selectedClass}
                    onChange={(event) =>
                      setSelectedClass(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                  >
                    <option value="all">
                      All Assigned Classes
                    </option>

                    {assignedClasses.map(
                      (classItem) => (
                        <option
                          key={classItem.id}
                          value={classItem.id}
                        >
                          Grade{" "}
                          {classItem.grade}{" "}
                          - Section{" "}
                          {classItem.section}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Attendance Date
                  </label>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) =>
                      setSelectedDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

              </div>

            </section>

            {/* SUMMARY */}

            <div className="mt-6 grid gap-5 md:grid-cols-3">

              <SummaryCard
                title="Students"
                value={
                  filteredStudents.length
                }
                icon="👨‍🎓"
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

            </div>

            {/* ATTENDANCE */}

            <section className="mt-8 rounded-2xl border bg-white shadow-sm">

              <div className="flex flex-col justify-between gap-4 border-b p-7 md:flex-row md:items-center">

                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Student Attendance
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {selectedDate}
                  </p>
                </div>

                {filteredStudents.length > 0 && (
                  <div className="flex flex-wrap gap-2">

                    <button
                      onClick={
                        markAllPresent
                      }
                      className="rounded-lg bg-green-100 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-200"
                    >
                      ✓ All Present
                    </button>

                    <button
                      onClick={
                        markAllAbsent
                      }
                      className="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200"
                    >
                      ✕ All Absent
                    </button>

                  </div>
                )}

              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl">
                    👨‍🎓
                  </div>

                  <h4 className="mt-5 text-xl font-bold text-gray-900">
                    No students found
                  </h4>

                  <p className="mt-2 text-gray-500">
                    No students belong to this assigned class.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full min-w-[900px]">

                    <thead>
                      <tr className="border-b bg-slate-50 text-left">

                        <th className="px-6 py-4 text-sm font-bold text-gray-500">
                          #
                        </th>

                        <th className="px-6 py-4 text-sm font-bold text-gray-500">
                          Student
                        </th>

                        <th className="px-6 py-4 text-sm font-bold text-gray-500">
                          Class
                        </th>

                        <th className="px-6 py-4 text-sm font-bold text-gray-500">
                          Student ID
                        </th>

                        <th className="px-6 py-4 text-sm font-bold text-gray-500">
                          Attendance
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {filteredStudents.map(
                        (student, index) => {

                          const status =
                            attendance[
                              student.id
                            ] || "present";

                          return (
                            <tr
                              key={student.id}
                              className="border-b last:border-0 hover:bg-slate-50"
                            >

                              <td className="px-6 py-5 font-semibold text-gray-500">
                                {index + 1}
                              </td>

                              <td className="px-6 py-5">
                                <p className="font-bold text-gray-900">
                                  {student.name}
                                </p>
                              </td>

                              <td className="px-6 py-5">
                                <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                                  Grade{" "}
                                  {student.grade}{" "}
                                  -{" "}
                                  {student.section}
                                </span>
                              </td>

                              <td className="px-6 py-5 font-semibold text-gray-700">
                                {student.student_id}
                              </td>

                              <td className="px-6 py-5">

                                <div className="flex gap-2">

                                  <button
                                    onClick={() =>
                                      setStudentAttendance(
                                        student.id,
                                        "present"
                                      )
                                    }
                                    className={`rounded-lg px-5 py-2 text-sm font-bold ${
                                      status ===
                                      "present"
                                        ? "bg-green-600 text-white"
                                        : "bg-green-100 text-green-700 hover:bg-green-200"
                                    }`}
                                  >
                                    ✓ Present
                                  </button>

                                  <button
                                    onClick={() =>
                                      setStudentAttendance(
                                        student.id,
                                        "absent"
                                      )
                                    }
                                    className={`rounded-lg px-5 py-2 text-sm font-bold ${
                                      status ===
                                      "absent"
                                        ? "bg-red-600 text-white"
                                        : "bg-red-100 text-red-700 hover:bg-red-200"
                                    }`}
                                  >
                                    ✕ Absent
                                  </button>

                                </div>

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>
              )}

              {filteredStudents.length > 0 && (
                <div className="flex justify-end border-t p-7">

                  <button
                    onClick={
                      saveAttendance
                    }
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-8 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "💾 Save Attendance"}
                  </button>

                </div>
              )}

            </section>
          </>
        )}

      </section>
    </main>
  );
}

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