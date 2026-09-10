export async function loadClientConfig() {
  const clientId = process.env.CLIENT_ID || "demo";
  try {
    const mod = await import(`./clients/${clientId}.js`);
    return mod.default;
  } catch (err) {
    throw new Error(
      `No client config found for CLIENT_ID="${clientId}". ` +
      `Add src/config/clients/${clientId}.js (copy demo.js as a starting point).`
    );
  }
}
