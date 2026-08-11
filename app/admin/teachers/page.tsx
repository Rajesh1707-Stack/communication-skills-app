"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Teacher = {
  id: string;
  full_name: string | null;
};

type SchoolClass = {
  id: string;
  name: string | null;
  grade: number;
  section: string;
};

type Assignment = {
  id: string;
  teacher_profile_id: string;
  class_id: string;
  active: boolean;
};

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedTeacher, setSelectedTeacher] =
    useState<Teacher | null>(null);

  const [selectedClassIds, setSelectedClassIds] =
    useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // CREATE TEACHER
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
    loadTeacherManagement();
  }, []);

  async function loadTeacherManagement() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", authData.user.id)
        .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        window.location.href = "/login";
        return;
      }

      const {
        data: teacherData,
        error: teacherError,
      } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "teacher")
        .order("full_name", {
          ascending: true,
        });

      if (teacherError) {
        throw teacherError;
      }

      const {
        data: classData,
        error: classError,
      } = await supabase
        .from("classes")
        .select("id, name, grade, section")
        .order("grade", {
          ascending: true,
        })
        .order("section", {
          ascending: true,
        });

      if (classError) {
        throw classError;
      }

      const {
        data: assignmentData,
        error: assignmentError,
      } = await supabase
        .from("teacher_class_assignments")
        .select(
          "id, teacher_profile_id, class_id, active"
        );

      if (assignmentError) {
        throw assignmentError;
      }

      setTeachers(
        (teacherData || []) as Teacher[]
      );

      setClasses(
        (classData || []) as SchoolClass[]
      );

      setAssignments(
        (assignmentData || []) as Assignment[]
      );
    } catch (error: any) {
      console.error(
        "Load teacher management error:",
        error
      );

      setErrorMessage(
        getSupabaseErrorMessage(
          error,
          "Unable to load teacher management."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function openTeacher(teacher: Teacher) {
    const currentAssignments =
      assignments
        .filter(
          (assignment) =>
            assignment.teacher_profile_id ===
              teacher.id &&
            assignment.active
        )
        .map(
          (assignment) =>
            assignment.class_id
        );

    setSelectedTeacher(teacher);
    setSelectedClassIds(currentAssignments);
    setGradeFilter("all");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeTeacher() {
    if (saving) return;

    setSelectedTeacher(null);
    setSelectedClassIds([]);
    setErrorMessage("");
  }

  function toggleClass(classId: string) {
    setSelectedClassIds((current) => {
      if (current.includes(classId)) {
        return current.filter(
          (id) => id !== classId
        );
      }

      return [...current, classId];
    });
  }
  async function saveAssignments() {
    if (!selectedTeacher) {
      setErrorMessage(
        "Please select a teacher first."
      );
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const teacherId =
        selectedTeacher.id;

      /*
       * IMPORTANT:
       * Read ALL existing assignments, including
       * inactive ones. This prevents duplicate rows
       * when an old assignment is re-enabled.
       */
      const {
        data: existingData,
        error: existingError,
      } = await supabase
        .from("teacher_class_assignments")
        .select(
          "id, teacher_profile_id, class_id, active"
        )
        .eq(
          "teacher_profile_id",
          teacherId
        );

      if (existingError) {
        throw existingError;
      }

      const existingAssignments =
        (existingData || []) as Assignment[];

      /*
       * ACTIVATE / CREATE SELECTED CLASSES
       */
      for (const classId of selectedClassIds) {
        const existing =
          existingAssignments.find(
            (assignment) =>
              assignment.class_id ===
              classId
          );

        if (existing) {
          const {
            error: updateError,
          } = await supabase
            .from(
              "teacher_class_assignments"
            )
            .update({
              active: true,
            })
            .eq("id", existing.id);

          if (updateError) {
            throw updateError;
          }
        } else {
          const {
            error: insertError,
          } = await supabase
            .from(
              "teacher_class_assignments"
            )
            .insert({
              teacher_profile_id:
                teacherId,
              class_id: classId,
              active: true,
            });

          if (insertError) {
            throw insertError;
          }
        }
      }

      /*
       * DEACTIVATE CLASSES THAT WERE UNCHECKED
       */
      for (const existing of existingAssignments) {
        if (
          existing.active &&
          !selectedClassIds.includes(
            existing.class_id
          )
        ) {
          const {
            error: deactivateError,
          } = await supabase
            .from(
              "teacher_class_assignments"
            )
            .update({
              active: false,
            })
            .eq("id", existing.id);

          if (deactivateError) {
            throw deactivateError;
          }
        }
      }

      /*
       * Reload from database so the UI always
       * reflects the actual saved state.
       */
      await loadTeacherManagement();

      const refreshedTeacher =
        teachers.find(
          (teacher) =>
            teacher.id === teacherId
        ) || selectedTeacher;

      const {
        data: refreshedAssignments,
        error: refreshedError,
      } = await supabase
        .from("teacher_class_assignments")
        .select(
          "id, teacher_profile_id, class_id, active"
        )
        .eq(
          "teacher_profile_id",
          teacherId
        )
        .eq("active", true);

      if (refreshedError) {
        throw refreshedError;
      }

      setSelectedTeacher(
        refreshedTeacher
      );

      setSelectedClassIds(
        (refreshedAssignments || []).map(
          (assignment) =>
            assignment.class_id
        )
      );

      setSuccessMessage(
        "Teacher access saved successfully."
      );
    } catch (error: any) {
      console.error(
        "Save teacher assignment error:",
        error
      );

      setErrorMessage(
        getSupabaseErrorMessage(
          error,
          "Unable to save teacher access."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================
  // CREATE TEACHER ACCOUNT
  // =========================================

  async function createTeacher() {
    try {
      setCreatingTeacher(true);
      setErrorMessage("");
      setSuccessMessage("");

      const name = teacherName.trim();
      const loginId =
        teacherLoginId.trim().toLowerCase();
      const password = teacherPassword;
      const confirmPassword =
        teacherConfirmPassword;

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
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          loginId
        )
      ) {
        throw new Error(
          "Teacher Login ID must be a valid email address."
        );
      }

      if (password.length < 6) {
        throw new Error(
          "Password must contain at least 6 characters."
        );
      }

      if (password !== confirmPassword) {
        throw new Error(
          "Passwords do not match."
        );
      }

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {
        throw new Error(
          "Your admin session has expired. Please login again."
        );
      }

      const response = await fetch(
        "/api/admin/create-teacher",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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

      const responseText =
        await response.text();

      let result: any = {};

      try {
        result = responseText
          ? JSON.parse(responseText)
          : {};
      } catch (parseError) {
        console.error(
          "Create teacher API returned non-JSON response:",
          responseText
        );

        throw new Error(
          "Server returned an invalid response. Please check app/api/admin/create-teacher/route.ts."
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            `Unable to create teacher. Server status: ${response.status}`
        );
      }

      setTeacherName("");
      setTeacherLoginId("");
      setTeacherPassword("");
      setTeacherConfirmPassword("");
      setShowCreateTeacher(false);

      await loadTeacherManagement();

      setSuccessMessage(
        `Teacher account updated/created successfully. Login ID: ${loginId}`
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

  const filteredTeachers = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return teachers;
    }

    return teachers.filter((teacher) =>
      (teacher.full_name || "")
        .toLowerCase()
        .includes(query)
    );
  }, [teachers, search]);

  const filteredClasses = useMemo(() => {
    if (gradeFilter === "all") {
      return classes;
    }

    return classes.filter(
      (classItem) =>
        String(classItem.grade) ===
        gradeFilter
    );
  }, [classes, gradeFilter]);

  const activeAssignments =
    assignments.filter(
      (assignment) =>
        assignment.active
    );

  const assignedTeacherCount =
    new Set(
      activeAssignments.map(
        (assignment) =>
          assignment.teacher_profile_id
      )
    ).size;

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-5xl">
              ⏳
            </div>
            <p className="mt-4 font-semibold text-gray-700">
              Loading teacher management...
            </p>
          </div>
        </div>
      </main>
    );
  }

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
              Admin • Teacher Management
            </p>
          </div>

          <div className="flex gap-3">

            <button
              onClick={() => {
                window.location.href =
                  "/admin";
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

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            👩‍🏫 Teacher Management
          </h2>

          <p className="mt-2 text-gray-500">
            Give teachers access and assign them to grades and sections.
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

        {/* SUCCESS */}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <p className="font-semibold text-green-700">
              ✅ {successMessage}
            </p>
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid gap-5 md:grid-cols-3">

          <SummaryCard
            icon="👩‍🏫"
            title="Teachers"
            value={teachers.length}
            description="Teacher accounts"
          />

          <SummaryCard
            icon="🔐"
            title="Assigned Teachers"
            value={assignedTeacherCount}
            description="Teachers with class access"
          />

          <SummaryCard
            icon="🏫"
            title="Active Assignments"
            value={activeAssignments.length}
            description="Teacher to class assignments"
          />

        </div>

        {/* TEACHERS */}

        <section className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="border-b p-7">

            <h3 className="text-xl font-bold text-gray-900">
              Teachers
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Select a teacher to manage their class access.
            </p>

            <div className="mt-5 flex flex-col gap-3 md:flex-row">

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search teacher..."
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              />

              <button
                onClick={loadTeacherManagement}
                className="rounded-xl border bg-gray-50 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100"
              >
                ↻ Refresh
              </button>

              <button
                onClick={() => {
                  setErrorMessage("");
                  setSuccessMessage("");
                  setShowCreateTeacher(true);
                }}
                className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
              >
                + Create Teacher
              </button>

            </div>
          </div>

          {filteredTeachers.length === 0 ? (
            <div className="p-12 text-center">

              <div className="text-5xl">
                👩‍🏫
              </div>

              <h4 className="mt-4 text-xl font-bold text-gray-900">
                No teachers found
              </h4>

              <p className="mt-2 text-gray-500">
                Create a teacher account first.
              </p>

            </div>
          ) : (
            <div className="divide-y">

              {filteredTeachers.map(
                (teacher) => {

                  const teacherAssignments =
                    activeAssignments.filter(
                      (assignment) =>
                        assignment.teacher_profile_id ===
                        teacher.id
                    );

                  return (
                    <div
                      key={teacher.id}
                      className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between"
                    >

                      <div className="flex items-center gap-4">

                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl">
                          👩‍🏫
                        </div>

                        <div>

                          <h4 className="font-bold text-gray-900">
                            {teacher.full_name ||
                              "Unnamed Teacher"}
                          </h4>

                          <p className="mt-1 text-xs text-gray-400">
                            {teacher.id}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">

                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                              ✓ Teacher Access
                            </span>

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              {teacherAssignments.length}{" "}
                              {teacherAssignments.length === 1
                                ? "Class"
                                : "Classes"}
                            </span>

                          </div>

                        </div>
                      </div>

                      <div className="flex flex-col gap-3 lg:items-end">

                        {teacherAssignments.length ===
                        0 ? (
                          <span className="text-sm text-gray-400">
                            No class assigned
                          </span>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-2">

                            {teacherAssignments.map(
                              (assignment) => {

                                const classItem =
                                  classes.find(
                                    (item) =>
                                      item.id ===
                                      assignment.class_id
                                  );

                                return (
                                  <span
                                    key={
                                      assignment.id
                                    }
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-gray-700"
                                  >
                                    Grade{" "}
                                    {classItem?.grade ??
                                      "?"}{" "}
                                    • Section{" "}
                                    {classItem?.section ??
                                      "?"}
                                  </span>
                                );
                              }
                            )}

                          </div>
                        )}

                        <button
                          onClick={() =>
                            openTeacher(
                              teacher
                            )
                          }
                          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                        >
                          Manage Access →
                        </button>

                      </div>
                    </div>
                  );
                }
              )}

            </div>
          )}
        </section>
      </section>

      {/* CREATE TEACHER MODAL */}

      {showCreateTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Create Teacher
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Create an email Login ID and password for a teacher.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!creatingTeacher) {
                    setShowCreateTeacher(false);
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">

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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Teacher Login ID
                </label>

                <input
                  type="email"
                  value={teacherLoginId}
                  onChange={(event) =>
                    setTeacherLoginId(
                      event.target.value.toLowerCase()
                    )
                  }
                  placeholder="teacher@gmail.com"
                  autoComplete="username"
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Enter the teacher's email address. This will be used as the Login ID.
                </p>
              </div>

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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

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
                  placeholder="Enter password again"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

            </div>

            <div className="flex flex-col-reverse gap-3 border-t p-6 sm:flex-row sm:justify-end">

              <button
                onClick={() => {
                  if (!creatingTeacher) {
                    setShowCreateTeacher(false);
                  }
                }}
                disabled={creatingTeacher}
                className="rounded-xl border px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
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

      {/* MODAL */}

      {selectedTeacher && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">

          <div className="mx-auto mt-10 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b p-6">

              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Manage Teacher Access
                </h3>

                <p className="mt-1 text-gray-500">
                  {selectedTeacher.full_name ||
                    "Teacher"}
                </p>
              </div>

              <button
                onClick={closeTeacher}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="p-6">

              <div className="rounded-xl bg-blue-50 p-5">

                <p className="text-sm font-semibold text-blue-700">
                  Teacher Access
                </p>

                <p className="mt-1 font-bold text-gray-900">
                  ✓ Active
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Select the classes this teacher is allowed to manage.
                </p>

              </div>

              <div className="mt-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Assign Classes
                  </h4>

                  <p className="text-sm text-gray-500">
                    Selected:{" "}
                    <strong>
                      {selectedClassIds.length}
                    </strong>
                  </p>
                </div>

                <select
                  value={gradeFilter}
                  onChange={(event) =>
                    setGradeFilter(
                      event.target.value
                    )
                  }
                  className="rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="all">
                    All Grades
                  </option>

                  {Array.from(
                    { length: 10 },
                    (_, index) => (
                      <option
                        key={index + 1}
                        value={String(
                          index + 1
                        )}
                      >
                        Grade {index + 1}
                      </option>
                    )
                  )}
                </select>
              </div>

              {filteredClasses.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
                  <div className="text-5xl">
                    🏫
                  </div>

                  <h4 className="mt-3 font-bold text-gray-900">
                    No classes available
                  </h4>

                  <p className="mt-1 text-sm text-gray-500">
                    Create classes from Admin → Classes first.
                  </p>
                </div>
              ) : (
                <div className="mt-5 max-h-[430px] overflow-y-auto rounded-xl border">

                  <div className="grid gap-3 p-4 md:grid-cols-2">

                    {filteredClasses.map(
                      (classItem) => {

                        const checked =
                          selectedClassIds.includes(
                            classItem.id
                          );

                        return (
                          <label
                            key={
                              classItem.id
                            }
                            className={`cursor-pointer rounded-xl border p-4 ${
                              checked
                                ? "border-blue-500 bg-blue-50"
                                : "hover:bg-slate-50"
                            }`}
                          >

                            <div className="flex gap-3">

                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleClass(
                                    classItem.id
                                  )
                                }
                                className="mt-1 h-5 w-5 accent-blue-600"
                              />

                              <div className="flex-1">

                                <div className="flex items-center justify-between gap-3">

                                  <p className="font-bold text-gray-900">
                                    Grade{" "}
                                    {classItem.grade}
                                  </p>

                                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                    Section{" "}
                                    {classItem.section}
                                  </span>

                                </div>

                                <p className="mt-2 text-sm text-gray-500">
                                  {classItem.name ||
                                    `Grade ${classItem.grade} - Section ${classItem.section}`}
                                </p>

                              </div>
                            </div>

                          </label>
                        );
                      }
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="flex flex-col-reverse gap-3 border-t p-6 sm:flex-row sm:justify-end">

              <button
                onClick={closeTeacher}
                disabled={saving}
                className="rounded-xl border px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveAssignments}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "💾 Save Access"}
              </button>

            </div>

          </div>
        </div>
      )}
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
  value: number;
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

function getSupabaseErrorMessage(
  error: any,
  fallback: string
) {
  const parts = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code
      ? `Code: ${error.code}`
      : "",
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(" | ")
    : fallback;
}