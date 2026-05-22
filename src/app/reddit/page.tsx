import { RedditHotList } from '@/components/reddit/RedditHotList';

export default function RedditPage() {
  return (
    <main className="min-h-screen bg-page p-5">
      <div className="mx-auto max-w-3xl">
        <RedditHotList />
      </div>
    </main>
  );
}
