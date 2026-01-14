import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold mb-8 dark:text-white">Virtual List Examples</h1>
        <div className="flex flex-col gap-4 w-full">
          <Link
            href="/examples/fixed-height"
            className="p-4 border rounded hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900 dark:text-white"
          >
            <h2 className="text-xl font-bold">Fixed Height</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Container with fixed height (600px) and items with fixed height (100px).
            </p>
          </Link>

          <Link
            href="/examples/variable-height"
            className="p-4 border rounded hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900 dark:text-white"
          >
            <h2 className="text-xl font-bold">Variable Height</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Container with fixed height (600px) but items with variable heights.
            </p>
          </Link>

          <Link
            href="/examples/page-mode"
            className="p-4 border rounded hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900 dark:text-white"
          >
            <h2 className="text-xl font-bold">Page Mode</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Virtual list that uses the window scrollbar (infinite scroll feel).
            </p>
          </Link>

          <Link
            href="/examples/ssr-feed"
            className="p-4 border rounded hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900 dark:text-white"
          >
            <h2 className="text-xl font-bold">SSR Feed</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Server-side rendering for the first few items, then virtual list for the rest.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
