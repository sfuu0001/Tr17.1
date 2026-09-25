export async function load(url, context, nextLoad) {
  if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.svg') || url.endsWith('.wav')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export default "mock-asset";',
    };
  }
  return nextLoad(url, context);
}
