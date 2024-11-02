// import { Redis } from "@upstash/redis";
// import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";

// import { Pinecone } from "@pinecone-database/pinecone";
// import { PineconeStore } from "@langchain/pinecone";

// export type LlmKey = {
//   llmName: string;
//   modelName: string;
//   userId: string;
// };

// export class MemoryManger {
//   private static instance: MemoryManger;
//   private history: Redis;
//   private vectorDBClient: Pinecone;

//   public constructor() {
//     this.history = Redis.fromEnv();
//     this.vectorDBClient = new Pinecone();
//   }

//   public async init() {
//     if (this.vectorDBClient instanceof Pinecone) {
//       await this.vectorDBClient.init({
//         apiKey: process.env.PINECONE_API_KEY!,
//         environment: process.env.PINECONE_ENV!,
//       });
//     }
//   }
//   public async vectorSearch(recentChatHistory: string, llmFileName: string) {
//     const pineconeClient = <Pinecone>this.vectorDBClient;
//     const pineconeIndex = pineconeClient.Index(
//       process.env.PINECONE_INDEX! || ""
//     );

//     const vectorStore = await PineconeStore.fromExistingIndex(
//        new HuggingFaceTransformersEmbeddings({ huggingFaceApiKey: process.env.HUGGING_FACE_API_KEY }),

//       { pineconeIndex }
//     );
//     const similarDocs = await vectorStore
//       .similaritySearch(recentChatHistory, 3, { fileName: llmFileName })
//       .catch((err) => {
//         console.log("failed to get search results", err);
//       });

//     return similarDocs;
//   }
//   public static async getInstance(): Promise<MemoryManger> {
//     if (!MemoryManger.instance) {
//       MemoryManger.instance = new MemoryManger();
//       await MemoryManger.instance, init();
//     }
//     return MemoryManger.instance;
//   }

//   private generateRedisLlmKey(llmKey: LlmKey): string {
//     return `${llmKey.llmName}-${llmKey.modelName}-${llmKey.userId}`;
//   }

//   public async writeToHistory(text: string, llmKey: LlmKey) {
//     if (!llmKey || typeof llmKey.userId == "undefined") {
//       console.log("llm key set incorrectly");
//       return "";
//     }

//     const key = this.generateRedisLlmKey(llmKey);
//     const result = await this.history.zadd(key, {
//       score: Date.now(),
//       member: text,
//     });
//     return result;
//   }

//   public async redisLatestHistory(llmKey: LlmKey): Promise<string> {
//     if (!llmKey || typeof llmKey.userId == "undefined") {
//       console.log("llm key is not set correctly");
//       return "";
//     }

//     const key = this.generateRedisLlmKey(llmKey);
//     let result = await this.history.zrange(key, 0, Date.now(), {
//       byScore: true,
//     });
//     result = result.slice(-30).reverse();
//     const recentChats = result.reverse().join("\n");
//     return recentChats;
//   }

//   public async seedChatHistory(
//     seedContent: String,
//     delimiter: string = "\n",
//     llmKey: LlmKey
//   ) {
//     const key = this.generateRedisLlmKey(llmKey);
//     if (await this.history.exists(key)) {
//       console.log("User already has chat history");
//       return;
//     }

//     const content = seedContent.split(delimiter);
//     let counter = 0;

//     for (const line of content) {
//       await this.history.zadd(key, { score: counter, member: line });
//       counter += 1;
//     }
//   }
// }

import { Redis } from "@upstash/redis";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

export type LlmKey = {
  llmName: string;
  modelName: string;
  userId: string;
};

export class MemoryManager {
  private static instance: MemoryManager;
  private history: Redis;
  private vectorDBClient: Pinecone;

  private constructor() {
    this.history = Redis.fromEnv();
    this.vectorDBClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
      //environment: process.env.PINECONE_ENVIRONMENT!,
    });
  }

  public static async getInstance(): Promise<MemoryManager> {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public async vectorSearch(recentChatHistory: string, llmFileName: string) {
    const pineconeIndex = this.vectorDBClient.Index(
      process.env.PINECONE_INDEX! || ""
    );

    const vectorStore = await PineconeStore.fromExistingIndex(
      new HuggingFaceInferenceEmbeddings({
        apiKey: process.env.HUGGING_FACE_API_KEY,
      }),
      { pineconeIndex }
    );

    const similarDocs = await vectorStore
      .similaritySearch(recentChatHistory, 3, { fileName: llmFileName })
      .catch((err) => {
        console.log("failed to get search results", err);
      });

    return similarDocs;
  }

  private generateRedisLlmKey(llmKey: LlmKey): string {
    return `${llmKey.llmName}-${llmKey.modelName}-${llmKey.userId}`;
  }

  public async writeToHistory(text: string, llmKey: LlmKey) {
    if (!llmKey || typeof llmKey.userId === "undefined") {
      console.log("llm key set incorrectly");
      return "";
    }

    const key = this.generateRedisLlmKey(llmKey);
    const result = await this.history.zadd(key, {
      score: Date.now(),
      member: text,
    });
    return result;
  }

  public async redisLatestHistory(llmKey: LlmKey): Promise<string> {
    if (!llmKey || typeof llmKey.userId === "undefined") {
      console.log("llm key is not set correctly");
      return "";
    }

    const key = this.generateRedisLlmKey(llmKey);
    let result = await this.history.zrange(key, 0, Date.now(), {
      byScore: true,
    });
    result = result.slice(-30).reverse();
    const recentChats = result.reverse().join("\n");
    return recentChats;
  }

  public async seedChatHistory(
    seedContent: string,
    delimiter: string = "\n",
    llmKey: LlmKey
  ) {
    const key = this.generateRedisLlmKey(llmKey);
    if (await this.history.exists(key)) {
      console.log("User already has chat history");
      return;
    }

    const content = seedContent.split(delimiter);
    let counter = 0;

    for (const line of content) {
      await this.history.zadd(key, { score: counter, member: line });
      counter += 1;
    }
  }
}
