import Categories from "@/components/categories";
import Llm from "@/components/llm";
import SearchInput from "@/components/search-input";
import prismadb from "@/lib/prismadb";

interface RootPageProps {
  searchParams: Promise<{
    categoryId?: string;
    name?: string;
  }>;
}

const RootPage = async ({ searchParams }: RootPageProps) => {
  // Await the search params
  const params = await searchParams;

  // Construct where clause after awaiting params
  const where: any = {};

  if (params?.categoryId) {
    where.categoryId = params.categoryId;
  }

  if (params?.name) {
    where.name = {
      search: params.name,
    };
  }

  // Fetch data using the constructed where clause
  const [data, categories] = await Promise.all([
    prismadb.lLM.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    }),
    prismadb.category.findMany(),
  ]);

  return (
    <div className="h-full p-4 space-y-2">
      <SearchInput />
      <Categories data={categories} />
      <Llm data={data} />
    </div>
  );
};

export default RootPage;
