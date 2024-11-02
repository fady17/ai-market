import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
import LLMform from "./components/llm-form";

interface LLMidPageProps {
  params: Promise<{
    llmId: string;
  }>;
}

const LLMidPage = async ({ params }: LLMidPageProps) => {
  // Await the params
  const { llmId } = await params;

  // Handle empty llmId
  if (!llmId) {
    redirect("/");
  }

  try {
    // For new LLM creation
    if (llmId === "new") {
      const categories = await prismadb.category.findMany();
      return (
        <div className="h-full p-4">
          <LLMform categories={categories} initialData={null} />
        </div>
      );
    }

    // For existing LLM
    const [llm, categories] = await Promise.all([
      prismadb.lLM.findUnique({
        where: {
          id: llmId,
        },
      }),
      prismadb.category.findMany(),
    ]);

    // Only redirect if trying to access non-existent LLM
    // (but not when creating new one)
    if (!llm && llmId !== "new") {
      redirect("/");
    }

    return (
      <div className="h-full p-4">
        <LLMform initialData={llm} categories={categories} />
      </div>
    );
  } catch (error) {
    console.error("[LLM_ID_PAGE]", error);
    redirect("/");
  }
};

export default LLMidPage;
