import { extract } from '../utils/extract';
import { normalizeUrl } from '../utils/url';

interface ExtractParams {
  url: string;
  max_length: number;
  max_duration: number;
  no_cache: boolean;
}

export default async function handler(
  req: any,
  res: any
): Promise<void> {
  const { url, max_length, max_duration, no_cache }: ExtractParams = req.body;

  let goodUrl = normalizeUrl(url);

  const data = await extract(goodUrl, max_length, max_duration, no_cache);
  res.json(data);
}
