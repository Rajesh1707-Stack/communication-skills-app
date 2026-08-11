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
    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is missing.",
        },
        { status: 500 }
      );
    }

    // -----------------------------------------
    // CHECK TEACHER LOGIN
    // -----------------------------------------

    const authHeader =
      request.headers.get("authorization");

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

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser(token);

    if (
      userError ||
      !userData.user
    ) {
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

    // -----------------------------------------
    // VERIFY TEACHER
    // -----------------------------------------

    const {
      data: profile,
      error: profileError,
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
      profileError ||
      !profile
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
      profile.role !==
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

    // -----------------------------------------
    // GET TEACHER ASSIGNED CLASSES
    // -----------------------------------------

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

    if (
      classIds.length === 0
    ) {
      return NextResponse.json({
        success: true,
        lessons: [],
        grades: [],
        message:
          "No classes are assigned to this teacher.",
      });
    }

    // -----------------------------------------
    // GET ASSIGNED CLASS GRADES
    // -----------------------------------------

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
      return NextResponse.json(
        {
          error:
            classError.message,
        },
        { status: 500 }
      );
    }

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
        message:
          "No valid grades found in the assigned classes.",
      });
    }

    // -----------------------------------------
    // GET LESSONS
    // -----------------------------------------

    const {
      data: lessons,
      error: lessonError,
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

    if (lessonError) {
      console.error(
        "Teacher lessons error:",
        lessonError
      );

      return NextResponse.json(
        {
          error:
            lessonError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      grades,
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