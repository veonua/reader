import { Configuration, OpenAIApi } from "openai";
import { encoding_for_model } from "@dqbd/tiktoken";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
export const openai = new OpenAIApi(configuration);

const EMBEDIING_MODEL = "text-embedding-ada-002";
const COMPLETION_MODEL = "gpt-3.5-turbo"; // "text-davinci-003";
const MAX_TOKENS = 4096;

const completition_enc = encoding_for_model(COMPLETION_MODEL);

export async function createEmbeddings(text: string[]): Promise<number[][]> {
  // log $ for every text item
  console.log(text.map((t) => "$").join(""));
  
  const res = await openai.createEmbedding({
    input: text,
    model: EMBEDIING_MODEL,
  });
  return res.data.data.map((d) => d.embedding);
}

export async function answerQuestion(question: string, context: string[], topic:string = "", can_truncate:boolean = true) : Promise<string> {
  // Use the below articles on the 2022 Winter Olympics to answer the subsequent question. If the answer cannot be found in the articles, write "I could not find an answer."

  if (topic) {
    topic = " on " + topic
  } else {
    topic = ""
  }

  let prompt = "";
 
  let system = `Use the below articles${topic} to answer the question. Use user's language. If the answer cannot be found in the articles, write "I could not find an answer"`
  do {
    let context_str = context.join("\n");
    prompt = `${system}+\n${context_str}`
 
    let array = completition_enc.encode(prompt);
    let len = array.length;

    if (!can_truncate || len <= MAX_TOKENS) {  break; }

    context.pop(); 
  }
  while (true);
  
  const res = await openai.createChatCompletion({
    model: COMPLETION_MODEL,
    messages: [{
      role: "system",
      content: system,
    }, {
      role: "user",
      content: question,
    }, {
      role: "user",
      content: context.join("\n"),
    }],
  });

  return res.data.choices[0].message.content.trimStart();
 }