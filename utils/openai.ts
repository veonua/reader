import { log } from "console";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
export const openai = new OpenAIApi(configuration);

const EMBEDIING_MODEL = "text-embedding-ada-002";
const COMPLETEION_MODEL = "text-davinci-003";

export async function createEmbeddings(text: string[]): Promise<number[][]> {
  // log $ for every text item
  console.log(text.map((t) => "$").join(""));
  
  const res = await openai.createEmbedding({
    input: text,
    model: EMBEDIING_MODEL,
  });
  return res.data.data.map((d) => d.embedding);
}

export async function answerQuestion(question: string, context: string, topic:string="") {
  // Use the below articles on the 2022 Winter Olympics to answer the subsequent question. If the answer cannot be found in the articles, write "I could not find an answer."

  if (topic) {
    topic = " on " + topic
  } else {
    topic = ""
  }

  let prompt = `Use the below articles${topic} to answer the question "${question}". If the answer cannot be found in the articles, write "I could not find an answer. \n${context}\nAnswer:`
  
  const res = await openai.createCompletion({
    prompt: prompt,
    model: COMPLETEION_MODEL,
    max_tokens: 1000,
    n: 1,}
  );

  return res.data.choices[0].text.trimStart();
}