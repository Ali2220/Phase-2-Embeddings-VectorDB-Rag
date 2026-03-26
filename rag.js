import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";
import { ChromaClient } from "chromadb";
import {PDFParse} from "pdf-parse";
import fs from "fs";

let ai = null;
let chroma = null;
let collection = null;

// 1. Initialize system - sab se pehle yeh call kro
async function initializeSystem() {
  console.log("System start ho rha hai...");

  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  chroma = new ChromaClient();

  try {
    collection = await chroma.getCollection({ name: "my_knowledge" });
    console.log("✅ Purani database mil gayi!");
  } catch {
    collection = await chroma.createCollection({ name: "my_knowledge" });
    console.log("✅ Nayi database ban gayi!");
  }
}

// 2. Text ko numbers mai convert kro (embedding)
async function textToNumbers(text) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });

  // YEH LINE THEEK KARI HAI
  return response.embeddings[0].values;
}

// 3. Simple chunking - bas character count se divide karo
function simpleChunking(text, chunkSize = 500) {
  let chunks = [];

  if (text.length <= chunkSize) {
    return [text];
  }

  for (let i = 0; i < text.length; i += chunkSize) {
    let chunk = text.slice(i, i + chunkSize);
    chunks.push(chunk);
  }

  return chunks;
}

// 4. Document add karo
async function addDocuments(content, sourceName = "unknown") {
  console.log("Document process ho raha hai...");

  let chunks = simpleChunking(content);
  console.log(`📄 ${chunks.length} pieces mein divide kiya`);

  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];
    let numbers = await textToNumbers(chunk);

    await collection.add({
      ids: [`chunk_${Date.now()}_${i}`],
      embeddings: [numbers],
      metadatas: [{ source: sourceName, index: i }],
      documents: [chunk],
    });

    if ((i + 1) % 10 === 0) {
      console.log(`${i + 1}/${chunks.length} pieces saved...`);
    }
  }

  console.log(`✅ ${chunks.length} pieces successfully saved!`);
  return chunks.length;
}

// 5. PDF file add karo
async function addPDFFile(filePath) {
  console.log(`PDF padh raha hoon: ${filePath}`);

  let dataBuffer = fs.readFileSync(filePath);
  let pdfData = await PDFParse(dataBuffer);
  let text = pdfData.text;

  return await addDocuments(text, filePath);
}

// 6. Text file add karo
async function addTextFile(filePath) {
  console.log(`Text file padh raha hoon: ${filePath}`);

  let text = fs.readFileSync(filePath, "utf-8");

  // YEH LINE THEEK KARI HAI
  return await addDocuments(text, filePath);
}

// 7. Sawal se related documents dhundo
async function searchSimilar(query, kitneResults = 3) {
  console.log(`Search kar raha hoon: "${query}"`);

  const queryNumbers = await textToNumbers(query);

  let results = await collection.query({
    queryEmbeddings: [queryNumbers],
    nResults: kitneResults,
  });

  return results.documents[0] || [];
}

// 8. Sawal pucho aur jawab pao
async function askQuestion(question) {
  console.log(`\n🤔 Sawal: ${question}`);

  let relevantDocs = await searchSimilar(question);

  if (relevantDocs.length === 0) {
    return {
      answer: "Mujhe is sawaal se related koi information nahi mili.",
      miliKya: false,
    };
  }

  console.log(`📚 ${relevantDocs.length} related documents mile!`);

  let context = "";
  for (let i = 0; i < relevantDocs.length; i++) {
    context += `[${i + 1}] ${relevantDocs[i]}\n\n`;
  }

  let prompt = `Tum ek helpful assistant ho. Diye gaye context ke based jawab do.
    
Context:
${context}

Sawaal: ${question}

Instructions:
- Roman Urdu mein jawab do
- Agar jawab context mein nahi hai to "Mujhe nahi pata" keh do
- Facts ke saath source reference do jaise [1], [2]
- Simple aur helpful jawab do

Jawab:`;

  let response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.3,
      maxOutputTokens: 500,
    },
  });

  return {
    answer: response.text,
    miliKya: true,
    kitneSourcesMile: relevantDocs.length,
  };
}

// 9. Database ki information dekho
async function getDatabaseInfo() {
  let count = await collection.count();
  console.log("\n=== Database Information ===");
  console.log(`Collection name: my_knowledge`);
  console.log(`Total pieces: ${count}`);
  console.log("============================\n");
  return count;
}

// 10. Database delete karo (sab kuch khatam)
async function deleteEverything() {
  console.log("⚠️  Warning: Sab kuch delete ho raha hai!");
  await chroma.deleteCollection({ name: "my_knowledge" });
  collection = null;
  console.log("✅ Sab kuch delete ho gaya!");
}

async function main() {
  try {
    // Step 1: System start karo
    await initializeSystem();

    // Step 2: Kuch example documents add karo
    console.log("\n📝 Documents add kar raha hoon...");
    await addDocuments(
      "Pakistan ki capital Islamabad hai. Ye ek beautiful city hai.",
      "example1",
    );
    await addDocuments(
      "Karachi Pakistan ka sab se bara shehar hai. Ye port city hai.",
      "example2",
    );
    await addDocuments(
      "Lahore Punjab ka cultural capital hai. Yahan badshahi mosque hai.",
      "example3",
    );

    // Step 3: Database info dekho
    await getDatabaseInfo();

    // Step 4: Sawal pucho
    let result1 = await askQuestion("Pakistan ki capital kya hai?");
    console.log(`📝 Jawab: ${result1.answer}\n`);

    let result2 = await askQuestion("Karachi kya hai?");
    console.log(`📝 Jawab: ${result2.answer}\n`);

    let result3 = await askQuestion("Lahore kahan hai?");
    console.log(`📝 Jawab: ${result3.answer}\n`);

    let result4 = await askQuestion("Islamabad mein kya hai?");
    console.log(`📝 Jawab: ${result4.answer}\n`);
  } catch (error) {
    console.error("❌ Error aya:", error.message);
    console.error(error.stack);
  }
}

// YAHAN DIRECT MAIN FUNCTION CALL HO RAHA HAI
main();
