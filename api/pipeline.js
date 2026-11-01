import { proxyPipeline } from './pipelineProxy.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  await proxyPipeline(req, res);
}
