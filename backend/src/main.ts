import 'dotenv/config';

export async function bootstrap() {
  const { bootstrap } = await import('./bootstrap.js');
  await bootstrap();
}

void bootstrap().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
// Hot reload trigger
