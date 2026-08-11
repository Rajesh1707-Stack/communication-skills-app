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
    // CHECK ENVIRONMENT
    // =========================================

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_SUPABASE_URL is missing.",
        },
        { status: 500 }
      );
    }

    if (!publishableKey) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.",
        },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is missing.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // GET AUTHORIZATION HEADER
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
      authHeader.replace(
        /^Bearer\s+/i,
        ""
      );

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
    // VERIFY LOGGED-IN USER
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
        "Teacher lessons auth error:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Invalid or expired login session.",
        },
        { status: 401 }
      );
    }

    const teacherId =
      userData.user.id;

    // =========================================
    // VERIFY TEACHER PROFILE
    // =========================================

    const {
      data: teacherProfile,
      error: teacherProfileError,
    } =
      await adminSupabase
        .from("profiles")
        .select(
          "id, full_name, role"
        )
        .eq(
          "id",
          teacherId
        )
        .single();

    if (
      teacherProfileError
    ) {
      console.error(
        "Teacher profile error:",
        teacherProfileError
      );

      return NextResponse.json(
        {
          error:
            teacherProfileError.message,
        },
        { status: 500 }
      );
    }

    if (
      !teacherProfile
    ) {
      return NextResponse.json(
        {
          error:
            "Teacher profile was not found.",
        },
        { status: 404 }
      );
    }

    if (
      teacherProfile.role !==
      "teacher"
    ) {
      return NextResponse.json(
        {
          error:
            "Only teachers can access teacher lessons.",
        },
        { status: 403 }
      );
    }

    // =========================================
    // GET ASSIGNED CLASSES
    // =========================================

    const {
      data: assignments,
      error: assignmentError,
    } =
      await adminSupabase
        .from(
          "teacher_class_assignments"
        )
        .select(
          "class_id, active"
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
      console.error(
        "Assignment error:",
        assignmentError
      );

      return NextResponse.json(
        {
          error:
            assignmentError.message,
        },
        { status: 500 }
      );
    }

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

    // =========================================
    // NO ASSIGNED CLASSES
    // =========================================

    if (
      classIds.length === 0
    ) {
      return NextResponse.json({
        success: true,
        lessons: [],
        grades: [],
        classes: [],
        message:
          "No classes are assigned to this teacher.",
      });
    }

    // =========================================
    // GET CLASS INFORMATION
    // =========================================

    const {
      data: classes,
      error: classError,
    } =
      await adminSupabase
        .from("classes")
        .select(
          "id, grade, section"
        )
        .in(
          "id",
          classIds
        );

    if (classError) {
      console.error(
        "Class error:",
        classError
      );

      return NextResponse.json(
        {
          error:
            classError.message,
        },
        { status: 500 }
      );
    }

    // =========================================
    // GET ASSIGNED GRADES
    // =========================================

    const grades = [
      ...new Set(
        (classes || [])
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
      (a, b) => a - b
    );

    if (
      grades.length === 0
    ) {
      return NextResponse.json({
        success: true,
        lessons: [],
        grades: [],
        classes:
          classes || [],
        message:
          "No valid grades were found.",
      });
    }

    console.log(
      "Teacher:",
      teacherProfile.full_name
    );

    console.log(
      "Assigned grades:",
      grades
    );

    // =========================================
    // GET LESSONS
    // =========================================

    const {
      data: lessons,
      error: lessonsError,
    } =
      await adminSupabase
        .from("lessons")
        .select(
          `
          id,
          grade,
          lesson_number,
          title,
          description,
          difficulty
          `
        )
        .in(
          "grade",
          grades
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

    if (lessonsError) {
      console.error(
        "Lessons database error:",
        lessonsError
      );

      return NextResponse.json(
        {
          error:
            lessonsError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "Lessons found:",
      lessons?.length || 0
    );

    // =========================================
    // SUCCESS
    // =========================================

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacherProfile.id,
        name:
          teacherProfile.full_name,
      },
      grades,
      classes:
        classes || [],
      lessons:
        lessons || [],
    });
  } catch (error: any) {
    console.error(
      "Teacher lessons API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to load teacher lessons.",
      },
      { status: 500 }
    );
  }
}