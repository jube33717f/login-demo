declare module 'convict-format-with-validator' {
  import type { Format } from 'convict';

  const formats: Record<string, Format>;
  export default formats;
}
