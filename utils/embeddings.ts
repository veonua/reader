import { extract, ExtractResult } from "./extract"
import { createEmbeddings } from "./openai"
import { saveEmbeddings, Record } from "./pinecone"
import kv from "@vercel/kv";

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export async function getEmbeddings(uri: URL, data:ExtractResult, no_cache: boolean = false) {
  const embedding_key = "e:" + uri;
  var embeddings = await kv.get<number[][]>(embedding_key);
  if (embeddings != null && !no_cache) {
    return embeddings;
  }

  console.log("getEmbeddings for uri " + uri);

  var splits: string[];
  var ids: string[];

  if (data.kind == "article") {
    const text : string = data.textContent ?? "";

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1024,
      chunkOverlap: 0,
    });
    
    var splits = await splitter.splitText(text);
    // generate index based ids with # as prefix
    var ids = splits.map((_, i) => i.toString());
    
  } else if (data.kind == "youtube") {
    console.log("---", data.content.length, "chunks");

    splits = data.content.map((c) => c.text);
    ids = data.content.map((c) => c.start.toString());
  } else {
    throw new Error("Invalid kind provided");
  }
  embeddings = await createEmbeddings(splits);
  // zip splits and embeddings into a Record
  var records : Array<Record> = splits.map((s, i) => {
    return {
      id: ids[i],
      text: s,
      embedding: embeddings[i]
    }
  });

  await saveEmbeddings(uri.toString(), records);

  kv.set(embedding_key, JSON.stringify(embeddings));  
}