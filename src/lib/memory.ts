// lib/memory/memory.ts
import { Redis } from "@upstash/redis";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";

export type ChatMemoryKey = {
  chatId: string;
  userId: string;
  modelName: string;
};

export class MemoryService {
  private static instance: MemoryService;
  private redis: Redis;
  private pinecone: Pinecone;
  private embeddings: HuggingFaceTransformersEmbeddings;

  private constructor() {
    this.redis = Redis.fromEnv();
    this.pinecone = new Pinecone();
    this.embeddings = new HuggingFaceTransformersEmbeddings({
      apiKey: process.env.HUGGING_FACE_API_KEY,
    });
  }

  public static async getInstance(): Promise<MemoryService> {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
      await MemoryService.instance.init();
    }
    return MemoryService.instance;
  }

  private async init() {
    await this.pinecone.init({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENV!,
    });
  }

  private generateRedisKey(key: ChatMemoryKey): string {
    return `chat:${key.chatId}:${key.userId}:${key.modelName}`;
  }

  public async writeToHistory(text: string, key: ChatMemoryKey) {
    const redisKey = this.generateRedisKey(key);
    const result = await this.redis.zadd(redisKey, {
      score: Date.now(),
      member: text,
    });
    return result;
  }

  public async getLatestHistory(key: ChatMemoryKey): Promise<string> {
    const redisKey = this.generateRedisKey(key);
    let result = await this.redis.zrange(redisKey, 0, Date.now(), {
      byScore: true,
    });

    // Get last 30 messages
    result = result.slice(-30).reverse();
    return result.join("\n");
  }

  public async vectorSearch(query: string, chatId: string) {
    const pineconeIndex = this.pinecone.Index(
      process.env.PINECONE_INDEX! || ""
    );

    const vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, {
      pineconeIndex,
    });

    const similarDocs = await vectorStore
      .similaritySearch(query, 3, { chatId })
      .catch((err) => {
        console.error("Failed to get search results:", err);
        return [];
      });

    return similarDocs;
  }

  public async seedChatHistory(
    seedContent: string,
    key: ChatMemoryKey,
    delimiter: string = "\n"
  ) {
    const redisKey = this.generateRedisKey(key);

    if (await this.redis.exists(redisKey)) {
      console.log("Chat history already exists");
      return;
    }

    const content = seedContent.split(delimiter);
    let counter = 0;

    for (const line of content) {
      await this.redis.zadd(redisKey, { score: counter, member: line });
      counter += 1;
    }
  }
}
// import { Redis } from "@upstash/redis";
// import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
// import { Pinecone } from "@pinecone-database/pinecone";
// import { PineconeStore } from "@langchain/community/vectorstores/pinecone";

// export type LlmKey = {
//   llmName: string;
//   modelName: string;
//   userId: string;
// };

// export class MemoryManager {
//   private static instance: MemoryManager;
//   private history: Redis;
//   private vectorDBClient: Pinecone;

//   private constructor() {
//     this.history = Redis.fromEnv();
//     this.vectorDBClient = new Pinecone({
//       apiKey: process.env.PINECONE_API_KEY!,
//       //environment: process.env.PINECONE_ENVIRONMENT!,
//     });
//   }

//   public static async getInstance(): Promise<MemoryManager> {
//     if (!MemoryManager.instance) {
//       MemoryManager.instance = new MemoryManager();
//     }
//     return MemoryManager.instance;
//   }

//   public async vectorSearch(recentChatHistory: string, llmFileName: string) {
//     const pineconeIndex = this.vectorDBClient.Index(
//       process.env.PINECONE_INDEX! || ""
//     );

//     const vectorStore = await PineconeStore.fromExistingIndex(
//       new HuggingFaceInferenceEmbeddings({
//         apiKey: process.env.HUGGING_FACE_API_KEY,
//       }),
//       { pineconeIndex }
//     );

//     const similarDocs = await vectorStore
//       .similaritySearch(recentChatHistory, 3, { fileName: llmFileName })
//       .catch((err) => {
//         console.log("failed to get search results", err);
//       });

//     return similarDocs;
//   }

//   private generateRedisLlmKey(llmKey: LlmKey): string {
//     return `${llmKey.llmName}-${llmKey.modelName}-${llmKey.userId}`;
//   }

//   public async writeToHistory(text: string, llmKey: LlmKey) {
//     if (!llmKey || typeof llmKey.userId === "undefined") {
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
//     if (!llmKey || typeof llmKey.userId === "undefined") {
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
//     seedContent: string,
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
