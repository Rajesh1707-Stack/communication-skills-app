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
    // CHECK SERVICE ROLE KEY
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

    // =========================================
    // GET TOKEN
    // =========================================

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
        "Teacher classes auth error:",
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
    // CHECK TEACHER PROFILE
    // =========================================

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
        .maybeSingle();

    if (profileError) {
      console.error(
        "Teacher profile error:",
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
            "Teacher profile was not found.",
        },
        { status: 404 }
      );
    }

    // =========================================
    // VERIFY ROLE
    // =========================================

    if (
      String(profile.role)
        .toLowerCase()
        .trim() !==
      "teacher"
    ) {
      return NextResponse.json(
        {
          error:
            "Only teachers can access school classes.",
        },
        { status: 403 }
      );
    }

    // =========================================
    // GET ALL SCHOOL CLASSES
    // =========================================
    //
    // IMPORTANT:
    // Do NOT filter by teacher assignment.
    //
    // Every teacher can create a student
    // in any school class.
    //
    // =========================================

    const {
      data: classes,
      error: classesError,
    } =
      await adminSupabase
        .from("classes")
        .select(
          "id, grade, section, name"
        )
        .order(
          "grade",
          {
            ascending: true,
          }
        )
        .order(
          "section",
          {
            ascending: true,
          }
        );

    if (classesError) {
      console.error(
        "Classes database error:",
        classesError
      );

      return NextResponse.json(
        {
          error:
            classesError.message,
        },
        { status: 500 }
      );
    }

    // =========================================
    // SUCCESS
    // =========================================

    return NextResponse.json(
      {
        success: true,

        classes:
          classes || [],
      },
      {
        status: 200,
      }
    );

  } catch (error: any) {

    console.error(
      "Teacher classes API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to load school classes.",
      },
      {
        status: 500,
      }
    );
  }
}