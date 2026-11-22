import { notFound } from "next/navigation";
import { LearningSession } from "@/features/learning-session/learning-session";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ moduleId: "verbs" }, { moduleId: "vocabulary" }];
}

export default async function LearnModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  if (moduleId !== "verbs" && moduleId !== "vocabulary") notFound();

  return (
    <div className="learning-shell">
      <div className="learning-intro">
        <span className="eyebrow">YOUR LEARNING SESSION</span>
        <p>Take a breath. There’s no rush.</p>
      </div>
      <LearningSession moduleId={moduleId} />
    </div>
  );
}
