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

// =====================================================
// INTERNAL DOMAIN FOR STUDENTS
// =====================================================

const STUDENT_AUTH_DOMAIN =
  "student.communication.local";

// =====================================================
// POST
// =====================================================

export async function POST(
  request: NextRequest
) {
  try {

    // =================================================
    // CHECK SERVICE ROLE
    // =================================================

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local.",
        },
        { status: 500 }
      );
    }

    // =================================================
    // AUTHORIZATION
    // =================================================

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

    // =================================================
    // VERIFY LOGGED-IN USER
    // =================================================

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

    // =================================================
    // CHECK TEACHER PROFILE
    // =================================================

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
        .maybeSingle();

    if (teacherProfileError) {
      return NextResponse.json(
        {
          error:
            teacherProfileError.message,
        },
        { status: 500 }
      );
    }

    if (!teacherProfile) {
      return NextResponse.json(
        {
          error:
            "Teacher profile was not found.",
        },
        { status: 404 }
      );
    }

    if (
      String(
        teacherProfile.role
      )
        .toLowerCase()
        .trim() !==
      "teacher"
    ) {
      return NextResponse.json(
        {
          error:
            "Only teachers can create student accounts.",
        },
        { status: 403 }
      );
    }

    // =================================================
    // READ REQUEST
    // =================================================

    const body =
      await request.json();

    const name =
      String(
        body?.name || ""
      ).trim();

    const loginId =
      String(
        body?.loginId || ""
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        body?.password || ""
      );

    const classId =
      String(
        body?.classId || ""
      ).trim();

    // =================================================
    // VALIDATE NAME
    // =================================================

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Student name is required.",
        },
        { status: 400 }
      );
    }

    // =================================================
    // VALIDATE LOGIN ID
    // =================================================

    if (!loginId) {
      return NextResponse.json(
        {
          error:
            "Student Login ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      !/^[a-zA-Z0-9._-]{3,30}$/.test(
        loginId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Student Login ID must contain 3-30 characters using letters, numbers, dot, underscore or hyphen.",
        },
        { status: 400 }
      );
    }

    // =================================================
    // PASSWORD
    // =================================================

    if (
      password.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least 6 characters.",
        },
        { status: 400 }
      );
    }

    // =================================================
    // CLASS
    // =================================================

    if (!classId) {
      return NextResponse.json(
        {
          error:
            "Please select a class.",
        },
        { status: 400 }
      );
    }

    // =================================================
    // CHECK CLASS
    // =================================================

    const {
      data: schoolClass,
      error: classError,
    } =
      await adminSupabase
        .from("classes")
        .select(
          "id, grade, section, name"
        )
        .eq(
          "id",
          classId
        )
        .maybeSingle();

    if (classError) {
      return NextResponse.json(
        {
          error:
            classError.message,
        },
        { status: 500 }
      );
    }

    if (!schoolClass) {
      return NextResponse.json(
        {
          error:
            "Selected class was not found.",
        },
        { status: 404 }
      );
    }

    // =================================================
    // CHECK DUPLICATE STUDENT LOGIN
    // =================================================

    const {
      data: existingStudent,
      error: existingStudentError,
    } =
      await adminSupabase
        .from("students")
        .select(
          "id, auth_user_id"
        )
        .eq(
          "student_id",
          loginId
        )
        .maybeSingle();

    if (existingStudentError) {
      return NextResponse.json(
        {
          error:
            existingStudentError.message,
        },
        { status: 500 }
      );
    }

    if (existingStudent) {
      return NextResponse.json(
        {
          error:
            "This Student Login ID already exists.",
        },
        { status: 409 }
      );
    }

    // =================================================
    // INTERNAL AUTH EMAIL
    // =================================================

    const authEmail =
      `${loginId}@${STUDENT_AUTH_DOMAIN}`;

    console.log(
      "Creating student Auth account:",
      authEmail
    );

    // =================================================
    // CREATE SUPABASE AUTH USER
    // =================================================

    const {
      data: authData,
      error: authError,
    } =
      await adminSupabase.auth.admin.createUser(
        {
          email:
            authEmail,

          password,

          email_confirm:
            true,

          user_metadata: {
            full_name:
              name,

            role:
              "student",

            login_id:
              loginId,
          },
        }
      );

    if (
      authError ||
      !authData.user
    ) {
      console.error(
        "Student Auth creation error:",
        authError
      );

      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Unable to create student Auth account.",
        },
        { status: 500 }
      );
    }

    const studentAuthId =
      authData.user.id;

    // =================================================
    // CREATE STUDENT DATABASE RECORD
    // =================================================

    const {
      error: studentInsertError,
    } =
      await adminSupabase
        .from("students")
        .insert({
          name,

          student_id:
            loginId,

          grade:
            schoolClass.grade,

          section:
            schoolClass.section,

          class_id:
            schoolClass.id,

          auth_user_id:
            studentAuthId,
        });

    // =================================================
    // ROLLBACK IF DATABASE INSERT FAILS
    // =================================================

    if (
      studentInsertError
    ) {

      console.error(
        "Student database insert error:",
        studentInsertError
      );

      await adminSupabase.auth.admin.deleteUser(
        studentAuthId
      );

      return NextResponse.json(
        {
          error:
            "Student Auth account was created, but the student record could not be created: " +
            studentInsertError.message,
        },
        { status: 500 }
      );
    }

    // =================================================
    // SUCCESS
    // =================================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Student account created successfully.",

        student: {
          id:
            studentAuthId,

          name,

          loginId,

          grade:
            schoolClass.grade,

          section:
            schoolClass.section,

          classId:
            schoolClass.id,
        },
      },
      { status: 201 }
    );

  } catch (error: any) {

    console.error(
      "Create student API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong while creating the student.",
      },
      { status: 500 }
    );
  }
}