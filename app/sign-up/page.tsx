"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CareVoice</h1>
          <p className="text-gray-600 mt-2">
            Start your 14-day free trial
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
          afterSignUpUrl="/dashboard"
          signInUrl="/login"
        />
      </div>
    </div>
  );
}
