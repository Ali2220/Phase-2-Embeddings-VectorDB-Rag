import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
import { ChromaClient } from "chromadb";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const chroma = new ChromaClient();

async function getEmbedding(text) {
  const result = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });

  return result.embeddings[0].values;
}

async function vectorDBDemo() {
  // 1. Collection create karo (jaise database mein table)
  const collection = await chroma.createCollection({
    name: "pakistan_facts",
    metadata: { description: "Pakistan ke bare mein facts" },
    embeddingFunction: null
  });

  // 2. Kuch data add karo
  const documents = [
    "Lahore Pakistan ka cultural capital hai. Food street famous hai.",
    "Karachi mein Clifton beach bohot famous hai.",
    "Islamabad ek peaceful city hai. Faisal Mosque yahan hai.",
  ];

  for (let i = 0; i < documents.length; i++) {
    const embedding = await getEmbedding(documents[i]);

    await collection.add({
      ids: [`docs${i}`],
      embeddings: [embedding],
      metadatas: [{ source: "manual", index: i }],
      documents: [documents[i]],
    });
  }

  console.log("✅ 3 documents added to ChromaDB");

  // 3. Search Kro
  const query = "Pakistan mein beach kahan hai?";
  const queryEmbedding = await getEmbedding(query);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 2, // top 2 results
  });

  console.log("\n🔍 Search results for:", query);
  console.log(results.documents[0]);
}

vectorDBDemo();
