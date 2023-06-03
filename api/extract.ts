import { extract } from '../utils/extract';

interface ExtractParams {
  uri: string;
  max_length: number;
  max_duration: number;
  no_cache: boolean;
}

export default async function handler(
  req: any,
  res: any
): Promise<void> {
  const { uri, max_length, max_duration, no_cache }: ExtractParams = req.body;

  const data = await extract(uri, max_length, max_duration, no_cache);
  res.json(data);
}
