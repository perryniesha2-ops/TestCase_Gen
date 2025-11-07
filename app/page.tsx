import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Test Case Generator</h1>
        <p className="text-xl text-muted-foreground mb-8">
          AI-powered test case generation with OpenAI and Anthropic
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/pages/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Login
          </Link>
          <Link
            href="/pages/signup"
            className="px-6 py-3 border border-input rounded-lg hover:bg-accent transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}