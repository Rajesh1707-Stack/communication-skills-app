import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ---------------------------------------------------------
// Supabase clients
// ---------------------------------------------------------

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

// =========================================================
// VERIFY TEACHER
// =========================================================

async function verifyTeacher(
  request: NextRequest
) {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  if (!authHeader) {
    throw new Error(
      "Authentication required."
    );
  }

  const token =
    authHeader.replace(
      /^Bearer\s+/i,
      ""
    );

  if (!token) {
    throw new Error(
      "Authentication token is missing."
    );
  }

  // Verify Supabase login
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

    throw new Error(
      "Invalid or expired login session."
    );
  }

  const teacherId =
    userData.user.id;

  // Get teacher profile
  const {
    data: teacherProfile,
    error: teacherError,
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

  if (teacherError) {
    console.error(
      "Teacher profile error:",
      teacherError
    );

    throw new Error(
      teacherError.message
    );
  }

  if (!teacherProfile) {
    throw new Error(
      "Teacher profile was not found."
    );
  }

  if (
    teacherProfile.role !==
    "teacher"
  ) {
    throw new Error(
      "Only teachers can manage lessons."
    );
  }

  return teacherProfile;
}

// =========================================================
// GET
// GET ALL LESSONS FOR TEACHERS
// =========================================================

export async function GET(
  request: NextRequest
) {
  try {
    // -----------------------------------------------------
    // Check environment
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Verify teacher
    // -----------------------------------------------------

    const teacherProfile =
      await verifyTeacher(
        request
      );

    // -----------------------------------------------------
    // Get ALL lessons
    //
    // IMPORTANT:
    // Lessons are not restricted to assigned classes.
    // Every teacher can access lessons from all grades.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Get grades that actually contain lessons
    // -----------------------------------------------------

    const grades = [
      ...new Set(
        (lessons || [])
          .map(
            (lesson) =>
              Number(
                lesson.grade
              )
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

    // -----------------------------------------------------
    // Get teacher's assigned classes
    //
    // Returned for dashboard/UI reference only.
    // It does NOT restrict lesson access.
    // -----------------------------------------------------

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
          teacherProfile.id
        )
        .eq(
          "active",
          true
        );

    if (assignmentError) {
      console.error(
        "Teacher assignment error:",
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

    let classes: any[] = [];

    // -----------------------------------------------------
    // Get assigned classes
    // -----------------------------------------------------

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
            "id, grade, section"
          )
          .in(
            "id",
            classIds
          );

      if (classError) {
        console.error(
          "Class database error:",
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

      classes =
        classData || [];
    }

    // -----------------------------------------------------
    // Success
    // -----------------------------------------------------

    return NextResponse.json({
      success: true,

      teacher: {
        id:
          teacherProfile.id,

        name:
          teacherProfile.full_name,
      },

      grades,

      classes,

      lessons:
        lessons || [],
    });
  } catch (error: any) {
    console.error(
      "Teacher lessons GET error:",
      error
    );

    const message =
      error?.message ||
      "Unable to load teacher lessons.";

    const status =
      message.includes(
        "Authentication"
      ) ||
      message.includes(
        "login session"
      )
        ? 401
        : message.includes(
            "Only teachers"
          )
        ? 403
        : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}

// =========================================================
// POST
// CREATE NEW LESSON
// =========================================================

export async function POST(
  request: NextRequest
) {
  try {
    // -----------------------------------------------------
    // Verify teacher
    // -----------------------------------------------------

    await verifyTeacher(
      request
    );

    // -----------------------------------------------------
    // Read request body
    // -----------------------------------------------------

    const body =
      await request.json();

    const grade =
      Number(
        body?.grade
      );

    const lessonNumber =
      Number(
        body?.lesson_number
      );

    const title =
      String(
        body?.title || ""
      ).trim();

    const description =
      String(
        body?.description || ""
      ).trim();

    const difficulty =
      String(
        body?.difficulty ||
          "Beginner"
      ).trim();

    // -----------------------------------------------------
    // Validate grade
    // -----------------------------------------------------

    if (
      !Number.isInteger(
        grade
      ) ||
      grade < 1 ||
      grade > 10
    ) {
      return NextResponse.json(
        {
          error:
            "Grade must be between 1 and 10.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------
    // Validate lesson number
    // -----------------------------------------------------

    if (
      !Number.isInteger(
        lessonNumber
      ) ||
      lessonNumber < 1
    ) {
      return NextResponse.json(
        {
          error:
            "Lesson number must be at least 1.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------
    // Validate title
    // -----------------------------------------------------

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Lesson title is required.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------
    // Check duplicate lesson number
    // -----------------------------------------------------

    const {
      data: existingLesson,
      error: existingError,
    } =
      await adminSupabase
        .from("lessons")
        .select("id")
        .eq(
          "grade",
          grade
        )
        .eq(
          "lesson_number",
          lessonNumber
        )
        .maybeSingle();

    if (existingError) {
      console.error(
        "Duplicate lesson check error:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            existingError.message,
        },
        { status: 500 }
      );
    }

    if (existingLesson) {
      return NextResponse.json(
        {
          error:
            `Grade ${grade} Lesson ${lessonNumber} already exists.`,
        },
        { status: 409 }
      );
    }

    // -----------------------------------------------------
    // Create lesson
    // -----------------------------------------------------

    const {
      data: lesson,
      error: lessonError,
    } =
      await adminSupabase
        .from("lessons")
        .insert({
          grade,
          lesson_number:
            lessonNumber,
          title,
          description,
          difficulty,
        })
        .select()
        .single();

    if (lessonError) {
      console.error(
        "Create lesson database error:",
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

    // -----------------------------------------------------
    // Success
    // -----------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          "Lesson created successfully.",

        lesson,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "Teacher lesson POST error:",
      error
    );

    const message =
      error?.message ||
      "Unable to create lesson.";

    const status =
      message.includes(
        "Authentication"
      ) ||
      message.includes(
        "login session"
      )
        ? 401
        : message.includes(
            "Only teachers"
          )
        ? 403
        : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status }
    );
  }
}