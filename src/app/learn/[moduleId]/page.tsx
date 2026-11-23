import { notFound } from "next/navigation";
import { LearningSession } from "@/features/learning-session/learning-session";
import { getLearningModuleMetadata, learningModuleRegistry } from "@/learning/modules/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return learningModuleRegistry.map(({ id }) => ({ moduleId: id }));
}

export default async function LearnModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  if (!getLearningModuleMetadata(moduleId)) notFound();

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
