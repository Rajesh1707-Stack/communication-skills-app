import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(
  supabaseUrl,
  publishableKey
);

const adminSupabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(
  request: NextRequest
) {
  try {
    // =========================================
    // SERVICE ROLE
    // =========================================

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // AUTHORIZATION
    // =========================================

    const authHeader =
      request.headers.get(
        "authorization"
      );

    if (!authHeader) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    const token =
      authHeader
        .replace(/^Bearer\s+/i, "")
        .trim();

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Authentication token is missing.",
        },
        { status: 401 }
      );
    }

    // =========================================
    // VERIFY SESSION
    // =========================================

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser(
        token
      );

    if (
      userError ||
      !userData.user
    ) {
      console.error(
        "Teacher authentication error:",
        userError
      );

      return NextResponse.json(
        {
          error:
            userError?.message ||
            "Invalid or expired login session.",
        },
        { status: 401 }
      );
    }

    const teacherId =
      userData.user.id;

    // =========================================
    // GET PROFILE
    // =========================================

    const {
      data: profile,
      error: profileError,
    } =
      await adminSupabase
        .from("profiles")
        .select(
          "id, full_name, role, login_id"
        )
        .eq(
          "id",
          teacherId
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "Profile error:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            profileError.message,
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Your login account exists, but your teacher profile was not found.",
        },
        { status: 404 }
      );
    }

    // =========================================
    // VERIFY TEACHER
    // =========================================

    if (
      String(profile.role)
        .toLowerCase()
        .trim() !== "teacher"
    ) {
      return NextResponse.json(
        {
          error:
            `Only teachers can access this dashboard. Current role: ${profile.role}`,
        },
        { status: 403 }
      );
    }

    // =========================================
    // DEFAULT DATA
    // =========================================

    let assignedClasses: any[] =
      [];

    let students: any[] = [];

    let lessons: any[] = [];

    let grades: number[] = [];

    // =========================================
    // GET TEACHER ASSIGNED CLASSES
    // =========================================

    try {
      const {
        data: assignments,
        error: assignmentError,
      } =
        await adminSupabase
          .from(
            "teacher_class_assignments"
          )
          .select(
            "id, teacher_profile_id, class_id, active"
          )
          .eq(
            "teacher_profile_id",
            teacherId
          )
          .eq(
            "active",
            true
          );

      if (assignmentError) {
        console.warn(
          "Assignment warning:",
          assignmentError.message
        );
      } else {

        const classIds = [
          ...new Set(
            (assignments || [])
              .map(
                (item) =>
                  item.class_id
              )
              .filter(Boolean)
          ),
        ];

        // =====================================
        // ASSIGNED CLASSES
        // =====================================

        if (
          classIds.length > 0
        ) {

          const {
            data: classData,
            error: classError,
          } =
            await adminSupabase
              .from("classes")
              .select(
                "id, grade, section, name"
              )
              .in(
                "id",
                classIds
              )
              .order(
                "grade",
                {
                  ascending:
                    true,
                }
              )
              .order(
                "section",
                {
                  ascending:
                    true,
                }
              );

          if (classError) {
            console.warn(
              "Assigned classes warning:",
              classError.message
            );
          } else {
            assignedClasses =
              classData || [];
          }

          // ===================================
          // STUDENTS
          // ===================================

          const {
            data: studentData,
            error: studentError,
          } =
            await adminSupabase
              .from("students")
              .select(
                "id, name, student_id, grade, section, class_id, auth_user_id"
              )
              .in(
                "class_id",
                classIds
              )
              .order(
                "name",
                {
                  ascending:
                    true,
                }
              );

          if (studentError) {
            console.warn(
              "Students warning:",
              studentError.message
            );
          } else {
            students =
              studentData || [];
          }
        }
      }
    } catch (error) {
      console.warn(
        "Assignment loading warning:",
        error
      );
    }

    // =========================================
    // GRADES
    // =========================================

    grades = [
      ...new Set(
        assignedClasses
          .map(
            (item) =>
              Number(item.grade)
          )
          .filter(
            (grade) =>
              Number.isFinite(
                grade
              )
          )
      ),
    ].sort(
      (a, b) =>
        a - b
    );

    // =========================================
    // GET ALL LESSONS
    // =========================================

    try {
      const {
        data: lessonData,
        error: lessonError,
      } =
        await adminSupabase
          .from("lessons")
          .select(
            "id, grade, lesson_number, title, description, difficulty"
          )
          .order(
            "grade",
            {
              ascending: true,
            }
          )
          .order(
            "lesson_number",
            {
              ascending: true,
            }
          );

      if (lessonError) {
        console.warn(
          "Lessons warning:",
          lessonError.message
        );
      } else {
        lessons =
          lessonData || [];
      }
    } catch (error) {
      console.warn(
        "Lessons loading warning:",
        error
      );
    }

    // =========================================
    // SUCCESS
    // =========================================

    return NextResponse.json(
      {
        success: true,

        teacher: {
          id:
            profile.id,

          full_name:
            profile.full_name,

          role:
            profile.role,

          login_id:
            profile.login_id,
        },

        classes:
          assignedClasses,

        students,

        lessons,

        grades,
      },
      {
        status: 200,
      }
    );

  } catch (error: any) {
    console.error(
      "Teacher dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to load teacher dashboard.",
      },
      { status: 500 }
    );
  }
}