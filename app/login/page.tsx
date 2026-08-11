"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Role =
  | "student"
  | "teacher"
  | "admin";

const STUDENT_AUTH_DOMAIN =
  "student.communication.local";

export default function LoginPage() {

  const [role, setRole] =
    useState<Role>("student");

  const [loginId, setLoginId] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleLogin(
    e: React.FormEvent
  ) {

    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {

      const enteredLoginId =
        loginId.trim();

      if (!enteredLoginId) {
        setMessage(
          "Please enter your Login ID."
        );

        setLoading(false);
        return;
      }

      if (!password) {
        setMessage(
          "Please enter your password."
        );

        setLoading(false);
        return;
      }

      // =================================================
      // DETERMINE AUTH EMAIL
      // =================================================

      let authEmail =
        enteredLoginId.toLowerCase();

      // =================================================
      // STUDENT
      // =================================================

      if (role === "student") {

        const studentLoginId =
          enteredLoginId
            .toLowerCase()
            .trim();

        if (
          !/^[a-zA-Z0-9._-]{3,30}$/.test(
            studentLoginId
          )
        ) {
          setMessage(
            "Student Login ID must contain 3-30 characters using letters, numbers, dot, underscore or hyphen."
          );

          setLoading(false);
          return;
        }

        authEmail =
          `${studentLoginId}@${STUDENT_AUTH_DOMAIN}`;
      }

      console.log(
        "Login role:",
        role
      );

      console.log(
        "Auth email:",
        authEmail
      );

      // =================================================
      // SUPABASE LOGIN
      // =================================================

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email:
            authEmail,

          password,
        });

      if (error) {

        console.error(
          "Supabase login error:",
          error
        );

        setMessage(
          error.message
        );

        setLoading(false);
        return;
      }

      if (!data.user) {

        setMessage(
          "Login failed. User information was not found."
        );

        setLoading(false);
        return;
      }

      const userId =
        data.user.id;

      // =================================================
      // STUDENT
      // =================================================

      if (
        role ===
        "student"
      ) {

        const {
          data: student,
          error: studentError,
        } =
          await supabase
            .from("students")
            .select(
              `
              id,
              name,
              student_id,
              grade,
              section,
              class_id,
              auth_user_id
              `
            )
            .eq(
              "auth_user_id",
              userId
            )
            .maybeSingle();

        if (studentError) {

          console.error(
            "Student profile error:",
            studentError
          );

          await supabase.auth.signOut();

          setMessage(
            studentError.message ||
              "Unable to load student information."
          );

          setLoading(false);
          return;
        }

        if (!student) {

          await supabase.auth.signOut();

          setMessage(
            "Login successful, but your student information was not found."
          );

          setLoading(false);
          return;
        }

        console.log(
          "Student login successful:",
          student
        );

        window.location.href =
          "/student";

        return;
      }

      // =================================================
      // TEACHER / ADMIN
      // =================================================

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, role, login_id"
          )
          .eq(
            "id",
            userId
          )
          .maybeSingle();

      if (profileError) {

        console.error(
          "Profile error:",
          profileError
        );

        await supabase.auth.signOut();

        setMessage(
          profileError.message ||
            "Unable to load profile information."
        );

        setLoading(false);
        return;
      }

      if (!profile) {

        await supabase.auth.signOut();

        setMessage(
          "Login successful, but your profile information was not found."
        );

        setLoading(false);
        return;
      }

      // =================================================
      // ROLE CHECK
      // =================================================

      const actualRole =
        String(
          profile.role || ""
        )
          .toLowerCase()
          .trim();

      if (
        actualRole !==
        role
      ) {

        await supabase.auth.signOut();

        setMessage(
          `This account is registered as ${actualRole}, not ${role}.`
        );

        setLoading(false);
        return;
      }

      // =================================================
      // TEACHER
      // =================================================

      if (
        actualRole ===
        "teacher"
      ) {

        window.location.href =
          "/teacher";

        return;
      }

      // =================================================
      // ADMIN
      // =================================================

      if (
        actualRole ===
        "admin"
      ) {

        window.location.href =
          "/admin";

        return;
      }

      // =================================================
      // INVALID ROLE
      // =================================================

      await supabase.auth.signOut();

      setMessage(
        "Your account has an invalid role."
      );

      setLoading(false);

    } catch (error: any) {

      console.error(
        "Login error:",
        error
      );

      setMessage(
        error?.message ||
          "Something went wrong while logging in."
      );

      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">

      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">

        <div className="mb-8 text-center">

          <h1 className="text-3xl font-bold text-blue-700">
            Communication Skills
          </h1>

          <p className="mt-2 text-gray-500">
            Login to your account
          </p>

        </div>

        {/* ROLE */}

        <div className="mb-6 grid grid-cols-3 gap-2">

          {(
            [
              "student",
              "teacher",
              "admin",
            ] as Role[]
          ).map(
            (item) => (

              <button
                key={item}
                type="button"
                onClick={() => {
                  setRole(item);
                  setLoginId("");
                  setPassword("");
                  setMessage("");
                }}
                className={`rounded-lg px-3 py-3 text-sm font-semibold ${
                  role === item
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {item
                  .charAt(0)
                  .toUpperCase() +
                  item.slice(1)}
              </button>

            )
          )}

        </div>

        {/* FORM */}

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >

          {/* LOGIN ID */}

          <div>

            <label className="mb-2 block text-sm font-medium text-gray-700">

              {role ===
              "teacher"
                ? "Teacher Login ID"
                : role ===
                  "student"
                ? "Student Login ID"
                : "Admin Email"}

            </label>

            <input
              type={
                role ===
                "student"
                  ? "text"
                  : "email"
              }
              value={loginId}
              onChange={(e) =>
                setLoginId(
                  e.target.value
                )
              }
              placeholder={
                role ===
                "teacher"
                  ? "dharani@gmail.com"
                  : role ===
                    "student"
                  ? "peter01"
                  : "admin@gmail.com"
              }
              required
              autoComplete="username"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            {role ===
              "student" && (
              <p className="mt-1 text-xs text-gray-400">
                Example: peter01
              </p>
            )}

            {role ===
              "teacher" && (
              <p className="mt-1 text-xs text-gray-400">
                Enter the Login ID provided by your administrator.
              </p>
            )}

          </div>

          {/* PASSWORD */}

          <div>

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />

          </div>

          {/* LOGIN */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Logging in..."
              : `Login as ${
                  role
                    .charAt(0)
                    .toUpperCase() +
                  role.slice(1)
                }`}
          </button>

        </form>

        {/* MESSAGE */}

        {message && (

          <div className="mt-5 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
            {message}
          </div>

        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Communication Skills
          Development Platform
        </p>

      </div>

    </main>
  );
}