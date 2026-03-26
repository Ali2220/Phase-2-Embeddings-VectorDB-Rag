// chunking-strategy:
// Bade documents ko chhote chunks mein todna zaroori hai. Kyun?
// 1. OpenAI/Gemini embedding model ki limit hoti hai
// 2. Exact context retrieve karne ke liye
// 3. Better search results

function simpleChunker(text, chunkSize = 500, overlap = 50) {
  const chunks = [];

  for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
    const chunk = text.substring(i, i + chunkSize)
    if(chunk.length > 0){
        chunks.push(chunk)
    }
  }

  return chunks
}

const sampleText = `
Pakistan ki culture bohot rich hai. Lahore apni food street ke liye famous hai. Androon Lahore ki history bohat purani hai.

Karachi mein Quaid ka mazaar hai. Yeh ek beautiful building hai. Clifton beach par sunset beautiful hota hai.

Northern areas mein stunning views hain. Hunza Valley must visit hai. Fairy Meadows bhi famous hai.
`;

console.log("Simple Chunker:", simpleChunker(sampleText, 100).length, "chunks");

