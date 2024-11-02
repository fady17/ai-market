import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import prismadb from "@/lib/prismadb";
import Groq from "groq-sdk";
import { StreamingTextResponse } from "ai";

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
): Promise<NextResponse | StreamingTextResponse> {
  try {
    const { prompt } = await request.json();
    const user = await currentUser();

    if (!user || !user.firstName || !user.id) {
      return new NextResponse("unauthorized", { status: 401 });
    }

    const identifier = request.url + "-" + user.id;
    const { success } = await rateLimit(identifier);

    if (!success) {
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    const llm = await prismadb.lLM.update({
      where: {
        id: params.chatId,
      },
      data: {
        messages: {
          create: {
            content: prompt,
            role: "user",
            userId: user.id,
          },
        },
      },
    });

    if (!llm) {
      return new NextResponse("llm not found", { status: 404 });
    }

    const name = llm.id;
    const llm_file_name = name + ".txt";

    const llmKey = {
      llmName: name,
      userId: user.id,
      modelName: "llama3-8b-8192",
    };

    const memoryManager = await MemoryManager.getInstance();

    const records = await memoryManager.redisLatestHistory(llmKey);

    if (records.length === 0) {
      await memoryManager.seedChatHistory(llm.seed, "\n\n", llmKey);
    }

    await memoryManager.writeToHistory("User: " + prompt + "\n", llmKey);

    const recentChatHistory = await memoryManager.redisLatestHistory(llmKey);

    const similarDocs = await memoryManager.vectorSearch(
      recentChatHistory,
      llm_file_name
    );

    let relevantHistory = "";

    if (!!similarDocs && similarDocs.length !== 0) {
      relevantHistory = similarDocs.map((doc) => doc.pageContent).join("\n");
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    let fullResponse = "";

    // Create and handle the completion in an async function
    const handleStream = async () => {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `${llm.instructions}\n\nRelevant history: ${relevantHistory}`,
            },
            {
              role: "user",
              content: `${recentChatHistory}\n\nUser: ${prompt}`,
            },
          ],
          model: "llama3-8b-8192",
          temperature: 0.7,
          max_tokens: 1024,
          stream: true,
        });

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            await writer.write(encoder.encode(content));
          }
        }

        // Store the complete response
        if (fullResponse.length > 0) {
          await memoryManager.writeToHistory(
            "Assistant: " + fullResponse.trim(),
            llmKey
          );

          await prismadb.lLM.update({
            where: {
              id: params.chatId,
            },
            data: {
              messages: {
                create: {
                  content: fullResponse.trim(),
                  role: "system",
                  userId: user.id,
                },
              },
            },
          });
        }
      } catch (error) {
        console.error("Stream processing error:", error);
        await writer.write(
          encoder.encode("An error occurred during processing.")
        );
      } finally {
        await writer.close();
      }
    };

    // Start processing the stream
    handleStream().catch(console.error);

    return new StreamingTextResponse(stream.readable);
  } catch (error) {
    console.log("[CHAT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
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
