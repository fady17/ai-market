import prismadb from "@/lib/prismadb";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { llmId: string } }
) {
  try {
    const body = await req.json();
    const user = await currentUser();
    const { src, name, description, instructions, seed, categoryId } = body;

    if (!params.llmId) {
      return new NextResponse("LLM ID is required", { status: 400 });
    }

    if (!user || !user.id || !user.firstName) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (
      !src ||
      !name ||
      !description ||
      !instructions ||
      !seed ||
      !categoryId
    ) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // TODO: Check for subscribtion

    const llm = await prismadb.lLM.update({
      where: {
        id: params.llmId,
        userId: user.id,
      },
      data: {
        categoryId,
        userId: user.id,
        userName: user.firstName,
        src,
        name,
        description,
        instructions,
        seed,
      },
    });
    return NextResponse.json(llm);
  } catch (error) {
    console.log("[LLM_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: { llmId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const llm = await prismadb.lLM.delete({
      where: {
        userId,
        id: params.llmId,
      },
    });
    return NextResponse.json(llm);
  } catch (error) {
    console.log("[LLM_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
