import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { redirect } from "next/navigation";
import ChatClient from "./components/chat-client";

interface ChatIdPageProps {
  params: {
    chatId: string;
  };
}

const ChatIdPage = async ({ params }: ChatIdPageProps) => {
  // Get the user ID and handle redirect if not authenticated
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  // Query the database for the LLM with associated messages, filtered by userId
  const llm = await prismadb.lLM.findUnique({
    where: {
      id: params.chatId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        where: {
          userId,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  // Redirect to home if no matching LLM entry is found
  if (!llm) {
    return redirect("/");
  }

  return (
    <div>
      <ChatClient llm={llm} />
    </div>
  );
};

export default ChatIdPage;
