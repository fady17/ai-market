import prismadb from "@/lib/prismadb";
import LLMform from "./components/llm-form";

interface LLMidPageProps {
  params: {
    llmId: string;
  };
}
const LLMidPage = async ({ params }: LLMidPageProps) => {
  // TODO: Check subscription

  const llm = await prismadb.lLM.findUnique({
    where: {
      id: params.llmId,
    },
  });

  const categories = await prismadb.category.findMany();

  return (
    <div>
      <LLMform initialData={llm} categories={categories} />
    </div>
  );
};

export default LLMidPage;
