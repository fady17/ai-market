// app/api/chat/[chatId]/route.ts
import { StreamingTextResponse, Message as VercelMessage } from "ai";
import { Groq } from "groq-sdk";
import { MemoryService } from "@/lib/memory";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import prismadb from "@/lib/prismadb";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const runtime = "edge";

export async function POST(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { messages } = await req.json();
    const { userId } = auth();

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Rate limiting
    const identifier = req.url + "-" + userId;
    const { success } = await rateLimit(identifier);

    if (!success) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    // Get or create chat in database
    const chat = await prismadb.chat.update({
      where: {
        id: params.chatId,
      },
      data: {
        messages: {
          create: {
            content: messages[messages.length - 1].content,
            role: "user",
            userId,
          },
        },
      },
    });

    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }

    // Initialize memory service
    const memoryService = await MemoryService.getInstance();

    const memoryKey = {
      chatId: params.chatId,
      userId,
      modelName: "mixtral-8x7b-32768",
    };

    // Get chat history
    const recentHistory = await memoryService.getLatestHistory(memoryKey);

    // Write latest user message to history
    await memoryService.writeToHistory(
      `User: ${messages[messages.length - 1].content}`,
      memoryKey
    );

    // Get relevant context from vector search
    const similarDocs = await memoryService.vectorSearch(
      messages[messages.length - 1].content,
      params.chatId
    );

    const relevantHistory = similarDocs
      ? similarDocs.map((doc) => doc.pageContent).join("\n")
      : "";

    // Prepare messages for the AI
    const contextMessages = [
      {
        role: "system",
        content: `You have access to relevant chat history and context. Use this to provide informed responses.
                 
                 Relevant history:
                 ${relevantHistory}
                 
                 Recent conversation:
                 ${recentHistory}`,
      },
      ...messages.map((message: VercelMessage) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const response = await groq.chat.completions.create({
      messages: contextMessages,
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // Store assistant's response
    response.body.on("data", async (chunk) => {
      try {
        const text = chunk.toString();
        if (text.trim()) {
          await memoryService.writeToHistory(`Assistant: ${text}`, memoryKey);

          await prismadb.chat.update({
            where: {
              id: params.chatId,
            },
            data: {
              messages: {
                create: {
                  content: text,
                  role: "assistant",
                  userId,
                },
              },
            },
          });
        }
      } catch (error) {
        console.error("Error storing assistant response:", error);
      }
    });

    return new StreamingTextResponse(response.body);
  } catch (error) {
    console.error("[CHAT_POST]", error);
    return new Response("Internal Error", { status: 500 });
  }
}
// import { auth, currentUser } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";
// import { MemoryManager } from "@/lib/memory";
// import { rateLimit } from "@/lib/rate-limit";
// import prismadb from "@/lib/prismadb";
// import Groq from "groq-sdk";

// import { CallbackManager } from "langchain/callbacks"

// import { StreamingTextResponse, LangChainStream } from "ai";

// export const async function POST(
//     request: Request,
//     { params }: { params: { chatId: string }}
// ) {
//     try {
//         const { prompt } = await request.json();
//         const user = await currentUser();

//         if(!user || !user.firstName || !user.id) {
//             return new NextResponse("unauthorized", { status: 401 });
//         }
//         const identifier = request.url + "-" + user.id;
//         const { success } = await rateLimit(identifier);

//         if (!success) {
//             return new NextResponse("Rate limit excedded", { status: 429 });
//         }

//         const llm = await prismadb.lLM.update({
//             where: {
//                 id: params.chatId,

//             },
//             data: {
//                 messages: {
//                     create: {
//                         content: prompt,
//                         role: "user",
//                         userId: user.id,
//                     }
//                 }
//             }
//         });
//         if (!llm) {
//             return new NextResponse("llm not found", {status: 404});
//         }

//         const name = llm.id;
//         const llm_file_name = name + ".txt";

//         const llmKey = {
//             llmName: name,
//             userId: user.id,
//             modelName: "llama3-8b-8192",
//         };

//         const memoryManger = await MemoryManager.getInstance();

//         const records = await memoryManger.redisLatestHistory(llmKey);

//         if (records.length === 0) {
//             await memoryManger.seedChatHistory(llm.seed, "\n\n", llmKey);
//         }

//         await memoryManger.writeToHistory("User: " + prompt + "\n", llmKey);

//         const recentChatHistory = await memoryManger.redisLatestHistory(llmKey);

//         const similarDocs = await memoryManger.vectorSearch(
//             recentChatHistory,
//             llm_file_name,
//         );

//         let relevantHistory = "";

//         if(!!similarDocs && similarDocs.length !== 0) {
//             relevantHistory = similarDocs.map((doc) => doc.pageContent).join("\n");
//         }

//         const { handlers } = LangChainStream();

//         // const groq = new Groq();
//         // async function main() {
//         // const chatCompletion = await groq.chat.completions.create({
//         //     "messages": [
//         //     {
//         //         "role": "user",
//         //         "content": ""
//         //     }
//         //     ],
//         //     "model": "llama3-8b-8192",
//         //     "temperature": 1,
//         //     "max_tokens": 1024,
//         //     "top_p": 1,
//         //     "stream": true,
//         //     "stop": null
//         // });

//         // for await (const chunk of chatCompletion) {
//         //     process.stdout.write(chunk.choices[0]?.delta?.content || '');
//         // }
//         // }

//         // main();

//         const model = new Groq({
//             model: "llama3-8b-8192";
//             input: {
//                 max_length: 1024,
//             },
//             apiKey: process.env.GROQ_API_KEY,
//             callbackManger: CallbackManager.fromHandlers(handlers),
//         });
//         model.verbose = true;

//         const resp = String(
//             await model
//                 .call(
//                     Only generate plain text without prefix of who is SquareParking.DO NOT use ${name} : prefix.

//                     ${llm.instructions}

//                     Below are the relevant details about ${name} past and the conversation you are in.
//                     ${relevantHistory}
//                     ${recentChatHistory}\n${name}
//                 )
//             catch(console.error)
//         );
//         const cleaned = resp.replaceAll(",","");
//         const chunks = cleaned.split("\n");
//         const response = chunks[0];

//         await memoryManger.writeToHistory("" + response.trim(), llmKey);
//         var Readable = require("stream").Readable;

//         let s = new Readable();
//         s.push(response);
//         s.push(null);

//         if (response !== undefined && response.length > 1) {
//             memoryManger.writeToHistory("" + response.trim(), llmKey);

//             await prismadb.lLM.update({
//                 where: {
//                     id: params.chatId,
//                 },
//                 data: {
//                     messages: {
//                         create: {
//                             content:response.trim(),
//                             role: "system",
//                             userId:user.id
//                         }
//                     }
//                 }
//             })
//         }

//         return new StreamingTextResponse(s);

//     } catch(error) {
//         console.log("[CHAT_POST]", error);
//         return new NextResponse("Internal Error", { status: 500 });
//     }
// }
